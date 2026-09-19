/**
 * Application data store — starts empty.
 * Connect to Flask API or populate these arrays as you build your backend.
 */
import type {
  Product,
  Order,
  Review,
  Conversation,
  Message,
  Certificate,
  Notification,
  FarmerMarker,
  ChartDataPoint,
} from '@/types'

export interface Category {
  id: string
  name: string
  icon: string
  count: number
}

export interface FarmerRecord {
  id: string
  name: string
  farm: string
  email: string
  phone: string
  status: string
  orders: number
  revenue: number
  rating: number
  verified: boolean
  joined: string
  location: string
}

export interface ConsumerRecord {
  id: string
  name: string
  email: string
  phone: string
  orders: number
  spent: number
  joined: string
  location: string
}

export interface DeliveryAgentRecord {
  id: string
  name: string
  email: string
  phone: string
  status: string
  available: boolean
  deliveries: number
  rating: number
  earnings: number
  joined: string
}

export interface ActivityRecord {
  id: string
  action: string
  user: string
  time: string
  type: 'success' | 'warning' | 'info'
}

/** Empty collections — add your data here or via API */
export const products: Product[] = []
export const orders: Order[] = []
export const reviews: Review[] = []
export const conversations: Conversation[] = []
export const messages: Message[] = []
export const certificates: Certificate[] = []
export const notifications: Notification[] = []
export const categories: Category[] = []
export const farmerMarkers: FarmerMarker[] = [
  { id: 'fm-1', name: 'Green Valley Farms', lat: 12.9716, lng: 77.5946, rating: 4.8, verified: true },
  { id: 'fm-2', name: 'Sree Krishna Farm', lat: 12.9804, lng: 77.5818, rating: 4.6, verified: true },
  { id: 'fm-3', name: 'Karnataka Harvest Hub', lat: 12.9654, lng: 77.6069, rating: 4.9, verified: true },
  { id: 'fm-4', name: 'Riverfield Produce', lat: 12.9558, lng: 77.6154, rating: 4.5, verified: false },
]
export const farmers: FarmerRecord[] = []
export const consumers: ConsumerRecord[] = []
export const deliveryAgents: DeliveryAgentRecord[] = []
export const deliveryAgentMarkers: FarmerMarker[] = [
  { id: 'da-1', name: 'RapidRoute Delivery', lat: 12.9789, lng: 77.5882, rating: 4.7, verified: true },
  { id: 'da-2', name: 'Metro Fresh Logistics', lat: 12.9665, lng: 77.6022, rating: 4.4, verified: true },
]
export const marketTrends: ChartDataPoint[] = []
export const revenueData: ChartDataPoint[] = []
export const userGrowthData: ChartDataPoint[] = []
export const adminRecentActivity: ActivityRecord[] = []

/** Derived helpers */
export const deliveryOrders = orders.filter((o) => o.deliveryAgentId || o.status === 'accepted')
