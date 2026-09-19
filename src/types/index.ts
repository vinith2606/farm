export type UserRole = 'farmer' | 'consumer' | 'delivery' | 'admin'

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export type CertificateStatus = 'pending' | 'verified' | 'rejected' | 'expired'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  avatar?: string
  location?: Location
  rating?: number
  verified?: boolean
  available?: boolean
}

export interface Location {
  lat: number
  lng: number
  address: string
  city: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  recommendedPrice?: number
  image: string
  category: string
  farmerId: string
  farmerName: string
  harvestDate: string
  quantity: number
  unit: string
  available: boolean
  verified: boolean
  rating: number
  reviewCount: number
  farmerLat?: number
  farmerLng?: number
  farmerPhone?: string
  farmName?: string
  farmerAddress?: string
  farmerCity?: string
  certificateStatus?: 'verified' | 'pending' | 'rejected' | 'expired'
}

export interface Order {
  id: string
  consumerId: string
  consumerName: string
  farmerId: string
  farmerName: string
  deliveryAgentId?: string
  deliveryAgentName?: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentMethod?: string
  createdAt: string
  updatedAt: string
  address: string
  farmerPhone?: string
  pickupAddress?: string
  farmerLat?: number | null
  farmerLng?: number | null
  consumerPhone?: string
  deliveryAddress?: string
  consumerLat?: number | null
  consumerLng?: number | null
  pickupParcelPhoto?: string
  deliveryParcelPhoto?: string
  expectedDeliveryAt?: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  image: string
}

export interface Review {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  productId?: string
  farmerId?: string
  rating: number
  comment: string
  createdAt: string
  reply?: string
}

export interface Message {
  id: string
  senderId: string
  senderName: string
  receiverId: string
  content: string
  timestamp: string
  read: boolean
  type: 'text' | 'callback_request'
}

export interface Conversation {
  id: string
  participantId: string
  participantName: string
  participantAvatar?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  online: boolean
}

export interface Certificate {
  id: string
  farmerId: string
  farmerName: string
  type: string
  documentUrl: string
  status: CertificateStatus
  uploadedAt: string
  verifiedAt?: string
  ocrResult?: string
  expiryDate?: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface FarmerStats {
  todayOrders: number
  revenue: number
  products: number
  rating: number
  certificateStatus: CertificateStatus
  available: boolean
}

export interface DeliveryStats {
  assignedOrders: number
  todayEarnings: number
  completedDeliveries: number
  available: boolean
}

export interface AdminStats {
  totalUsers: number
  totalOrders: number
  revenue: number
  activeFarmers: number
  pendingCertificates: number
  deliveryAgents: number
}

export interface NavItem {
  key: string
  path: string
  icon: string
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface FarmerMarker {
  id: string
  name: string
  lat: number
  lng: number
  rating: number
  verified: boolean
  distance?: number
  phone?: string
  deliveryStatus?: string
}
