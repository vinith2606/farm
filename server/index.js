import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server as IOServer } from 'socket.io'
import sqlite3 from 'sqlite3'
import crypto from 'crypto'
import fs from 'fs/promises'
import { AsyncLocalStorage } from 'async_hooks'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = Number(process.env.PORT || 3001)
const DB_PATH = process.env.FARMDIRECT_DB_PATH || path.join(__dirname, 'farmdirect.sqlite')
const CERTIFICATE_IMAGE_DIR = path.join(__dirname, 'certificates')
const DEFAULT_ADMIN = {
  role: 'admin',
  name: 'Platform Admin',
  email: process.env.ADMIN_EMAIL || 'admin@farmdirect.local',
  phone: '0000000000',
  password: process.env.ADMIN_PASSWORD || 'admin123',
}
const AUTH_TOKEN_SECRET = process.env.FARMDIRECT_AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'farmdirect-local-development-secret')

if (!AUTH_TOKEN_SECRET) {
  throw new Error('FARMDIRECT_AUTH_SECRET must be configured in production.')
}
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD must be configured in production.')
}

const app = express()
const db = new sqlite3.Database(DB_PATH)  
const allowedRoles = ['farmer', 'consumer', 'delivery', 'admin']
const addressLabels = new Set(['Home', 'Work', 'Other'])
const transactionContext = new AsyncLocalStorage()
let transactionQueue = Promise.resolve()

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

const verifyPassword = (password, storedHash) => {
  const [algorithm, salt, expectedHash] = String(storedHash || '').split('$')
  if (algorithm === 'scrypt' && salt && expectedHash) {
    const actualHash = crypto.scryptSync(String(password), salt, 64)
    const expected = Buffer.from(expectedHash, 'hex')
    return expected.length === actualHash.length && crypto.timingSafeEqual(actualHash, expected)
  }

  const legacyHash = crypto.createHash('sha256').update(String(password)).digest()
  const expectedLegacyHash = Buffer.from(String(storedHash || ''), 'hex')
  return expectedLegacyHash.length === legacyHash.length && crypto.timingSafeEqual(legacyHash, expectedLegacyHash)
}

const imageData = (dataUrl) => {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  return match ? { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') } : null
}

const imageExtension = (mimeType) => {
  const subtype = String(mimeType || 'image/jpeg').split('/')[1]?.toLowerCase() || 'jpeg'
  return { jpeg: 'jpg', 'svg+xml': 'svg' }[subtype] || subtype.replace(/[^a-z0-9]/g, '') || 'jpg'
}

const certificateFileName = (certificate) => {
  const certificateNumber = String(certificate.certificate_number || certificate.id).replace(/[^a-zA-Z0-9_-]/g, '_')
  return `certificate-${certificate.id}-${certificateNumber}.${imageExtension(certificate.document_mime_type)}`
}

const exportCertificateImages = async () => {
  await fs.mkdir(CERTIFICATE_IMAGE_DIR, { recursive: true })
  const certificates = await all('SELECT id, certificate_number, document_blob, document_mime_type FROM certificates WHERE document_blob IS NOT NULL')
  for (const certificate of certificates) {
    await fs.writeFile(path.join(CERTIFICATE_IMAGE_DIR, certificateFileName(certificate)), certificate.document_blob)
  }
}

const numberFromRecord = (record, keys) => {
  const key = keys.find((candidate) => record[candidate] !== undefined && record[candidate] !== null && record[candidate] !== '')
  const value = key ? Number(String(record[key]).replace(/,/g, '')) : NaN
  return Number.isFinite(value) ? value : null
}

const clusterPrediction = (records, crop) => {
  const points = records
    .map((record) => ({
      month: record.month,
      price: numberFromRecord(record, ['modal_price', 'Modal Price', 'modal price', 'price', 'Price']),
    }))
    .filter((point) => point.price !== null)
    .slice(-120)
  if (points.length < 12) throw new Error('Government market data returned fewer than 12 usable observations.')

  const values = points.map((point) => point.price)
  let centroids = [Math.min(...values), values.reduce((sum, value) => sum + value, 0) / values.length, Math.max(...values)]
  let assignments = []
  for (let iteration = 0; iteration < 20; iteration += 1) {
    assignments = values.map((value) => centroids.reduce((best, centroid, index) => Math.abs(value - centroid) < Math.abs(value - centroids[best]) ? index : best, 0))
    const next = centroids.map((_, cluster) => {
      const clusterValues = values.filter((_, index) => assignments[index] === cluster)
      return clusterValues.length ? clusterValues.reduce((sum, value) => sum + value, 0) / clusterValues.length : centroids[cluster]
    })
    if (next.every((value, index) => Math.abs(value - centroids[index]) < 0.01)) break
    centroids = next
  }
  const currentCluster = assignments[assignments.length - 1]
  const currentClusterValues = values.filter((_, index) => assignments[index] === currentCluster)
  const recent = currentClusterValues.slice(-12)
  const slope = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0
  const currentPrice = values[values.length - 1]
  const predictedPrice = Math.max(0, centroids[currentCluster] + slope)
  const spread = Math.max(...currentClusterValues) - Math.min(...currentClusterValues)
  const confidence = Math.round(Math.max(50, Math.min(95, 100 - (spread / Math.max(currentPrice, 1)) * 100)))
  return { crop, currentPrice: Math.round(currentPrice), predictedPrice: Math.round(predictedPrice), confidence, change: Number((((predictedPrice - currentPrice) / Math.max(currentPrice, 1)) * 100).toFixed(1)), history: points.map((point) => ({ month: point.month, price: Math.round(point.price) })) }
}

const localPricePrediction = async (crop) => {
  const commonMarketPrices = { tomato: 25, onion: 30, potato: 28, rice: 42, wheat: 34, mango: 75 }
  const product = await get('SELECT AVG(price) AS average_price FROM products WHERE LOWER(name) LIKE ?', [`%${crop.toLowerCase()}%`])
  const baseline = commonMarketPrices[crop.toLowerCase()] || Math.min(Math.max(Number(product?.average_price) || 50, 10), 250)
  const seasonalFactors = [0.92, 0.95, 1.02, 1.08, 1.14, 1.1, 0.98, 0.94, 1.01, 1.12, 1.08, 1.16]
  const records = []
  for (let year = 0; year < 10; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      records.push({ month: `${2017 + year}-${String(month + 1).padStart(2, '0')}`, modal_price: baseline * (1 + year * 0.012) * seasonalFactors[month] })
    }
  }
  return { ...clusterPrediction(records, crop), source: 'Local market analysis based on crop baselines and stored product prices' }
}

const distanceKm = (lat1, lng1, lat2, lng2) => {
  const earthRadius = 6371
  const toRadians = (value) => (value * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const waitForTransaction = () => transactionContext.getStore() ? Promise.resolve() : transactionQueue

const run = async (sql, params = []) => {
  await waitForTransaction()
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err)
      resolve({ id: this.lastID, changes: this.changes })
    })
  })
}

const get = async (sql, params = []) => {
  await waitForTransaction()
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })
}

