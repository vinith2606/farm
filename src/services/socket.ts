import { io, Socket } from 'socket.io-client'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '')
const SOCKET_BASE = API_BASE_URL.replace(/\/api$/, '')

let socket: Socket | null = null

export function initSocket(userId?: string | number) {
  if (socket) return socket
  socket = io(SOCKET_BASE, { autoConnect: false })
  if (userId) {
    socket.on('connect', () => {
      socket?.emit('join', String(userId))
    })
  }
  socket.connect()
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  try {
    socket?.disconnect()
  } catch (e) {}
  socket = null
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
}
