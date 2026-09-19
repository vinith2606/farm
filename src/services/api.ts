import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmdirect_token')
  if (token) {
    const headers = config.headers as Record<string, string> | undefined
    config.headers = {
      ...headers,
      Authorization: `Bearer ${token}`,
    } as any
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.warn('[API]', error.message)
    return Promise.reject(error)
  }
)

export default api

export const endpoints = {
  auth: { login: '/auth/login', register: '/auth/register', logout: '/auth/logout' },
  products: { list: '/products', detail: (id: string) => `/products/${id}`, create: '/products' },
  orders: { list: '/orders', detail: (id: string) => `/orders/${id}`, update: (id: string) => `/orders/${id}` },
  farmers: { list: '/farmers', detail: (id: string) => `/farmers/${id}` },
  users: { profile: (id: string) => `/users/${id}/profile` },
  certificates: { list: '/certificates', upload: '/certificates', review: (id: string) => `/certificates/${id}/status` },
  messages: { list: '/messages', send: '/messages', markRead: (id: string) => `/messages/${id}/read` },
  chat: { contacts: '/chat/contacts' },
  reviews: { list: '/reviews', create: '/reviews' },
  admin: { stats: '/admin/stats', users: '/admin/users' },
  delivery: { orders: '/delivery/orders', updateStatus: (id: string) => `/delivery/orders/${id}/status` },
} as const