const all = async (sql, params = []) => {
  await waitForTransaction()
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

const withTransaction = async (operation) => {
  let release
  const previousTransaction = transactionQueue
  transactionQueue = new Promise((resolve) => { release = resolve })
  await previousTransaction

  try {
    return await transactionContext.run(true, async () => {
      await run('BEGIN IMMEDIATE')
      try {
        const result = await operation()
        await run('COMMIT')
        return result
      } catch (error) {
        await run('ROLLBACK')
        throw error
      }
    })
  } finally {
    release()
  }
}

const initializeDatabase = async () => {
  await new Promise((resolve, reject) => {
    db.exec(
      `
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            lat REAL,
            lng REAL,
            address TEXT,
            city TEXT,
            farm_name TEXT,
            description TEXT,
            avatar TEXT,
            certificate_status TEXT DEFAULT 'pending',
            rating REAL DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            driving_license_number TEXT,
            vehicle_type TEXT,
            vehicle_number TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(role, email)
          );

          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER NOT NULL,
            farmer_name TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            recommended_price REAL,
            image TEXT,
            category TEXT,
            harvest_date TEXT,
            quantity INTEGER NOT NULL,
            unit TEXT DEFAULT 'kg',
            available INTEGER DEFAULT 1,
            verified INTEGER DEFAULT 0,
            rating REAL DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farmer_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            consumer_id INTEGER NOT NULL,
            consumer_name TEXT NOT NULL,
            farmer_id INTEGER NOT NULL,
            farmer_name TEXT NOT NULL,
            delivery_agent_id INTEGER,
            delivery_agent_name TEXT,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_status TEXT DEFAULT 'pending',
            payment_method TEXT,
            address TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (consumer_id) REFERENCES users(id),
            FOREIGN KEY (farmer_id) REFERENCES users(id),
            FOREIGN KEY (delivery_agent_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            image TEXT,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
          );

          CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            sender_name TEXT NOT NULL,
            receiver_id INTEGER NOT NULL,
            receiver_name TEXT NOT NULL,
            content TEXT NOT NULL,
            read INTEGER DEFAULT 0,
            type TEXT DEFAULT 'text',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER NOT NULL,
            farmer_name TEXT NOT NULL,
            certificate_number TEXT,
            type TEXT NOT NULL,
            document_url TEXT NOT NULL,
            expiry_date TEXT,
            status TEXT DEFAULT 'pending',
            rejection_reason TEXT,
            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TEXT,
            FOREIGN KEY (farmer_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL DEFAULT 0,
            target_type TEXT NOT NULL DEFAULT 'product',
            target_id INTEGER NOT NULL DEFAULT 0,
            order_id INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment TEXT NOT NULL,
            review_image TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(target_type, target_id, order_id, user_id),
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS delivery_addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            label TEXT DEFAULT 'Home',
            address_line TEXT NOT NULL,
            landmark TEXT,
            city TEXT NOT NULL,
            state TEXT,
            pincode TEXT,
            lat REAL,
            lng REAL,
            is_default INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            subject TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          );
        `,
      (err) => {
        if (err) return reject(err)
        resolve()
      }
    )
  })

  const columns = await all('PRAGMA table_info(users)')
  const existing = columns.map((column) => column.name)
  console.log('users table columns:', existing)

  if (!existing.includes('lat')) {
    await run('ALTER TABLE users ADD COLUMN lat REAL')
  }
  if (!existing.includes('lng')) {
    await run('ALTER TABLE users ADD COLUMN lng REAL')
  }
  if (!existing.includes('address')) {
    await run('ALTER TABLE users ADD COLUMN address TEXT')
  }
  if (!existing.includes('city')) {
    await run('ALTER TABLE users ADD COLUMN city TEXT')
  }
  if (!existing.includes('farm_name')) {
    await run('ALTER TABLE users ADD COLUMN farm_name TEXT')
  }
  if (!existing.includes('description')) {
    await run('ALTER TABLE users ADD COLUMN description TEXT')
  }
  if (!existing.includes('avatar')) {
    await run('ALTER TABLE users ADD COLUMN avatar TEXT')
  }
  if (!existing.includes('certificate_status')) {
    await run("ALTER TABLE users ADD COLUMN certificate_status TEXT DEFAULT 'pending'")
  }
  if (!existing.includes('rating')) {
    await run('ALTER TABLE users ADD COLUMN rating REAL DEFAULT 0')
  }
  if (!existing.includes('review_count')) {
    await run('ALTER TABLE users ADD COLUMN review_count INTEGER DEFAULT 0')
  }
  if (!existing.includes('driving_license_number')) {
    await run('ALTER TABLE users ADD COLUMN driving_license_number TEXT')
  }
  if (!existing.includes('vehicle_type')) {
    await run('ALTER TABLE users ADD COLUMN vehicle_type TEXT')
  }
  if (!existing.includes('vehicle_number')) {
    await run('ALTER TABLE users ADD COLUMN vehicle_number TEXT')
  }
  if (!existing.includes('account_status')) {
    await run("ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active'")
  }
  if (!existing.includes('aadhaar_number')) {
    await run('ALTER TABLE users ADD COLUMN aadhaar_number TEXT')
  }
  if (!existing.includes('aadhaar_status')) {
    await run("ALTER TABLE users ADD COLUMN aadhaar_status TEXT DEFAULT 'pending'")
  }
  if (!existing.includes('driving_license_status')) {
    await run("ALTER TABLE users ADD COLUMN driving_license_status TEXT DEFAULT 'pending'")
  }
  if (!existing.includes('availability_status')) {
    await run("ALTER TABLE users ADD COLUMN availability_status TEXT DEFAULT 'available'")
  }
  if (!existing.includes('house_number')) {
    await run('ALTER TABLE users ADD COLUMN house_number TEXT')
  }
  if (!existing.includes('floor')) {
    await run('ALTER TABLE users ADD COLUMN floor TEXT')
  }
  if (!existing.includes('building_block')) {
    await run('ALTER TABLE users ADD COLUMN building_block TEXT')
  }
  if (!existing.includes('landmark')) {
    await run('ALTER TABLE users ADD COLUMN landmark TEXT')
  }
  if (!existing.includes('state')) {
    await run('ALTER TABLE users ADD COLUMN state TEXT')
  }
  if (!existing.includes('pincode')) {
    await run('ALTER TABLE users ADD COLUMN pincode TEXT')
  }
  const reviewColumns = await all('PRAGMA table_info(reviews)')
  const existingReviewColumns = reviewColumns.map((column) => column.name)
  if (!existingReviewColumns.includes('target_type')) await run("ALTER TABLE reviews ADD COLUMN target_type TEXT DEFAULT 'product'")
  if (!existingReviewColumns.includes('target_id')) await run('ALTER TABLE reviews ADD COLUMN target_id INTEGER')
  if (!existingReviewColumns.includes('order_id')) await run('ALTER TABLE reviews ADD COLUMN order_id INTEGER')
  if (!existingReviewColumns.includes('review_image')) await run('ALTER TABLE reviews ADD COLUMN review_image TEXT')
  await run("UPDATE reviews SET target_type = 'product', target_id = product_id, order_id = 0 WHERE target_type IS NULL OR target_id IS NULL OR order_id IS NULL")

  const reviewIndexes = await all("PRAGMA index_list('reviews')")
  const legacyUniqueIndex = reviewIndexes.find((indexInfo) => indexInfo.unique && indexInfo.origin === 'u')
  if (legacyUniqueIndex) {
    const legacyColumns = await all(`PRAGMA index_info('${legacyUniqueIndex.name}')`)
    const legacyColumnNames = legacyColumns.map((column) => column.name)
    const isLegacyProductUserConstraint = legacyColumnNames.includes('product_id') && legacyColumnNames.includes('user_id') && !legacyColumnNames.includes('target_type')
    if (isLegacyProductUserConstraint) {
      const existingRows = await all('SELECT * FROM reviews')
      await run('ALTER TABLE reviews RENAME TO reviews_legacy')
      await run(`CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL DEFAULT 0,
        target_type TEXT NOT NULL DEFAULT 'product',
        target_id INTEGER NOT NULL DEFAULT 0,
        order_id INTEGER NOT NULL DEFAULT 0,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(target_type, target_id, order_id, user_id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`)
      for (const review of existingRows) {
        await run(
          'INSERT INTO reviews (id, product_id, target_type, target_id, order_id, user_id, user_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [review.id, review.product_id ?? 0, review.target_type || 'product', review.target_id ?? review.product_id ?? 0, review.order_id ?? 0, review.user_id, review.user_name, review.rating, review.comment, review.created_at]
        )
      }
      await run('DROP TABLE reviews_legacy')
    }
  }

  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_target_order_user ON reviews (target_type, target_id, order_id, user_id)')

  const farmerRatingRows = await all("SELECT target_id AS user_id, COUNT(*) AS review_count, AVG(rating) AS average_rating FROM reviews WHERE target_type = 'farmer' GROUP BY target_id")
  for (const row of farmerRatingRows) {
    await run('UPDATE users SET rating = ?, review_count = ? WHERE id = ? AND role = ?', [Number(row.average_rating || 0), Number(row.review_count || 0), row.user_id, 'farmer'])
  }

  const deliveryRatingRows = await all("SELECT target_id AS user_id, COUNT(*) AS review_count, AVG(rating) AS average_rating FROM reviews WHERE target_type = 'delivery' GROUP BY target_id")
  for (const row of deliveryRatingRows) {
    await run('UPDATE users SET rating = ?, review_count = ? WHERE id = ? AND role = ?', [Number(row.average_rating || 0), Number(row.review_count || 0), row.user_id, 'delivery'])
  }

  const certificateColumns = await all('PRAGMA table_info(certificates)')
  if (!certificateColumns.some((column) => column.name === 'certificate_number')) await run('ALTER TABLE certificates ADD COLUMN certificate_number TEXT')
  if (!certificateColumns.some((column) => column.name === 'document_blob')) await run('ALTER TABLE certificates ADD COLUMN document_blob BLOB')
  if (!certificateColumns.some((column) => column.name === 'document_mime_type')) await run('ALTER TABLE certificates ADD COLUMN document_mime_type TEXT')
  if (!certificateColumns.some((column) => column.name === 'ocr_text')) await run('ALTER TABLE certificates ADD COLUMN ocr_text TEXT')
  if (!certificateColumns.some((column) => column.name === 'extracted_name')) await run('ALTER TABLE certificates ADD COLUMN extracted_name TEXT')
  if (!certificateColumns.some((column) => column.name === 'extracted_certificate_number')) await run('ALTER TABLE certificates ADD COLUMN extracted_certificate_number TEXT')
  if (!certificateColumns.some((column) => column.name === 'ocr_status')) await run("ALTER TABLE certificates ADD COLUMN ocr_status TEXT DEFAULT 'pending'")
  const imageCertificates = await all("SELECT id, document_url FROM certificates WHERE document_url LIKE 'data:image/%' AND document_blob IS NULL")
  for (const certificate of imageCertificates) {
    const image = imageData(certificate.document_url)
    if (image) await run('UPDATE certificates SET document_blob = ?, document_mime_type = ? WHERE id = ?', [image.buffer, image.mimeType, certificate.id])
  }
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_certificate_number ON certificates(certificate_number) WHERE certificate_number IS NOT NULL')
  const orderColumns = await all('PRAGMA table_info(orders)')
  const existingOrderColumns = orderColumns.map((column) => column.name)
  if (!existingOrderColumns.includes('delivery_lat')) {
    await run('ALTER TABLE orders ADD COLUMN delivery_lat REAL')
  }
  if (!existingOrderColumns.includes('delivery_lng')) {
    await run('ALTER TABLE orders ADD COLUMN delivery_lng REAL')
  }
  if (!existingOrderColumns.includes('pickup_parcel_photo')) {
    await run('ALTER TABLE orders ADD COLUMN pickup_parcel_photo TEXT')
  }
  if (!existingOrderColumns.includes('delivery_parcel_photo')) {
    await run('ALTER TABLE orders ADD COLUMN delivery_parcel_photo TEXT')
  }
  if (!existingOrderColumns.includes('expected_delivery_at')) {
    await run('ALTER TABLE orders ADD COLUMN expected_delivery_at TEXT')
  }

  const messageColumns = await all('PRAGMA table_info(messages)')
  const messageColumnNames = messageColumns.map((column) => column.name)
  if (!messageColumnNames.includes('receiver_name')) {
    await run('ALTER TABLE messages ADD COLUMN receiver_name TEXT')
  }

  await run(`UPDATE delivery_addresses SET is_default = 0
    WHERE is_default = 1 AND id NOT IN (
      SELECT MIN(id) FROM delivery_addresses WHERE is_default = 1 GROUP BY user_id
    )`)
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_addresses_one_default ON delivery_addresses(user_id) WHERE is_default = 1')

  const adminExists = await get('SELECT id, password FROM users WHERE role = ?', ['admin'])
  if (!adminExists) {
    await run(
      `INSERT INTO users (role, name, email, phone, password) VALUES (?, ?, ?, ?, ?)`,
      [DEFAULT_ADMIN.role, DEFAULT_ADMIN.name, DEFAULT_ADMIN.email, DEFAULT_ADMIN.phone, hashPassword(DEFAULT_ADMIN.password)]
    )
  } else {
    const seededPasswordHash = crypto.createHash('sha256').update('admin123').digest('hex')
    if (adminExists.password === seededPasswordHash) {
      await run('UPDATE users SET password = ? WHERE id = ?', [hashPassword(DEFAULT_ADMIN.password), adminExists.id])
    }
  }
}

const createToken = (user) => {
  const payload = Buffer.from(JSON.stringify({ id: user.id, exp: Date.now() + 60 * 60 * 1000 })).toString('base64url')
  const signature = crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

const authenticateRequest = async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return res.status(401).json({ message: 'Authentication is required.' })

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return res.status(401).json({ message: 'Invalid or expired session.' })

  const expectedSignature = crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(payload).digest()
  const receivedSignature = Buffer.from(signature, 'base64url')
  if (receivedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(receivedSignature, expectedSignature)) {
    return res.status(401).json({ message: 'Invalid or expired session.' })
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!Number.isInteger(Number(claims.id)) || Number(claims.exp) <= Date.now()) {
      return res.status(401).json({ message: 'Invalid or expired session.' })
    }

    const user = await get('SELECT id, role, name, account_status FROM users WHERE id = ?', [claims.id])
    if (!user || user.account_status === 'suspended') {
      return res.status(401).json({ message: 'This account is unavailable.' })
    }

    req.auth = { id: Number(user.id), role: user.role, name: user.name }
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ message: 'Invalid or expired session.' })
  }
}

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return res.status(403).json({ message: 'You are not authorized to perform this action.' })
  }
  next()
}

const requireUserAccess = (parameter = 'id') => (req, res, next) => {
  if (req.auth.role !== 'admin' && Number(req.params[parameter]) !== req.auth.id) {
    return res.status(403).json({ message: 'You can access only your own account.' })
  }
  next()
}

const requireMarketplaceProfileAccess = async (req, res, next) => {
  const requestedId = Number(req.params.id)
  if (req.auth.role === 'admin' || requestedId === req.auth.id) return next()
  if (req.auth.role !== 'consumer') {
    return res.status(403).json({ message: 'You can access only your own account.' })
  }

  try {
    const user = await get('SELECT role FROM users WHERE id = ?', [requestedId])
    if (!user || !['farmer', 'delivery'].includes(user.role)) {
      return res.status(403).json({ message: 'This profile is not available.' })
    }
    next()
  } catch (error) {
    console.error('Marketplace profile access error:', error)
    res.status(500).json({ message: 'Unable to check profile access right now.' })
  }
}

const requireProductAccess = async (req, res, next) => {
  if (req.auth.role === 'admin') return next()
  try {
    const product = await get('SELECT farmer_id FROM products WHERE id = ?', [req.params.id])
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    if (req.auth.role !== 'farmer' || Number(product.farmer_id) !== req.auth.id) {
      return res.status(403).json({ message: 'You can manage only your own products.' })
    }
    next()
  } catch (error) {
    console.error('Product access error:', error)
    res.status(500).json({ message: 'Unable to check product access right now.' })
  }
}

