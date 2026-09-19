import { useState, useEffect, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Package, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, AvailabilityBadge } from '@/components/ui/Badge'
import { Modal, EmptyState } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatDate } from '@/utils/cn'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AppContext'
import api from '@/services/api'
import { normalizeProducts } from '@/utils/productService'
import { fetchCropPricePrediction, type CropPrediction } from '@/utils/cropPricePrediction'

type ProductForm = {
  name: string
  price: string
  quantity: string
  harvestDate: string
  description: string
  unit: string
  category: string
  available: boolean
  image: string
  priceMode: 'manual' | 'recommended'
}

const emptyForm: ProductForm = {
  name: '', price: '', quantity: '', harvestDate: '', description: '', unit: 'kg',
  category: 'Fresh Produce', available: true, image: '', priceMode: 'manual',
}

export default function FarmerProducts() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { userName, userId } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [productList, setProductList] = useState<any[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [recommendation, setRecommendation] = useState<CropPrediction | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)

  const recommendedPrice = recommendation?.error ? 0 : recommendation?.predictedPrice || 0

  const closeForm = () => {
    setShowAdd(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast('Product photo must be smaller than 4 MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, image: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    fetchProducts()
  }, [userId])

  useEffect(() => {
    const crop = form.name.trim()
    if (!crop) {
      setRecommendation(null)
      return
    }
    const timer = window.setTimeout(() => {
      setRecommendationLoading(true)
      fetchCropPricePrediction(crop).then(setRecommendation).catch((error: Error) => setRecommendation({ crop, currentPrice: 0, predictedPrice: 0, confidence: 0, change: 0, history: [], error: error.message })).finally(() => setRecommendationLoading(false))
    }, 400)
    return () => window.clearTimeout(timer)
  }, [form.name])

  const fetchProducts = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await api.get(`/products/farmer/${userId}`)
      setProductList(normalizeProducts(response.data.products || []))
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.quantity || (form.priceMode === 'manual' && !form.price) || (form.priceMode === 'recommended' && !recommendedPrice)) {
      toast('Name, price, and quantity are required', 'error')
      return
    }

    try {
      setLoading(true)
      const price = form.priceMode === 'recommended' ? recommendedPrice : Number(form.price)
      const payload = {
        farmer_id: Number(userId) || 1,
        farmer_name: userName,
        name: form.name.trim(),
        description: form.description,
        price,
        recommended_price: recommendedPrice || price,
        image: form.image,
        category: form.category,
        harvest_date: form.harvestDate,
        quantity: Number(form.quantity),
        unit: form.unit,
        available: form.available,
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, payload)
        toast('Product updated successfully', 'success')
      } else {
        await api.post('/products', payload)
        toast(t('toast.productAdded'), 'success')
      }
      closeForm()
      fetchProducts()
    } catch (error) {
      console.error('Failed to add product:', error)
      toast('Failed to add product', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEditProduct = (product: any) => {
    setEditingId(Number(product.id))
    setForm({
      name: product.name || '', price: String(product.price || ''), quantity: String(product.quantity || ''),
      harvestDate: product.harvestDate || '', description: product.description || '', unit: product.unit || 'kg',
      category: product.category || 'Fresh Produce', available: Boolean(product.available), image: product.image || '', priceMode: 'manual',
    })
    setShowAdd(true)
  }

  const handleDeleteProduct = async (productId: number) => {
    try {
      setLoading(true)
      await api.delete(`/products/${productId}`)
      toast('Product deleted successfully', 'success')
      fetchProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast('Failed to delete product', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.products')}</h1>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />{t('farmer.addProduct')}</Button>
      </div>

      {loading ? (
        <Card><p className="text-center py-8 text-muted">Loading products...</p></Card>
      ) : productList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={t('common.emptyState')}
            description="Add your first product to start selling on FarmDirect."
            action={{ label: t('farmer.addProduct'), onClick: () => setShowAdd(true) }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productList.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card hover padding="none" className="overflow-hidden">
                <div className="relative aspect-video bg-surface-elevated">
                  {product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" />}
                  {product.verified && <div className="absolute top-3 left-3"><Badge variant="verified">✓ Verified</Badge></div>}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xl font-bold text-primary">{formatCurrency(product.price)}</span>
                    {product.recommendedPrice != null && (
                      <span className="text-xs text-muted">Rec: {formatCurrency(product.recommendedPrice)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-sm text-muted">
                    <span>{t('farmer.harvestDate')}: {formatDate(product.harvestDate)}</span>
                    <span>{product.quantity} {product.unit}</span>
                  </div>
                  <div className="mt-3"><AvailabilityBadge available={product.available} /></div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditProduct(product)}><Edit className="w-4 h-4" />{t('common.edit')}</Button>
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 lg:bottom-8 right-6 w-14 h-14 rounded-full gradient-primary text-background shadow-lg shadow-primary/40 flex items-center justify-center z-30"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <Modal open={showAdd} onClose={closeForm} title={editingId ? 'Update product' : 'Upload product'} size="lg">
        <form className="space-y-4" onSubmit={handleAddProduct}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" placeholder="Tomatoes" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input label="Available quantity" type="number" min="0" placeholder="0" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} />
            <Input label="Harvest date" type="date" value={form.harvestDate} onChange={(e) => setForm((prev) => ({ ...prev, harvestDate: e.target.value }))} />
            <Input label="Unit" value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="kg, litre, bunch" />
            <label className="block text-sm font-medium text-foreground">
              Category
              <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="mt-1.5 w-full px-4 py-2.5 rounded-2xl border border-border bg-surface-elevated text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                <option value="None">None</option>
                <option value="Fruits">Fruits</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Grocery">Grocery</option>
                <option value="Grains">Grains</option>
                <option value="Pulses">Pulses</option>
                <option value="Spices">Spices</option>
                <option value="Dairy">Dairy</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2 rounded-2xl bg-surface-elevated p-1">
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, priceMode: 'manual' }))} className={`flex-1 rounded-xl px-3 py-2 text-sm ${form.priceMode === 'manual' ? 'bg-primary text-background' : 'text-muted'}`}>Manual price</button>
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, priceMode: 'recommended' }))} className={`flex-1 rounded-xl px-3 py-2 text-sm ${form.priceMode === 'recommended' ? 'bg-primary text-background' : 'text-muted'}`}><Sparkles className="inline w-4 h-4 mr-1" />Price recommendation</button>
          </div>
          {form.priceMode === 'manual' ? (
            <Input label="Price" type="number" min="0" step="0.01" placeholder="0" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
          ) : (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">{recommendationLoading ? 'Analyzing historical market patterns...' : recommendation?.error ? recommendation.error : <>Recommended price: <strong>{recommendedPrice ? `${formatCurrency(recommendedPrice)} / kg` : 'Enter a farming product name'}</strong></>}</div>
          )}
          <label className="block text-sm font-medium">Description
            <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="mt-1.5 w-full px-4 py-2.5 rounded-2xl border border-border bg-surface-elevated text-foreground" placeholder="Describe your product" />
          </label>
          <label className="block text-sm font-medium">Photo
            <input type="file" accept="image/*" onChange={handleImageChange} className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-background" />
          </label>
          {form.image && <img src={form.image} alt="Product preview" className="h-32 w-full rounded-2xl object-cover" />}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.available} onChange={(e) => setForm((prev) => ({ ...prev, available: e.target.checked }))} /> Available for sale</label>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={closeForm}>{t('common.cancel')}</Button>
            <Button type="submit" loading={loading}>{editingId ? 'Update' : 'Upload'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
