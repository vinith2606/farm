import type { Order, OrderItem } from '@/types'

export function normalizeOrder(raw: any): Order {
  return {
    id: String(raw.id),
    consumerId: String(raw.consumer_id ?? raw.consumerId ?? ''),
    consumerName: raw.consumer_name ?? raw.consumerName ?? '',
    farmerId: String(raw.farmer_id ?? raw.farmerId ?? ''),
    farmerName: raw.farmer_name ?? raw.farmerName ?? '',
    deliveryAgentId: raw.delivery_agent_id ? String(raw.delivery_agent_id) : raw.deliveryAgentId ? String(raw.deliveryAgentId) : undefined,
    deliveryAgentName: raw.delivery_agent_name ?? raw.deliveryAgentName ?? undefined,
    items: Array.isArray(raw.items) ? raw.items.map(normalizeOrderItem) : [],
    total: Number(raw.total ?? 0),
    status: raw.status ?? 'pending',
    paymentStatus: raw.payment_status ?? raw.paymentStatus ?? 'pending',
    paymentMethod: raw.payment_method ?? raw.paymentMethod ?? undefined,
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
    address: raw.address ?? '',
    farmerPhone: raw.farmer_phone ?? '',
    pickupAddress: raw.pickup_address ?? '',
    farmerLat: raw.farmer_lat ?? null,
    farmerLng: raw.farmer_lng ?? null,
    consumerPhone: raw.consumer_phone ?? '',
    deliveryAddress: raw.delivery_address ?? raw.address ?? '',
    consumerLat: raw.consumer_lat ?? null,
    consumerLng: raw.consumer_lng ?? null,
    pickupParcelPhoto: raw.pickup_parcel_photo ?? raw.pickupParcelPhoto ?? undefined,
    deliveryParcelPhoto: raw.delivery_parcel_photo ?? raw.deliveryParcelPhoto ?? undefined,
    expectedDeliveryAt: raw.expected_delivery_at ?? raw.expectedDeliveryAt ?? undefined,
  }
}

export function normalizeOrderItem(raw: any): OrderItem {
  return {
    productId: String(raw.product_id ?? raw.productId ?? ''),
    productName: raw.product_name ?? raw.productName ?? '',
    quantity: Number(raw.quantity ?? 0),
    price: Number(raw.price ?? 0),
    image: raw.image ?? '',
  }
}

export function normalizeOrders(rawOrders: any[]): Order[] {
  return rawOrders.map(normalizeOrder)
}