const getSafeUser = (user) => ({
  id: user.id,
  role: user.role,
  name: user.name,
  email: user.email,
  phone: user.phone,
  lat: user.lat ?? user.latitude ?? null,
  lng: user.lng ?? user.longitude ?? null,
  address: user.address ?? '',
  city: user.city ?? '',
  farmName: user.farm_name ?? user.farmName ?? '',
  description: user.description ?? '',
  avatar: user.avatar ?? '',
  accountStatus: user.account_status ?? user.accountStatus ?? 'active',
  aadhaarNumber: user.aadhaar_number ?? user.aadhaarNumber,
  aadhaarStatus: user.aadhaar_status ?? user.aadhaarStatus ?? 'pending',
  drivingLicenseStatus: user.driving_license_status ?? user.drivingLicenseStatus ?? 'pending',
  availabilityStatus: user.availability_status ?? user.availabilityStatus ?? 'available',
  houseNumber: user.house_number ?? user.houseNumber,
  floor: user.floor,
  buildingBlock: user.building_block ?? user.buildingBlock,
  landmark: user.landmark,
  state: user.state,
  pincode: user.pincode,
  certificateStatus: user.certificate_review_status || (user.role === 'farmer' && user.certificate_status === 'pending' ? 'not_uploaded' : user.certificate_status ?? user.certificateStatus ?? 'pending'),
  rating: Number(user.rating ?? 0),
  reviewCount: Number(user.review_count ?? 0),
  drivingLicenseNumber: user.driving_license_number ?? user.drivingLicenseNumber,
  vehicleType: user.vehicle_type ?? user.vehicleType,
  vehicleNumber: user.vehicle_number ?? user.vehicleNumber,
  certificateId: user.certificate_id ?? user.certificateId,
  certificateType: user.certificate_type ?? user.certificateType,
  certificateNumber: user.certificate_number ?? user.certificateNumber,
  certificateDocumentUrl: user.certificate_document_url ?? user.certificateDocumentUrl,
  certificateDownloadUrl: user.certificate_id ? `/api/certificates/${user.certificate_id}/download` : undefined,
  certificateExpiryDate: user.certificate_expiry_date ?? user.certificateExpiryDate,
  certificateReviewStatus: user.certificate_review_status ?? user.certificateReviewStatus,
  certificateRejectionReason: user.certificate_rejection_reason ?? user.certificateRejectionReason,
  certificateUploadedAt: user.certificate_uploaded_at ?? user.certificateUploadedAt,
  createdAt: user.created_at ?? user.createdAt,
})

app.use(cors())
app.use(express.json({ limit: '8mb' }))

// Return JSON for invalid JSON request bodies instead of HTML error pages
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.error('JSON parse error:', err.message)
    return res.status(400).json({ message: 'Invalid JSON body sent to the server.' })
  }
  next(err)
})

app.use('/api', (req, res, next) => {
  const publicRoute = req.method === 'GET' && (
    req.path === '/health' ||
    req.path === '/market/prices' ||
    req.path === '/reviews' ||
    /^\/products(?:\/farmer\/\d+|\/\d+)?$/.test(req.path)
  ) || (
    req.method === 'POST' && ['/auth/register', '/auth/login', '/complaints'].includes(req.path)
  )
  const authenticationRoute = req.method === 'POST' && ['/auth/register', '/auth/login'].includes(req.path)

  if (authenticationRoute) return next()
  if (publicRoute) {
    return req.headers.authorization ? authenticateRequest(req, res, next) : next()
  }
  return authenticateRequest(req, res, next)
})

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.post('/api/complaints', async (req, res) => {
  try {
    const { role, name, phone, subject, description } = req.body || {}
    if (!allowedRoles.includes(role) || typeof name !== 'string' || !name.trim() || typeof phone !== 'string' || !phone.trim() || typeof subject !== 'string' || !subject.trim() || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'Name, phone, subject, and description are required.' })
    }
    if (name.length > 120 || phone.length > 40 || subject.length > 160 || description.length > 5000) {
      return res.status(400).json({ message: 'Support request fields exceed their allowed lengths.' })
    }
    const authenticatedUserId = req.auth?.id ?? null
    const authenticatedRole = req.auth?.role ?? role
    const result = await run('INSERT INTO complaints (user_id, role, name, phone, subject, description) VALUES (?, ?, ?, ?, ?, ?)', [authenticatedUserId, authenticatedRole, name.trim(), phone.trim(), subject.trim(), description.trim()])
    const complaint = await get('SELECT * FROM complaints WHERE id = ?', [result.id])
    res.status(201).json({ message: 'Support request submitted successfully.', complaint })
  } catch (error) {
    console.error('Complaint submission error:', error)
    res.status(500).json({ message: 'Unable to submit support request right now.' })
  }
})

app.get('/api/admin/complaints', requireRoles('admin'), async (req, res) => {
  try {
    const complaints = await all('SELECT * FROM complaints ORDER BY created_at DESC, id DESC')
    res.json({ complaints })
  } catch (error) {
    console.error('Admin complaints error:', error)
    res.status(500).json({ message: 'Unable to fetch complaints right now.' })
  }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, name, email, phone, password, lat, lng, address, city } = req.body || {}

    if (!allowedRoles.includes(role) || role === 'admin') {
      return res.status(400).json({ message: 'Invalid role selected.' })
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' })
    }

    if (role === 'admin') {
      const adminExists = await get('SELECT id FROM users WHERE role = ?', ['admin'])
      if (adminExists) {
        return res.status(409).json({ message: 'The default admin account is already reserved. Use the built-in admin credentials only.' })
      }
    }

    const existingUser = await get('SELECT id FROM users WHERE role = ? AND email = ?', [role, String(email).trim().toLowerCase()])
    if (existingUser) {
      return res.status(409).json({ message: 'A user with that role and email already exists.' })
    }

    const insertResult = await run(
      `INSERT INTO users (role, name, email, phone, password, lat, lng, address, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [role, name.trim(), email.trim().toLowerCase(), phone?.trim() || '', hashPassword(password), lat || null, lng || null, address || null, city || null]
    )

    const createdUser = await get(`SELECT id, role, name, email, phone, lat, lng, address, city, farm_name, description, avatar, certificate_status, rating, review_count,
      (SELECT status FROM certificates WHERE farmer_id = users.id ORDER BY uploaded_at DESC, id DESC LIMIT 1) AS certificate_review_status,
      created_at FROM users WHERE id = ?`, [insertResult.id])

    return res.status(201).json({
      message: 'Account created successfully.',
      token: createToken(createdUser),
      user: getSafeUser(createdUser),
    })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ message: 'Unable to create account right now.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, email, password } = req.body || {}

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected.' })
    }

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await get(
      `SELECT id, role, name, email, phone, password, lat, lng, address, city, farm_name, description, avatar, certificate_status, rating, review_count, account_status,
       (SELECT status FROM certificates WHERE farmer_id = users.id ORDER BY uploaded_at DESC, id DESC LIMIT 1) AS certificate_review_status,
       created_at FROM users WHERE role = ? AND email = ?`,
      [role, String(email).trim().toLowerCase()]
    )

    if (!user) {
      return res.status(401).json({ message: 'No account found for this role and email.' })
    }
    if (user.account_status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended. Contact support for help.' })
    }

    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ message: 'Incorrect password.' })
    }

    if (!String(user.password).startsWith('scrypt$')) {
      await run('UPDATE users SET password = ? WHERE id = ?', [hashPassword(password), user.id])
    }

    return res.json({
      message: 'Login successful.',
      token: createToken(user),
      user: getSafeUser(user),
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Unable to sign in right now.', detail: String(error) })
  }
})

app.get('/api/locations/farmers', requireRoles('consumer'), async (req, res) => {
  try {
    const farmers = await all(
      `SELECT id, name, farm_name, phone, lat, lng, address, city, state, pincode, certificate_status, rating
       FROM users WHERE role = 'farmer' AND account_status != 'suspended'
       ORDER BY name COLLATE NOCASE`
    )
    res.json({ farmers: farmers.map((farmer) => ({ ...farmer, name: farmer.farm_name || farmer.name, certificateStatus: farmer.certificate_status })) })
  } catch (error) {
    console.error('Farmer locations error:', error)
    res.status(500).json({ message: 'Unable to fetch farmer locations right now.' })
  }
})

app.get('/api/locations/delivery', requireRoles('farmer'), async (req, res) => {
  try {
    const agents = await all(
      `SELECT id, name, phone, lat, lng, account_status, availability_status
       FROM users WHERE role = 'delivery' AND account_status != 'suspended'
       ORDER BY name COLLATE NOCASE`
    )
    res.json({ agents })
  } catch (error) {
    console.error('Delivery locations error:', error)
    res.status(500).json({ message: 'Unable to fetch delivery partner locations right now.' })
  }
})

app.get('/api/admin/users', requireRoles('admin'), async (req, res) => {
  try {
    const users = await all(
            `SELECT u.id, u.role, u.name, u.email, u.phone, u.lat, u.lng, u.address, u.city, u.farm_name, u.description, u.avatar, u.certificate_status, u.rating, u.review_count, u.account_status,
              u.aadhaar_number, u.aadhaar_status, u.driving_license_status, u.availability_status,
              u.driving_license_number, u.vehicle_type, u.vehicle_number, u.created_at,
              c.id AS certificate_id, c.type AS certificate_type, c.certificate_number, c.document_url AS certificate_document_url,
              c.expiry_date AS certificate_expiry_date, c.status AS certificate_review_status,
              c.rejection_reason AS certificate_rejection_reason, c.uploaded_at AS certificate_uploaded_at
       FROM users u
       LEFT JOIN certificates c ON c.id = (
         SELECT id FROM certificates WHERE farmer_id = u.id ORDER BY uploaded_at DESC, id DESC LIMIT 1
       )
       WHERE u.role != ? ORDER BY u.created_at DESC`,
      ['admin']
    )

    res.json({ users: users.map(getSafeUser) })
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ message: 'Unable to fetch admin users right now.' })
  }
})

app.get('/api/admin/stats', requireRoles('admin'), async (req, res) => {
  try {
    const rows = await all('SELECT role, COUNT(*) AS count FROM users GROUP BY role')
    const orderRow = await get(`SELECT COUNT(*) AS totalOrders,
      SUM(CASE WHEN status IN ('completed', 'delivered') THEN 1 ELSE 0 END) AS completedOrders,
      SUM(CASE WHEN delivery_agent_id IS NOT NULL THEN 1 ELSE 0 END) AS totalDeliveries,
      IFNULL(SUM(CASE WHEN status IN ('completed', 'delivered') THEN total ELSE 0 END), 0) AS revenue,
      IFNULL(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS totalPayments FROM orders`)
    const productRow = await get('SELECT COUNT(*) AS totalProducts FROM products')
    const verifiedFarmerRow = await get("SELECT COUNT(*) AS verifiedFarmers FROM users WHERE role = 'farmer' AND certificate_status = 'verified'")
    const verificationRow = await get("SELECT COUNT(*) AS pendingVerifications FROM users WHERE role = 'farmer' AND certificate_status IN ('pending', 'rejected')")
    const counts = {
      totalUsers: 0,
      totalFarmers: 0,
      totalConsumers: 0,
      totalDeliveryAgents: 0,
      totalAdmins: 0,
      totalProducts: Number(productRow?.totalProducts ?? 0),
      totalOrders: Number(orderRow?.totalOrders ?? 0),
      totalDeliveries: Number(orderRow?.totalDeliveries ?? 0),
      totalPayments: Number(orderRow?.totalPayments ?? 0),
      completedOrders: Number(orderRow?.completedOrders ?? 0),
      verifiedFarmers: Number(verifiedFarmerRow?.verifiedFarmers ?? 0),
      revenue: Number(orderRow?.revenue ?? 0),
      pendingCertificates: Number(verificationRow?.pendingVerifications ?? 0),
    }

    for (const row of rows) {
      counts.totalUsers += Number(row.count)
      if (row.role === 'farmer') counts.totalFarmers = Number(row.count)
      if (row.role === 'consumer') counts.totalConsumers = Number(row.count)
      if (row.role === 'delivery') counts.totalDeliveryAgents = Number(row.count)
      if (row.role === 'admin') counts.totalAdmins = Number(row.count)
    }

    res.json(counts)
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ message: 'Unable to fetch admin stats right now.' })
  }
})

app.get('/api/market/prices', async (req, res) => {
  try {
    const crop = String(req.query.crop || 'tomato').toLowerCase()
    res.json({ retrievedAt: new Date().toISOString(), ...(await localPricePrediction(crop)) })
  } catch (error) {
    console.error('Market price prediction error:', error)
    res.status(502).json({ message: 'Unable to retrieve government market prices right now.' })
  }
})

// Products API endpoints
app.get('/api/products', async (req, res) => {
  try {
    const includeUnavailable = req.query.includeUnavailable === 'true' && ['consumer', 'admin'].includes(req.auth?.role)
    const products = await all(
      `SELECT p.id, p.farmer_id, p.farmer_name, p.name, p.description, p.price, p.recommended_price, p.image,
              p.category, p.harvest_date, p.quantity, p.unit, p.available,
              CASE WHEN p.verified = 1 OR u.certificate_status = 'verified' THEN 1 ELSE 0 END AS verified,
              p.rating, p.review_count, p.created_at, u.lat AS farmer_lat, u.lng AS farmer_lng,
              u.phone AS farmer_phone, u.farm_name, u.address AS farmer_address, u.city AS farmer_city,
              u.certificate_status
       FROM products p
       LEFT JOIN users u ON u.id = p.farmer_id
       ${includeUnavailable ? '' : 'WHERE p.available = 1'} ORDER BY p.created_at DESC`
    )
    if (!req.auth) products.forEach((product) => {
      delete product.farmer_phone
      delete product.farmer_lat
      delete product.farmer_lng
      delete product.farmer_address
    })
    res.json({ products })
  } catch (error) {
    console.error('Products fetch error:', error)
    res.status(500).json({ message: 'Unable to fetch products right now.' })
  }
})

app.get('/api/products/farmer/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params
    const canViewUnavailable = req.auth?.role === 'admin' || (req.auth?.role === 'farmer' && req.auth.id === Number(farmerId))
    const products = await all(
      `SELECT p.id, p.farmer_id, p.farmer_name, p.name, p.description, p.price, p.recommended_price, p.image,
          p.category, p.harvest_date, p.quantity, p.unit, p.available,
          CASE WHEN p.verified = 1 OR u.certificate_status = 'verified' THEN 1 ELSE 0 END AS verified,
          p.rating, p.review_count, p.created_at, u.lat AS farmer_lat, u.lng AS farmer_lng,
              u.phone AS farmer_phone, u.farm_name, u.address AS farmer_address, u.city AS farmer_city,
              u.certificate_status
       FROM products p LEFT JOIN users u ON u.id = p.farmer_id
      WHERE p.farmer_id = ? AND (p.available = 1 OR ? = 1) ORDER BY p.created_at DESC`,
          [farmerId, canViewUnavailable ? 1 : 0]
    )
        if (!req.auth) products.forEach((product) => {
          delete product.farmer_phone
          delete product.farmer_lat
          delete product.farmer_lng
          delete product.farmer_address
        })
    res.json({ products })
  } catch (error) {
    console.error('Farmer products fetch error:', error)
    res.status(500).json({ message: 'Unable to fetch farmer products right now.' })
  }
})

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    const product = await get(
      `SELECT p.id, p.farmer_id, p.farmer_name, p.name, p.description, p.price, p.recommended_price, p.image,
          p.category, p.harvest_date, p.quantity, p.unit, p.available,
          CASE WHEN p.verified = 1 OR u.certificate_status = 'verified' THEN 1 ELSE 0 END AS verified,
          p.rating, p.review_count, p.created_at, u.lat AS farmer_lat, u.lng AS farmer_lng,
              u.phone AS farmer_phone, u.farm_name, u.address AS farmer_address, u.city AS farmer_city,
              u.certificate_status
       FROM products p LEFT JOIN users u ON u.id = p.farmer_id
       WHERE p.id = ?`,
      [id]
    )

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' })
    }
    if (!product.available && req.auth?.role !== 'admin' && !(req.auth?.role === 'farmer' && req.auth.id === Number(product.farmer_id))) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    if (!req.auth) {
      delete product.farmer_phone
      delete product.farmer_lat
      delete product.farmer_lng
      delete product.farmer_address
    }
    res.json({ product })
  } catch (error) {
    console.error('Product detail error:', error)
    res.status(500).json({ message: 'Unable to fetch product right now.' })
  }
})

app.get('/api/reviews', async (req, res) => {
  try {
    const { productId, targetType, targetId } = req.query
    if (!productId && !(targetType && targetId)) return res.status(400).json({ message: 'A product or review target is required.' })
    const reviews = productId
      ? await all("SELECT * FROM reviews WHERE target_type = 'product' AND target_id = ? ORDER BY created_at DESC", [productId])
      : await all('SELECT * FROM reviews WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC', [targetType, targetId])
    res.json({ reviews })
  } catch (error) {
    console.error('Reviews fetch error:', error)
    res.status(500).json({ message: 'Unable to fetch reviews right now.' })
  }
})

app.post('/api/reviews', async (req, res) => {
  try {
    const { product_id, target_type = 'product', target_id, order_id, rating, comment, image_url } = req.body || {}
    const targetId = Number(target_id ?? product_id)
    const normalizedOrderId = Number(order_id ?? 0)
    const numericRating = Number(rating)
    const reviewImage = typeof image_url === 'string' ? image_url.trim() : ''
    const sanitizedComment = typeof comment === 'string' ? comment.trim() : ''

    if (!['product', 'farmer', 'delivery'].includes(target_type) || !Number.isInteger(targetId) || targetId <= 0 || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Review target, user, and rating are required.' })
    }
    if ((target_type === 'product' && req.auth.role !== 'consumer') || (target_type !== 'product' && !['consumer', 'farmer'].includes(req.auth.role))) {
      return res.status(403).json({ message: 'Your account cannot submit this type of review.' })
    }
    if (target_type !== 'product' && !sanitizedComment) {
      return res.status(400).json({ message: 'Review text is required for farmer and delivery partner ratings.' })
    }
    if (reviewImage) {
      const image = imageData(reviewImage)
      if (!image || image.buffer.length > 4 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)) {
        return res.status(400).json({ message: 'Review photos must be JPEG, PNG, or WebP images no larger than 4 MB.' })
      }
    }

    if (target_type === 'product') {
      const product = await get('SELECT id FROM products WHERE id = ?', [targetId])
      if (!product) return res.status(404).json({ message: 'Product not found.' })
      const purchase = await get(
        `SELECT o.id FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         WHERE o.consumer_id = ? AND oi.product_id = ? AND o.status IN ('completed', 'delivered')
         LIMIT 1`,
        [req.auth.id, targetId]
      )
      if (!purchase) return res.status(403).json({ message: 'You can review a product after a completed purchase.' })
    } else {
      const role = target_type === 'farmer' ? 'farmer' : 'delivery'
      const targetUser = await get('SELECT id FROM users WHERE id = ? AND role = ?', [targetId, role])
      if (!targetUser) return res.status(404).json({ message: 'Review target not found.' })
      if (!order_id) return res.status(400).json({ message: 'Order is required for profile reviews.' })
      const order = req.auth.role === 'farmer'
        ? await get('SELECT id FROM orders WHERE id = ? AND status IN (\'completed\', \'delivered\') AND farmer_id = ? AND delivery_agent_id = ?', [order_id, req.auth.id, target_type === 'delivery' ? targetId : -1])
        : await get('SELECT id FROM orders WHERE id = ? AND status IN (\'completed\', \'delivered\') AND consumer_id = ? AND (farmer_id = ? OR delivery_agent_id = ?)', [order_id, req.auth.id, target_type === 'farmer' ? targetId : -1, target_type === 'delivery' ? targetId : -1])
      if (!order) return res.status(403).json({ message: 'You can review only a completed order you participated in.' })
    }

    const existing = target_type === 'product'
      ? await get("SELECT id FROM reviews WHERE target_type = 'product' AND target_id = ? AND user_id = ?", [targetId, req.auth.id])
      : await get('SELECT id FROM reviews WHERE target_type = ? AND target_id = ? AND order_id = ? AND user_id = ?', [target_type, targetId, normalizedOrderId, req.auth.id])
    if (existing) return res.status(409).json({ message: 'You have already submitted this review.' })

    const finalComment = target_type === 'product' ? (sanitizedComment || 'Product review') : sanitizedComment
    const result = await run(
      'INSERT INTO reviews (product_id, target_type, target_id, order_id, user_id, user_name, rating, comment, review_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [target_type === 'product' ? targetId : 0, target_type, targetId, target_type === 'product' ? 0 : normalizedOrderId, req.auth.id, req.auth.name, numericRating, finalComment, reviewImage || null]
    )
    const review = await get('SELECT * FROM reviews WHERE id = ?', [result.id])
    if (target_type === 'product') {
      const aggregate = await get("SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE target_type = 'product' AND target_id = ?", [targetId])
      await run('UPDATE products SET rating = ?, review_count = ? WHERE id = ?', [aggregate.average || 0, aggregate.count || 0, targetId])
    } else if (['farmer', 'delivery'].includes(target_type)) {
      const aggregate = await get("SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE target_type = ? AND target_id = ?", [target_type, targetId])
      await run('UPDATE users SET rating = ?, review_count = ? WHERE id = ? AND role = ?', [aggregate.average || 0, aggregate.count || 0, targetId, target_type])
    }
    res.status(201).json({ message: 'Review submitted successfully.', review })
  } catch (error) {
    console.error('Review creation error:', error)
    res.status(500).json({ message: 'Unable to submit review right now.' })
  }
})

app.get('/api/users/:id', requireMarketplaceProfileAccess, async (req, res) => {
  try {
    const { id } = req.params
    const user = await get(
      `SELECT id, role, name, email, phone, lat, lng, address, city, house_number, floor, building_block, landmark, state, pincode, farm_name, description, avatar, certificate_status, rating, review_count, aadhaar_number, aadhaar_status, driving_license_status, driving_license_number, vehicle_type, vehicle_number, availability_status,
       (SELECT status FROM certificates WHERE farmer_id = users.id ORDER BY uploaded_at DESC, id DESC LIMIT 1) AS certificate_review_status,
       created_at FROM users WHERE id = ?`,
      [id]
    )

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const safeUser = getSafeUser(user)
    if (req.auth.role !== 'admin' && req.auth.id !== Number(id)) {
      delete safeUser.lat
      delete safeUser.lng
      delete safeUser.address
      delete safeUser.houseNumber
      delete safeUser.floor
      delete safeUser.buildingBlock
      delete safeUser.landmark
      delete safeUser.state
      delete safeUser.pincode
      delete safeUser.aadhaarNumber
      delete safeUser.aadhaarStatus
      delete safeUser.drivingLicenseNumber
      delete safeUser.drivingLicenseStatus
    }
    res.json({ user: safeUser })
  } catch (error) {
    console.error('User profile error:', error)
    res.status(500).json({ message: 'Unable to fetch user profile right now.' })
  }
})

app.get('/api/delivery/nearby', requireRoles('consumer', 'admin'), async (req, res) => {
  try {
    const { lat, lng } = req.query
    const centerLat = Number(lat)
    const centerLng = Number(lng)
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required.' })
    }

    const agents = await all(
      `SELECT u.id, u.name, u.phone, u.lat, u.lng,
              CASE WHEN EXISTS (
                SELECT 1 FROM orders o
                WHERE o.delivery_agent_id = u.id
                  AND o.status IN ('pickup', 'out_for_delivery')
              ) THEN 'On delivery' ELSE 'Available' END AS delivery_status,
              u.aadhaar_status, u.driving_license_status, u.availability_status
       FROM users u
       WHERE u.role = 'delivery' AND u.lat IS NOT NULL AND u.lng IS NOT NULL`
    )

    const nearby = agents
      .map((agent) => ({
        ...agent,
        distance: Math.round(distanceKm(centerLat, centerLng, agent.lat, agent.lng) * 10) / 10,
        verified: agent.aadhaar_status === 'verified' && agent.driving_license_status === 'verified',
        available: agent.availability_status !== 'unavailable',
      }))
      .filter((agent) => agent.available)
      .filter((agent) => agent.distance <= 50)
      .sort((first, second) => first.distance - second.distance)

    res.json({ agents: nearby })
  } catch (error) {
    console.error('Nearby delivery agents error:', error)
    res.status(500).json({ message: 'Unable to find nearby delivery partners right now.' })
  }
})

app.put('/api/users/:id/profile', requireUserAccess(), async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body || {}
    const currentUser = await get('SELECT name, phone FROM users WHERE id = ?', [id])
    if (!currentUser) return res.status(404).json({ message: 'User not found.' })

    const name = Object.hasOwn(body, 'name') ? body.name : currentUser.name
    const phone = Object.hasOwn(body, 'phone') ? body.phone : currentUser.phone
    if (typeof name !== 'string' || !name.trim() || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ message: 'Name and phone number are required.' })
    }

    const fields = {
      name: ['name', (value) => String(value).trim()],
      phone: ['phone', (value) => String(value).trim()],
      email: ['email', (value) => String(value).trim().toLowerCase()],
      address: ['address', (value) => String(value).trim()],
      city: ['city', (value) => String(value).trim()],
      lat: ['lat', (value) => value == null || value === '' ? null : Number(value)],
      lng: ['lng', (value) => value == null || value === '' ? null : Number(value)],
      farmName: ['farm_name', (value) => String(value).trim()],
      description: ['description', (value) => String(value).trim()],
      avatar: ['avatar', (value) => value || null],
      drivingLicenseNumber: ['driving_license_number', (value) => String(value).trim()],
      vehicleType: ['vehicle_type', (value) => String(value).trim()],
      vehicleNumber: ['vehicle_number', (value) => String(value).trim()],
      houseNumber: ['house_number', (value) => String(value).trim()],
      floor: ['floor', (value) => String(value).trim()],
      buildingBlock: ['building_block', (value) => String(value).trim()],
      landmark: ['landmark', (value) => String(value).trim()],
      state: ['state', (value) => String(value).trim()],
      pincode: ['pincode', (value) => String(value).trim()],
    }
    const updates = Object.entries(fields)
      .filter(([field]) => Object.hasOwn(body, field))
      .map(([field, [column, normalize]]) => [column, normalize(body[field])])

    if (!Object.hasOwn(body, 'name')) updates.push(['name', currentUser.name])
    if (!Object.hasOwn(body, 'phone')) updates.push(['phone', currentUser.phone])
    for (const coordinate of ['lat', 'lng']) {
      const value = updates.find(([column]) => column === coordinate)?.[1]
      if (value != null && (!Number.isFinite(value) || (coordinate === 'lat' ? Math.abs(value) > 90 : Math.abs(value) > 180))) {
        return res.status(400).json({ message: 'Location coordinates are invalid.' })
      }
    }

    const setClause = updates.map(([column]) => `${column} = ?`).join(', ')
    const updateValues = updates.map(([, value]) => value)
    await run(`UPDATE users SET ${setClause} WHERE id = ?`, [...updateValues, id])

    const user = await get(
      `SELECT id, role, name, email, phone, lat, lng, address, city, house_number, floor, building_block, landmark, state, pincode, farm_name, description, avatar, certificate_status, rating, review_count, account_status, aadhaar_number, aadhaar_status, driving_license_status, availability_status, driving_license_number, vehicle_type, vehicle_number,
       (SELECT status FROM certificates WHERE farmer_id = users.id ORDER BY uploaded_at DESC, id DESC LIMIT 1) AS certificate_review_status,
       created_at FROM users WHERE id = ?`,
      [id]
    )
    if (!user) return res.status(404).json({ message: 'User not found.' })

    res.json({ message: 'Profile saved successfully.', user: getSafeUser(user) })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ message: 'Unable to save profile right now.' })
  }
})

async function syncUserDefaultAddress(userId, currentAddress) {
  const defaultAddress = currentAddress || await get(
    'SELECT * FROM delivery_addresses WHERE user_id = ? AND is_default = 1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  )

  if (!defaultAddress) {
    await run(
      'UPDATE users SET address = ?, city = ?, state = ?, pincode = ?, lat = ?, lng = ? WHERE id = ?',
      [null, null, null, null, null, null, userId]
    )
    return
  }

  await run(
    `UPDATE users
     SET address = ?, city = ?, state = ?, pincode = ?, lat = ?, lng = ?
     WHERE id = ?`,
    [
      defaultAddress.address_line || null,
      defaultAddress.city || null,
      defaultAddress.state || null,
      defaultAddress.pincode || null,
      defaultAddress.lat ?? null,
      defaultAddress.lng ?? null,
      userId,
    ]
  )
}

app.get('/api/users/:id/addresses', requireUserAccess(), async (req, res) => {
  try {
    const addresses = await all('SELECT * FROM delivery_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [req.params.id])
    res.json({ addresses })
  } catch (error) {
    console.error('Address fetch error:', error)
    res.status(500).json({ message: 'Unable to fetch delivery addresses right now.' })
  }
})

app.post('/api/users/:id/addresses', requireUserAccess(), async (req, res) => {
  try {
    const { label, address_line, landmark, city, state, pincode, lat, lng, is_default } = req.body || {}
    if (typeof address_line !== 'string' || !address_line.trim() || address_line.length > 1000 || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ message: 'A valid address line and city are required.' })
    }
    const addressLabel = typeof label === 'string' ? label.trim() : 'Home'
    if (!addressLabels.has(addressLabel)) return res.status(400).json({ message: 'Address label must be Home, Work, or Other.' })
    const hasCoordinates = lat != null && lng != null
    if ((lat == null) !== (lng == null) || (hasCoordinates && (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180))) {
      return res.status(400).json({ message: 'Location coordinates are invalid.' })
    }

    const existingDefault = await get('SELECT id FROM delivery_addresses WHERE user_id = ? AND is_default = 1 LIMIT 1', [req.params.id])
    const shouldBeDefault = is_default === true || !existingDefault
    if (shouldBeDefault) {
      await run('UPDATE delivery_addresses SET is_default = 0 WHERE user_id = ?', [req.params.id])
    }

    const result = await run(
      `INSERT INTO delivery_addresses (user_id, label, address_line, landmark, city, state, pincode, lat, lng, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, addressLabel, address_line.trim(), typeof landmark === 'string' ? landmark.trim() || null : null, city.trim(), typeof state === 'string' ? state.trim() || null : null, typeof pincode === 'string' ? pincode.trim() || null : null, hasCoordinates ? Number(lat) : null, hasCoordinates ? Number(lng) : null, shouldBeDefault ? 1 : 0]
    )
    const address = await get('SELECT * FROM delivery_addresses WHERE id = ?', [result.id])

    if (Number(address.is_default) === 1) {
      await syncUserDefaultAddress(req.params.id, address)
    }

    res.status(201).json({ message: 'Address saved successfully.', address })
  } catch (error) {
    console.error('Address save error:', error)
    res.status(500).json({ message: 'Unable to save delivery address right now.' })
  }
})

app.put('/api/users/:userId/addresses/:addressId', requireUserAccess('userId'), async (req, res) => {
  try {
    const { label, address_line, landmark, city, state, pincode, lat, lng } = req.body || {}
    const addressLabel = typeof label === 'string' ? label.trim() : ''
    if (!addressLabels.has(addressLabel) || typeof address_line !== 'string' || !address_line.trim() || address_line.length > 1000 || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ message: 'A valid label, address line, and city are required.' })
    }
    const hasCoordinates = lat != null && lng != null
    if ((lat == null) !== (lng == null) || (hasCoordinates && (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180))) {
      return res.status(400).json({ message: 'Location coordinates are invalid.' })
    }

    const updatedAddress = await withTransaction(async () => {
      const existing = await get('SELECT * FROM delivery_addresses WHERE id = ? AND user_id = ?', [req.params.addressId, req.params.userId])
      if (!existing) return null
      await run(
        `UPDATE delivery_addresses SET label = ?, address_line = ?, landmark = ?, city = ?, state = ?, pincode = ?, lat = ?, lng = ?
         WHERE id = ? AND user_id = ?`,
        [addressLabel, address_line.trim(), typeof landmark === 'string' ? landmark.trim() || null : null, city.trim(), typeof state === 'string' ? state.trim() || null : null, typeof pincode === 'string' ? pincode.trim() || null : null, hasCoordinates ? Number(lat) : null, hasCoordinates ? Number(lng) : null, req.params.addressId, req.params.userId]
      )
      const result = await get('SELECT * FROM delivery_addresses WHERE id = ? AND user_id = ?', [req.params.addressId, req.params.userId])
      if (Number(result.is_default) === 1) await syncUserDefaultAddress(req.params.userId, result)
      return result
    })
    if (!updatedAddress) return res.status(404).json({ message: 'Address not found.' })
    res.json({ message: 'Address updated successfully.', address: updatedAddress })
  } catch (error) {
    console.error('Address update error:', error)
    res.status(500).json({ message: 'Unable to update delivery address right now.' })
  }
})

app.put('/api/users/:userId/addresses/:addressId/default', requireUserAccess('userId'), async (req, res) => {
  try {
    const updatedAddress = await withTransaction(async () => {
      const address = await get('SELECT * FROM delivery_addresses WHERE id = ? AND user_id = ?', [req.params.addressId, req.params.userId])
      if (!address) return null
      await run('UPDATE delivery_addresses SET is_default = 0 WHERE user_id = ?', [req.params.userId])
      await run('UPDATE delivery_addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [req.params.addressId, req.params.userId])
      await syncUserDefaultAddress(req.params.userId, address)
      return get('SELECT * FROM delivery_addresses WHERE id = ?', [req.params.addressId])
    })
    if (!updatedAddress) return res.status(404).json({ message: 'Address not found.' })
    const user = await get('SELECT id, name, email, phone, lat, lng, address, city, pincode, state FROM users WHERE id = ?', [req.params.userId])
    res.json({ message: 'Default address updated.', address: updatedAddress, user: user || null })
  } catch (error) {
    console.error('Default address update error:', error)
    res.status(500).json({ message: 'Unable to update default address right now.' })
  }
})

app.delete('/api/users/:userId/addresses/:addressId', requireUserAccess('userId'), async (req, res) => {
  try {
    const deleted = await withTransaction(async () => {
      const existing = await get('SELECT * FROM delivery_addresses WHERE id = ? AND user_id = ?', [req.params.addressId, req.params.userId])
      if (!existing) return false

      await run('DELETE FROM delivery_addresses WHERE id = ? AND user_id = ?', [req.params.addressId, req.params.userId])
      if (Number(existing.is_default) === 1) {
        const nextDefault = await get('SELECT * FROM delivery_addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.params.userId])
        if (nextDefault) {
          await run('UPDATE delivery_addresses SET is_default = 1 WHERE id = ?', [nextDefault.id])
          await syncUserDefaultAddress(req.params.userId, nextDefault)
        } else {
          await run('UPDATE users SET address = ?, city = ?, state = ?, pincode = ?, lat = ?, lng = ? WHERE id = ?', [null, null, null, null, null, null, req.params.userId])
        }
      }
      return true
    })
    if (!deleted) return res.status(404).json({ message: 'Address not found.' })

    res.json({ message: 'Address removed successfully.' })
  } catch (error) {
    console.error('Address delete error:', error)
    res.status(500).json({ message: 'Unable to remove delivery address right now.' })
  }
})

app.get('/api/certificates', async (req, res) => {
  try {
    const { farmerId } = req.query
    if (req.auth.role !== 'admin' && (!farmerId || Number(farmerId) !== req.auth.id || req.auth.role !== 'farmer')) {
      return res.status(403).json({ message: 'You can access only your own certificates.' })
    }
    const certificates = farmerId
      ? await all('SELECT * FROM certificates WHERE farmer_id = ? ORDER BY uploaded_at DESC, id DESC', [farmerId])
      : await all('SELECT * FROM certificates ORDER BY uploaded_at DESC, id DESC')
    res.json({ certificates })
  } catch (error) {
    console.error('Certificates fetch error:', error)
    res.status(500).json({ message: 'Unable to fetch certificates right now.' })
  }
})

app.post('/api/certificates', requireRoles('farmer'), async (req, res) => {
  try {
    const { farmer_id, farmer_name, certificate_number, type, document_url, expiry_date, ocr_text, extracted_name, extracted_certificate_number } = req.body || {}
    if (!farmer_id || !farmer_name?.trim() || !certificate_number?.trim() || !type?.trim() || !document_url) {
      return res.status(400).json({ message: 'Farmer name, certificate number, type, and image are required.' })
    }
    if (Number(farmer_id) !== req.auth.id) {
      return res.status(403).json({ message: 'You can upload certificates only for your own account.' })
    }
    const image = imageData(document_url)
    if (!image) return res.status(400).json({ message: 'Certificate must be uploaded as an image.' })

    const farmer = await get('SELECT id, name FROM users WHERE id = ? AND role = ?', [farmer_id, 'farmer'])
    if (!farmer) return res.status(404).json({ message: 'Farmer not found.' })
    const normalizeText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
    const normalizedCertificateNumber = normalizeText(certificate_number)
    const normalizedExtractedNumber = normalizeText(extracted_certificate_number)
    if (!normalizedExtractedNumber) return res.status(400).json({ message: 'OCR could not find a certificate ID in this image.' })
    if (normalizedCertificateNumber !== normalizedExtractedNumber) return res.status(400).json({ message: 'The certificate number does not match the number extracted from the image.' })
    const normalizedFarmerName = normalizeText(farmer.name)
    const normalizedExtractedName = normalizeText(extracted_name)
    if (!normalizedExtractedName || (!normalizedExtractedName.includes(normalizedFarmerName) && !normalizedFarmerName.includes(normalizedExtractedName))) {
      return res.status(400).json({ message: 'The farmer name in the certificate does not match the signed-in farmer.' })
    }
    const duplicate = await get('SELECT id FROM certificates WHERE LOWER(certificate_number) = LOWER(?)', [certificate_number.trim()])
    if (duplicate) return res.status(409).json({ message: 'This certificate ID is already uploaded.' })

    await run('UPDATE certificates SET status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE farmer_id = ? AND status = ?', ['rejected', farmer_id, 'pending'])
    const insertResult = await run(
      `INSERT INTO certificates (farmer_id, farmer_name, certificate_number, type, document_url, document_blob, document_mime_type, expiry_date, ocr_text, extracted_name, extracted_certificate_number, ocr_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 'pending')`,
      [farmer_id, farmer_name.trim(), certificate_number.trim(), type.trim(), document_url, image.buffer, image.mimeType, expiry_date || null, String(ocr_text || ''), String(extracted_name || '').trim(), String(extracted_certificate_number || '').trim()]
    )
    await run('UPDATE users SET certificate_status = ? WHERE id = ?', ['pending', farmer_id])
    const certificate = await get('SELECT * FROM certificates WHERE id = ?', [insertResult.id])
    res.status(201).json({ message: 'Certificate uploaded for admin review.', certificate })
  } catch (error) {
    console.error('Certificate upload error:', error)
    res.status(500).json({ message: 'Unable to upload certificate right now.' })
  }
})

const requireCertificateAccess = async (req, res, next) => {
  if (req.auth.role === 'admin') return next()
  if (req.auth.role !== 'farmer') return res.status(403).json({ message: 'You cannot access certificate documents.' })
  try {
    const certificate = await get('SELECT farmer_id FROM certificates WHERE id = ?', [req.params.id])
    if (!certificate || Number(certificate.farmer_id) !== req.auth.id) {
      return res.status(404).json({ message: 'Certificate not found.' })
    }
    next()
  } catch (error) {
    console.error('Certificate access error:', error)
    res.status(500).json({ message: 'Unable to check certificate access right now.' })
  }
}

app.get('/api/certificates/:id/image', requireCertificateAccess, async (req, res) => {
  try {
    const certificate = await get('SELECT document_blob, document_mime_type FROM certificates WHERE id = ?', [req.params.id])
    if (!certificate?.document_blob) return res.status(404).json({ message: 'Certificate image not found.' })
    res.type(certificate.document_mime_type || 'image/jpeg').send(certificate.document_blob)
  } catch (error) {
    console.error('Certificate image error:', error)
    res.status(500).json({ message: 'Unable to load certificate image right now.' })
  }
})

app.get('/api/certificates/:id/download', requireCertificateAccess, async (req, res) => {
  try {
    const certificate = await get('SELECT document_blob, document_mime_type, certificate_number FROM certificates WHERE id = ?', [req.params.id])
    if (!certificate?.document_blob) return res.status(404).json({ message: 'Certificate image not found.' })
    const extension = (certificate.document_mime_type || 'image/jpeg').split('/')[1] || 'jpg'
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificate_number || req.params.id}.${extension}"`)
    res.type(certificate.document_mime_type || 'image/jpeg').send(certificate.document_blob)
  } catch (error) {
    console.error('Certificate download error:', error)
    res.status(500).json({ message: 'Unable to download certificate right now.' })
  }
})

app.put('/api/certificates/:id/status', requireRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { status, rejection_reason } = req.body || {}
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Certificate status must be verified or rejected.' })
    }

    const certificate = await get('SELECT * FROM certificates WHERE id = ?', [id])
    if (!certificate) return res.status(404).json({ message: 'Certificate not found.' })

    await run(
      'UPDATE certificates SET status = ?, rejection_reason = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, typeof rejection_reason === 'string' ? rejection_reason.trim() || null : null, id]
    )
    const latestCertificate = await get('SELECT status FROM certificates WHERE farmer_id = ? ORDER BY uploaded_at DESC, id DESC LIMIT 1', [certificate.farmer_id])
    await run('UPDATE users SET certificate_status = ? WHERE id = ?', [latestCertificate?.status || 'pending', certificate.farmer_id])
    const updatedCertificate = await get('SELECT * FROM certificates WHERE id = ?', [id])
    res.json({ message: `Certificate ${status}.`, certificate: updatedCertificate })
  } catch (error) {
    console.error('Certificate review error:', error)
    res.status(500).json({ message: 'Unable to review certificate right now.' })
  }
})

app.put('/api/admin/users/:id/status', requireRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body || {}
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Account status must be active or suspended.' })
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return res.status(404).json({ message: 'User not found.' })
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot modify admin accounts.' })

    await run('UPDATE users SET account_status = ? WHERE id = ?', [status, id])
    const updatedUser = await get(
      `SELECT users.*,
        (SELECT status FROM certificates WHERE farmer_id = users.id ORDER BY uploaded_at DESC, id DESC LIMIT 1) AS certificate_review_status
       FROM users WHERE id = ?`,
      [id]
    )
    res.json({ message: `Account ${status}.`, user: getSafeUser(updatedUser) })
  } catch (error) {
    console.error('User status update error:', error)
    res.status(500).json({ message: 'Unable to update user status right now.' })
  }
})

app.put('/api/admin/delivery-partners/:id/verification', requireRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { document, status } = req.body || {}
    if (!['aadhaar', 'driving_license'].includes(document) || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Document and verification status are required.' })
    }

    const user = await get('SELECT * FROM users WHERE id = ? AND role = ?', [id, 'delivery'])
    if (!user) return res.status(404).json({ message: 'Delivery partner not found.' })
    const documentValue = document === 'aadhaar' ? user.aadhaar_number : user.driving_license_number
    if (!documentValue?.trim()) {
      return res.status(400).json({ message: `Cannot review ${document} before the required number is provided.` })
    }

    const column = document === 'aadhaar' ? 'aadhaar_status' : 'driving_license_status'
    await run(`UPDATE users SET ${column} = ? WHERE id = ?`, [status, id])
    const updatedUser = await get('SELECT * FROM users WHERE id = ?', [id])
    res.json({ message: `${document} ${status}.`, user: getSafeUser(updatedUser) })
  } catch (error) {
    console.error('Delivery partner verification error:', error)
    res.status(500).json({ message: 'Unable to update delivery partner verification right now.' })
  }
})

app.get('/api/chat/contacts', requireRoles('farmer', 'consumer', 'delivery'), async (req, res) => {
  try {
    const role = req.auth.role
    const parsedId = req.auth.id
    const contacts = []

    const baseFields = 'u.id, u.role, u.name, u.email, u.phone, u.lat, u.lng, u.address, u.city'

    if (role === 'farmer') {
      const consumerContacts = await all(
        `SELECT DISTINCT ${baseFields}
         FROM users u
         JOIN orders o ON u.id = o.consumer_id
         WHERE o.farmer_id = ? AND u.role = 'consumer'`,
        [parsedId]
      )
      const deliveryContacts = await all(
        `SELECT DISTINCT ${baseFields}
         FROM users u
         WHERE u.role = 'delivery'
         ORDER BY u.name ASC`
      )
      contacts.push(...consumerContacts, ...deliveryContacts)
    } else if (role === 'consumer') {
      const farmerContacts = await all(
        `SELECT DISTINCT ${baseFields}
         FROM users u
         JOIN orders o ON u.id = o.farmer_id
         WHERE o.consumer_id = ? AND u.role = 'farmer'`,
        [parsedId]
      )
      const deliveryContacts = await all(
        `SELECT DISTINCT ${baseFields}
         FROM users u
         JOIN orders o ON u.id = o.delivery_agent_id
         WHERE o.consumer_id = ? AND u.role = 'delivery'`,
        [parsedId]
      )
      contacts.push(...farmerContacts, ...deliveryContacts)
    } else if (role === 'delivery') {
      const farmerContacts = await all(
        `SELECT DISTINCT ${baseFields}
         FROM users u
         JOIN orders o ON u.id = o.farmer_id
         WHERE o.delivery_agent_id = ? AND u.role = 'farmer'`,
        [parsedId]
      )
      const consumerContacts = await all(
        `SELECT DISTINCT ${baseFields}
         FROM users u
         JOIN orders o ON u.id = o.consumer_id
         WHERE o.delivery_agent_id = ? AND u.role = 'consumer'`,
        [parsedId]
      )
      contacts.push(...farmerContacts, ...consumerContacts)
    } else {
      return res.status(400).json({ message: 'Invalid role for chat contacts.' })
    }

    res.json({ contacts })
  } catch (error) {
    console.error('Chat contacts error:', error)
    res.status(500).json({ message: 'Unable to fetch chat contacts right now.' })
  }
})

app.post('/api/products', requireRoles('farmer'), async (req, res) => {
  try {
    const { name, description, price, recommended_price, image, category, harvest_date, quantity, unit, available } = req.body || {}

    if (typeof name !== 'string' || !name.trim() || name.length > 160 || !Number.isFinite(Number(price)) || Number(price) <= 0 || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return res.status(400).json({ message: 'Farmer ID, name, price, and quantity are required.' })
    }

    const farmer = await get('SELECT name, farm_name FROM users WHERE id = ? AND role = ?', [req.auth.id, 'farmer'])
    if (!farmer) return res.status(403).json({ message: 'Farmer account not found.' })

    const insertResult = await run(
      `INSERT INTO products (farmer_id, farmer_name, name, description, price, recommended_price, image, category, harvest_date, quantity, unit, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.auth.id, farmer.farm_name || farmer.name, name.trim(), typeof description === 'string' ? description.trim() : '', Number(price), Number(recommended_price) > 0 ? Number(recommended_price) : null, image || null, category || 'General', harvest_date || null, Number(quantity), unit || 'kg', available === false ? 0 : 1]
    )

    const createdProduct = await get('SELECT * FROM products WHERE id = ?', [insertResult.id])
    res.status(201).json({ message: 'Product created successfully.', product: createdProduct })
  } catch (error) {
    console.error('Product creation error:', error)
    res.status(500).json({ message: 'Unable to create product right now.' })
  }
})

app.put('/api/products/:id', requireProductAccess, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, price, recommended_price, image, category, harvest_date, quantity, unit, available } = req.body || {}
    const numericPrice = Number(price)
    const numericQuantity = Number(quantity)
    if (typeof name !== 'string' || !name.trim() || name.length > 160 || !Number.isFinite(numericPrice) || numericPrice <= 0 || !Number.isFinite(numericQuantity) || numericQuantity < 0 || typeof available !== 'boolean') {
      return res.status(400).json({ message: 'Product name, positive price, valid stock quantity, and availability are required.' })
    }

    const updateResult = await run(
      `UPDATE products SET name = ?, description = ?, price = ?, recommended_price = ?, image = ?, category = ?, harvest_date = ?, quantity = ?, unit = ?, available = ? WHERE id = ?`,
      [name.trim(), typeof description === 'string' ? description.trim() : '', numericPrice, Number(recommended_price) > 0 ? Number(recommended_price) : null, image || null, category || 'General', harvest_date || null, numericQuantity, unit || 'kg', available && numericQuantity > 0 ? 1 : 0, id]
    )

    if (updateResult.changes === 0) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const updatedProduct = await get('SELECT * FROM products WHERE id = ?', [id])
    res.json({ message: 'Product updated successfully.', product: updatedProduct })
  } catch (error) {
    console.error('Product update error:', error)
    res.status(500).json({ message: 'Unable to update product right now.' })
  }
})

app.delete('/api/products/:id', requireProductAccess, async (req, res) => {
  try {
    const { id } = req.params
    const deleteResult = await run('DELETE FROM products WHERE id = ?', [id])

    if (deleteResult.changes === 0) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    res.json({ message: 'Product deleted successfully.' })
  } catch (error) {
    console.error('Product deletion error:', error)
    res.status(500).json({ message: 'Unable to delete product right now.' })
  }
})

// Orders API endpoints
app.get('/api/orders', async (req, res) => {
  try {
    const userId = req.auth.id
    const role = req.auth.role
    let orders = []

    if (role === 'consumer') {
      orders = await all('SELECT * FROM orders WHERE consumer_id = ? ORDER BY created_at DESC', [userId])
    } else if (role === 'farmer') {
      orders = await all('SELECT * FROM orders WHERE farmer_id = ? ORDER BY created_at DESC', [userId])
    } else if (role === 'delivery') {
      orders = await all(
        'SELECT * FROM orders WHERE delivery_agent_id = ? OR (status = "accepted" AND delivery_agent_id IS NULL) ORDER BY created_at DESC',
        [userId]
      )
    } else {
      orders = await all('SELECT * FROM orders ORDER BY created_at DESC')
    }

    for (const order of orders) {
      const items = await all('SELECT * FROM order_items WHERE order_id = ?', [order.id])
      order.items = items
      if (role === 'delivery') {
        const farmer = await get('SELECT phone, address, city, lat, lng FROM users WHERE id = ?', [order.farmer_id])
        const consumer = await get('SELECT phone, address, city, lat, lng FROM users WHERE id = ?', [order.consumer_id])
        const savedAddresses = await all('SELECT address_line, landmark, city, state, pincode, lat, lng FROM delivery_addresses WHERE user_id = ?', [order.consumer_id])
        const matchingAddress = savedAddresses.find((savedAddress) => [savedAddress.address_line, savedAddress.landmark, savedAddress.city, savedAddress.state, savedAddress.pincode].filter(Boolean).join(', ') === order.address)
        order.farmer_phone = farmer?.phone || ''
        order.pickup_address = [farmer?.address, farmer?.city].filter(Boolean).join(', ')
        order.farmer_lat = farmer?.lat ?? null
        order.farmer_lng = farmer?.lng ?? null
        order.consumer_phone = consumer?.phone || ''
        order.delivery_address = order.address || [consumer?.address, consumer?.city].filter(Boolean).join(', ')
        order.consumer_lat = order.delivery_lat ?? matchingAddress?.lat ?? consumer?.lat ?? null
        order.consumer_lng = order.delivery_lng ?? matchingAddress?.lng ?? consumer?.lng ?? null
      }
    }

    res.json({ orders })
  } catch (error) {
    console.error('Orders fetch error:', error)
    res.status(500).json({ message: 'Unable to fetch orders right now.' })
  }
})

app.post('/api/orders', requireRoles('consumer'), async (req, res) => {
  try {
    const { items, address, payment_method, delivery_lat, delivery_lng } = req.body || {}

    if (!Array.isArray(items) || items.length === 0 || items.length > 100 || typeof address !== 'string' || !address.trim() || address.length > 1000) {
      return res.status(400).json({ message: 'At least one product and a delivery address are required.' })
    }

    if (payment_method && !['upi', 'cod'].includes(payment_method)) {
      return res.status(400).json({ message: 'Unsupported payment method.' })
    }
    const hasDeliveryCoordinates = delivery_lat != null || delivery_lng != null
    if (hasDeliveryCoordinates && (!Number.isFinite(Number(delivery_lat)) || !Number.isFinite(Number(delivery_lng)) || Math.abs(Number(delivery_lat)) > 90 || Math.abs(Number(delivery_lng)) > 180)) {
      return res.status(400).json({ message: 'Delivery coordinates are invalid.' })
    }

    const quantitiesByProduct = new Map()
    for (const item of items) {
      const productId = Number(item?.product_id)
      const quantity = Number(item?.quantity)
      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Every order item must have a valid product and quantity.' })
      }
      quantitiesByProduct.set(productId, (quantitiesByProduct.get(productId) || 0) + quantity)
    }

    const responseOrder = await withTransaction(async () => {
      const fail = (statusCode, message) => {
        const error = new Error(message)
        error.statusCode = statusCode
        throw error
      }
      const consumer = await get('SELECT name FROM users WHERE id = ? AND role = ?', [req.auth.id, 'consumer'])
      if (!consumer) fail(403, 'Consumer account not found.')

      const orderProducts = []
      for (const [productId, quantity] of quantitiesByProduct) {
        const product = await get(
          `SELECT p.id, p.farmer_id, p.name, p.price, p.image, p.quantity, p.available,
                  u.name AS account_name, u.farm_name, u.lat AS farmer_lat, u.lng AS farmer_lng
           FROM products p JOIN users u ON u.id = p.farmer_id WHERE p.id = ?`,
          [productId]
        )
        if (!product || !product.available) fail(409, 'A product in your cart is no longer available.')
        if (quantity > Number(product.quantity)) fail(409, `${product.name} does not have enough stock for this order.`)
        orderProducts.push({ ...product, order_quantity: quantity })
      }

      const farmerIds = [...new Set(orderProducts.map((product) => Number(product.farmer_id)))]
      if (farmerIds.length !== 1) fail(400, 'All items in an order must come from the same farmer.')

      const subtotal = orderProducts.reduce((sum, product) => sum + Number(product.price) * product.order_quantity, 0)
      const farmer = orderProducts[0]
      const distance = farmer.farmer_lat != null && farmer.farmer_lng != null && hasDeliveryCoordinates
        ? distanceKm(Number(farmer.farmer_lat), Number(farmer.farmer_lng), Number(delivery_lat), Number(delivery_lng))
        : 0
      const deliveryFee = subtotal >= 499 ? 0 : distance <= 5 ? 25 : distance <= 15 ? 45 : distance <= 30 ? 70 : 95
      const total = Number((subtotal + deliveryFee).toFixed(2))

      const insertResult = await run(
        `INSERT INTO orders (consumer_id, consumer_name, farmer_id, farmer_name, total, address, payment_method, delivery_lat, delivery_lng, expected_delivery_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.auth.id, consumer.name, farmer.farmer_id, farmer.farm_name || farmer.account_name, total, address.trim(), payment_method || null, hasDeliveryCoordinates ? Number(delivery_lat) : null, hasDeliveryCoordinates ? Number(delivery_lng) : null, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()]
      )

      const orderId = insertResult.id
      for (const product of orderProducts) {
        const stockUpdate = await run(
          'UPDATE products SET quantity = quantity - ?, available = CASE WHEN quantity - ? <= 0 THEN 0 ELSE available END WHERE id = ? AND available = 1 AND quantity >= ?',
          [product.order_quantity, product.order_quantity, product.id, product.order_quantity]
        )
        if (!stockUpdate.changes) fail(409, `${product.name} is no longer available in the requested quantity.`)
        await run(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, image) VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, product.id, product.name, product.order_quantity, product.price, product.image || null]
        )
      }

      const createdOrder = await get('SELECT * FROM orders WHERE id = ?', [orderId])
      const orderItems = await all('SELECT * FROM order_items WHERE order_id = ?', [orderId])
      return { ...createdOrder, items: orderItems }
    })

    if (global.io) {
      try {
        global.io.to(`user_${req.auth.id}`).emit('order_created', responseOrder)
        global.io.to(`user_${responseOrder.farmer_id}`).emit('order_created', responseOrder)
        global.io.to('role_admin').emit('order_created', responseOrder)
      } catch (e) {
        console.warn('Order created socket emit failed:', e)
      }
    }

    res.status(201).json({ message: 'Order created successfully.', order: responseOrder })
  } catch (error) {
    console.error('Order creation error:', error)
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message })
    res.status(500).json({ message: 'Unable to create order right now.' })
  }
})

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, pickup_parcel_photo, delivery_parcel_photo } = req.body || {}
    const allowedStatuses = ['accepted', 'cancelled', 'pickup', 'out_for_delivery', 'completed']
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid order status.' })

    for (const photo of [pickup_parcel_photo, delivery_parcel_photo].filter(Boolean)) {
      const image = imageData(photo)
      if (!image || image.buffer.length > 4 * 1024 * 1024) {
        return res.status(400).json({ message: 'Parcel photos must be valid images no larger than 4 MB.' })
      }
    }

    const order = await get('SELECT * FROM orders WHERE id = ?', [id])
    if (!order) return res.status(404).json({ message: 'Order not found.' })

    let updateResult
    const pickupPhoto = pickup_parcel_photo || null
    const deliveryPhoto = delivery_parcel_photo || null
    const farmerCanCancel = req.auth.role === 'farmer' && Number(order.farmer_id) === req.auth.id && order.status === 'pending' && status === 'cancelled'
    const consumerCanCancel = req.auth.role === 'consumer' && Number(order.consumer_id) === req.auth.id && status === 'cancelled' && !['cancelled', 'completed', 'delivered'].includes(order.status)

    if (farmerCanCancel || consumerCanCancel) {
      updateResult = await withTransaction(async () => {
        const ownerColumn = farmerCanCancel ? 'farmer_id' : 'consumer_id'
        const transitioned = await run(
          `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND ${ownerColumn} = ? AND status = ?`,
          [id, req.auth.id, order.status]
        )
        if (!transitioned.changes) return transitioned
        const orderedItems = await all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id])
        for (const item of orderedItems) {
          await run(
            'UPDATE products SET quantity = quantity + ?, available = CASE WHEN available = 0 THEN 1 ELSE available END WHERE id = ?',
            [item.quantity, item.product_id]
          )
        }
        return transitioned
      })
    } else if (req.auth.role === 'farmer' && Number(order.farmer_id) === req.auth.id && order.status === 'pending' && status === 'accepted') {
      updateResult = await run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND farmer_id = ? AND status = ?',
        ['accepted', id, req.auth.id, 'pending']
      )
    } else if (req.auth.role === 'delivery' && status === 'pickup' && order.status === 'accepted' && order.delivery_agent_id == null) {
      const agent = await get('SELECT name FROM users WHERE id = ? AND role = ?', [req.auth.id, 'delivery'])
      updateResult = await run(
        `UPDATE orders SET status = ?, delivery_agent_id = ?, delivery_agent_name = ?, pickup_parcel_photo = COALESCE(?, pickup_parcel_photo), updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'accepted' AND delivery_agent_id IS NULL`,
        [status, req.auth.id, agent?.name || '', pickupPhoto, id]
      )
    } else if (req.auth.role === 'delivery' && Number(order.delivery_agent_id) === req.auth.id && order.status === 'pickup' && status === 'out_for_delivery') {
      updateResult = await run(
        `UPDATE orders SET status = ?, pickup_parcel_photo = COALESCE(?, pickup_parcel_photo), updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND delivery_agent_id = ? AND status = 'pickup'`,
        [status, pickupPhoto, id, req.auth.id]
      )
    } else if (req.auth.role === 'delivery' && Number(order.delivery_agent_id) === req.auth.id && order.status === 'out_for_delivery' && status === 'completed') {
      updateResult = await run(
        `UPDATE orders SET status = ?, delivery_parcel_photo = COALESCE(?, delivery_parcel_photo), updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND delivery_agent_id = ? AND status = 'out_for_delivery'`,
        [status, deliveryPhoto, id, req.auth.id]
      )
    } else {
      return res.status(403).json({ message: 'This status change is not allowed for your account or the current order state.' })
    }

    if (updateResult.changes === 0) return res.status(409).json({ message: 'The order has changed. Refresh and try again.' })

    const updatedOrder = await get('SELECT * FROM orders WHERE id = ?', [id])
    if (global.io) {
      try {
        global.io.to(`user_${updatedOrder.consumer_id}`).emit('order_updated', updatedOrder)
        global.io.to(`user_${updatedOrder.farmer_id}`).emit('order_updated', updatedOrder)
        if (updatedOrder.delivery_agent_id) global.io.to(`user_${updatedOrder.delivery_agent_id}`).emit('order_updated', updatedOrder)
        global.io.to('role_admin').emit('order_updated', updatedOrder)
        if (status === 'accepted') {
          const farmer = await get('SELECT lat, lng FROM users WHERE id = ?', [updatedOrder.farmer_id])
          const deliveryAgents = await all('SELECT id, lat, lng FROM users WHERE role = ?', ['delivery'])
          const nearbyAgents = farmer?.lat != null && farmer?.lng != null
            ? deliveryAgents.filter((agent) => agent.lat != null && agent.lng != null && distanceKm(farmer.lat, farmer.lng, agent.lat, agent.lng) <= 50)
            : deliveryAgents
          const recipients = nearbyAgents.length > 0 ? nearbyAgents : deliveryAgents
          for (const agent of recipients) {
            global.io.to(`user_${agent.id}`).emit('delivery_order_available', updatedOrder)
          }
        }
      } catch (e) {
        console.warn('Order updated socket emit failed:', e)
      }
    }

    res.json({ message: 'Order status updated successfully.', order: updatedOrder })
  } catch (error) {
    console.error('Order status update error:', error)
    res.status(500).json({ message: 'Unable to update order status right now.' })
  }
})

// Messages API endpoints
app.get('/api/messages', requireRoles('farmer', 'consumer', 'delivery'), async (req, res) => {
  try {
    const { contactId } = req.query
    const parsedUser = req.auth.id
    const parsedContact = contactId ? Number(contactId) : null
    if (parsedContact !== null && (!Number.isInteger(parsedContact) || parsedContact <= 0)) {
      return res.status(400).json({ message: 'A valid contactId is required.' })
    }
    const messages = parsedContact
      ? await all(
          `SELECT * FROM messages
           WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
           ORDER BY created_at DESC`,
          [parsedUser, parsedContact, parsedContact, parsedUser]
        )
      : await all(
          'SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at DESC',
          [parsedUser, parsedUser]
        )

    res.json({ messages })
  } catch (error) {
    console.error('Messages fetch error:', error)
    res.status(500).json({ message: 'Unable to fetch messages right now.' })
  }
})

app.post('/api/messages', requireRoles('farmer', 'consumer', 'delivery'), async (req, res) => {
  try {
    const { receiver_id, content, type = 'text' } = req.body || {}
    const recipientId = Number(receiver_id)
    const normalizedContent = typeof content === 'string' ? content.trim() : ''
    if (!Number.isInteger(recipientId) || recipientId <= 0 || !normalizedContent || normalizedContent.length > 4000 || !['text', 'callback_request'].includes(type)) {
      return res.status(400).json({ message: 'A valid recipient and message of up to 4000 characters are required.' })
    }

    const recipient = await get('SELECT id, role, name FROM users WHERE id = ?', [recipientId])
    if (!recipient || recipient.id === req.auth.id) return res.status(404).json({ message: 'Chat contact not found.' })
    let allowedContact = false
    if (req.auth.role === 'farmer' && recipient.role === 'delivery') allowedContact = true
    else if (req.auth.role === 'farmer' && recipient.role === 'consumer') {
      allowedContact = Boolean(await get('SELECT id FROM orders WHERE farmer_id = ? AND consumer_id = ? LIMIT 1', [req.auth.id, recipientId]))
    } else if (req.auth.role === 'consumer' && ['farmer', 'delivery'].includes(recipient.role)) {
      allowedContact = Boolean(await get('SELECT id FROM orders WHERE consumer_id = ? AND (farmer_id = ? OR delivery_agent_id = ?) LIMIT 1', [req.auth.id, recipientId, recipientId]))
    } else if (req.auth.role === 'delivery' && ['farmer', 'consumer'].includes(recipient.role)) {
      const participantColumn = recipient.role === 'farmer' ? 'farmer_id' : 'consumer_id'
      allowedContact = Boolean(await get(`SELECT id FROM orders WHERE delivery_agent_id = ? AND ${participantColumn} = ? LIMIT 1`, [req.auth.id, recipientId]))
    }
    if (!allowedContact) return res.status(403).json({ message: 'You cannot message this account.' })

    const insertResult = await run(
      `INSERT INTO messages (sender_id, sender_name, receiver_id, receiver_name, content, type) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.auth.id, req.auth.name, recipientId, recipient.name, normalizedContent, type]
    )

    const createdMessage = await get('SELECT * FROM messages WHERE id = ?', [insertResult.id])
    if (global.io) {
      try {
        global.io.to(`user_${req.auth.id}`).emit('new_message', createdMessage)
        if (req.auth.id !== recipientId) {
          global.io.to(`user_${recipientId}`).emit('new_message', createdMessage)
        }
      } catch (e) {
        console.warn('Socket emit failed:', e)
      }
    }

    res.status(201).json({ message: 'Message sent successfully.', data: createdMessage })
  } catch (error) {
    console.error('Message send error:', error)
    res.status(500).json({ message: 'Unable to send message right now.' })
  }
})

app.put('/api/messages/:id/read', requireRoles('farmer', 'consumer', 'delivery'), async (req, res) => {
  try {
    const { id } = req.params
    const updateResult = await run('UPDATE messages SET read = 1 WHERE id = ? AND receiver_id = ?', [id, req.auth.id])

    if (updateResult.changes === 0) {
      return res.status(404).json({ message: 'Message not found.' })
    }

    res.json({ message: 'Message marked as read.' })
    // Notify participants via socket
    try {
      const msg = await get('SELECT * FROM messages WHERE id = ?', [id])
      if (global.io && msg) {
        global.io.to(`user_${msg.sender_id}`).emit('message_read', { id: Number(id) })
        global.io.to(`user_${msg.receiver_id}`).emit('message_read', { id: Number(id) })
      }
    } catch (e) {
      console.warn('Socket notify read failed:', e)
    }
  } catch (error) {
    console.error('Message read update error:', error)
    res.status(500).json({ message: 'Unable to update message read status right now.' })
  }
})

await initializeDatabase()
await exportCertificateImages()

// Create HTTP server and attach Socket.IO
const httpServer = http.createServer(app)
const io = new IOServer(httpServer, { cors: { origin: '*' } })

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (typeof token !== 'string') return next(new Error('Authentication required.'))
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return next(new Error('Invalid session.'))

    const expectedSignature = crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(payload).digest()
    const receivedSignature = Buffer.from(signature, 'base64url')
    if (receivedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(receivedSignature, expectedSignature)) {
      return next(new Error('Invalid session.'))
    }

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!Number.isInteger(Number(claims.id)) || Number(claims.exp) <= Date.now()) return next(new Error('Session expired.'))
    const user = await get('SELECT id, role, account_status FROM users WHERE id = ?', [claims.id])
    if (!user || user.account_status === 'suspended') return next(new Error('Account unavailable.'))
    socket.data.auth = { id: Number(user.id), role: user.role }
    next()
  } catch (error) {
    next(new Error('Invalid session.'))
  }
})

io.on('connection', (socket) => {
  try {
    socket.join(`user_${socket.data.auth.id}`)
    socket.join(`role_${socket.data.auth.role}`)
  } catch (e) {}
})

// Expose io globally so routes can emit events
global.io = io

httpServer.listen(PORT, () => {
  console.log(`FarmDirect auth server listening on http://localhost:${PORT}`)
  console.log(`Default admin account configured: ${DEFAULT_ADMIN.email}`)
})
