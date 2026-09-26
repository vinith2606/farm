import { createBrowserRouter, Navigate } from 'react-router-dom'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

/* Farmer */
import FarmerDashboard from '@/pages/farmer/Dashboard'
import FarmerProducts from '@/pages/farmer/Products'
import FarmerOrders from '@/pages/farmer/Orders'
import FarmerOrderStatus from '@/pages/farmer/OrderStatus'
import FarmerDelivery from '@/pages/farmer/Delivery'
import FarmerCertificate from '@/pages/farmer/Certificate'
import FarmerMessages from '@/pages/farmer/Messages'
import FarmerProfile from '@/pages/farmer/ProfileHub'
import FarmerProfileEdit from '@/pages/shared/ProfilePage'
import FarmerAddress from '@/pages/farmer/Address'
import FarmerCertification from '@/pages/farmer/Certification'
import FarmerAnalytics from '@/pages/farmer/Analytics'

/* Consumer */
import ConsumerHome from '@/pages/consumer/Home'
import ConsumerSearch from '@/pages/consumer/Search'
import ConsumerMap from '@/pages/consumer/Map'
import ConsumerCart from '@/pages/consumer/Cart'
import ConsumerWishlist from '@/pages/consumer/Wishlist'
import ConsumerOrders from '@/pages/consumer/Orders'
import ConsumerOrderDetail from '@/pages/consumer/OrderDetail'
import ConsumerMessages from '@/pages/consumer/Messages'
import ProductDetail from '@/pages/consumer/ProductDetail'
import FarmerProfileView from '@/pages/consumer/FarmerProfileView'
import ConsumerProfile from '@/pages/consumer/ProfileHub'
import ConsumerProfileEdit from '@/pages/consumer/ConsumerProfile'
import ConsumerAddress from '@/pages/consumer/Address'
import DeliveryPartnerView from '@/pages/consumer/DeliveryPartnerView'

/* Delivery */
import DeliveryDashboard from '@/pages/delivery/Dashboard'
import DeliveryOrders from '@/pages/delivery/Orders'
import DeliveryOrderDetail from '@/pages/delivery/OrderDetail'
import DeliveryMap from '@/pages/delivery/Map'
import DeliveryMessages from '@/pages/delivery/Messages'
import DeliveryHistory from '@/pages/delivery/History'
import DeliveryEarnings from '@/pages/delivery/Earnings'
import DeliveryProfile from '@/pages/delivery/ProfileHub'
import DeliveryProfileEdit from '@/pages/delivery/ProfileEdit'
import DeliveryVehicle from '@/pages/delivery/Vehicle'
import DeliveryAddress from '@/pages/delivery/Address'
import DeliveryReviews from '@/pages/delivery/Reviews'

/* Admin */
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminFarmers from '@/pages/admin/Farmers'
import AdminFarmerDetail from '@/pages/admin/FarmerDetail'
import AdminConsumers from '@/pages/admin/Consumers'
import AdminConsumerDetail from '@/pages/admin/ConsumerDetail'
import AdminAgents from '@/pages/admin/Agents'
import AdminAgentDetail from '@/pages/admin/AgentDetail'
import AdminProducts from '@/pages/admin/Products'
import AdminProductDetail from '@/pages/admin/ProductDetail'
import AdminOrderDetail from '@/pages/admin/OrderDetail'
import { AdminOrders, AdminReports } from '@/pages/admin/ManagePages'
import AdminComplaints from '@/pages/admin/Complaints'
import HelpSupport from '@/pages/shared/HelpSupport'

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login/:role', element: <Login /> },
  { path: '/signup/:role', element: <Login /> },

  /* Farmer routes */
  {
    path: '/farmer',
    element: <DashboardLayout showSearch={false} />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <FarmerDashboard /> },
      { path: 'products', element: <FarmerProducts /> },
      { path: 'orders', element: <FarmerOrders /> },
      { path: 'orders/:status', element: <FarmerOrderStatus /> },
      { path: 'delivery', element: <FarmerDelivery /> },
      { path: 'analytics', element: <FarmerAnalytics /> },
      { path: 'certificate', element: <FarmerCertificate /> },
      { path: 'messages', element: <FarmerMessages /> },
      { path: 'profile', element: <FarmerProfile /> },
      { path: 'profile/edit', element: <FarmerProfileEdit role="farmer" /> },
      { path: 'profile/address', element: <FarmerAddress /> },
      { path: 'profile/certification', element: <FarmerCertification /> },
      { path: 'help', element: <HelpSupport role="farmer" /> },
    ],
  },

  /* Consumer routes */
  {
    path: '/consumer',
    element: <DashboardLayout showSearch={false} />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <ConsumerHome /> },
      { path: 'search', element: <ConsumerSearch /> },
      { path: 'map', element: <ConsumerMap /> },
      { path: 'cart', element: <ConsumerCart /> },
      { path: 'wishlist', element: <ConsumerWishlist /> },
      { path: 'checkout', element: <ConsumerCart /> },
      { path: 'orders', element: <ConsumerOrders /> },
      { path: 'orders/:id', element: <ConsumerOrderDetail /> },
      { path: 'messages', element: <ConsumerMessages /> },
      { path: 'product/:id', element: <ProductDetail /> },
      { path: 'farmer/:id', element: <FarmerProfileView /> },
      { path: 'profile', element: <ConsumerProfile /> },
      { path: 'profile/edit', element: <ConsumerProfileEdit /> },
      { path: 'profile/address', element: <ConsumerAddress /> },
      { path: 'delivery/:id', element: <DeliveryPartnerView /> },
      { path: 'help', element: <HelpSupport role="consumer" /> },
    ],
  },

  /* Delivery routes */
  {
    path: '/delivery',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DeliveryDashboard /> },
      { path: 'orders', element: <DeliveryOrders /> },
      { path: 'orders/:id', element: <DeliveryOrderDetail /> },
      { path: 'messages', element: <DeliveryMessages /> },
      { path: 'map', element: <DeliveryMap /> },
      { path: 'history', element: <DeliveryHistory /> },
      { path: 'earnings', element: <DeliveryEarnings /> },
      { path: 'profile', element: <DeliveryProfile /> },
      { path: 'profile/edit', element: <DeliveryProfileEdit /> },
      { path: 'profile/vehicle', element: <DeliveryVehicle /> },
      { path: 'profile/address', element: <DeliveryAddress /> },
      { path: 'profile/reviews', element: <DeliveryReviews /> },
      { path: 'help', element: <HelpSupport role="delivery" /> },
    ],
  },

  /* Admin routes */
  {
    path: '/admin',
    element: <DashboardLayout showChat={false} />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'farmers', element: <AdminFarmers /> },
      { path: 'farmers/:id', element: <AdminFarmerDetail /> },
      { path: 'consumers', element: <AdminConsumers /> },
      { path: 'consumers/:id', element: <AdminConsumerDetail /> },
      { path: 'agents', element: <AdminAgents /> },
      { path: 'agents/:id', element: <AdminAgentDetail /> },
      { path: 'products', element: <AdminProducts /> },
      { path: 'products/:id', element: <AdminProductDetail /> },
      { path: 'orders', element: <AdminOrders /> },
      { path: 'orders/:id', element: <AdminOrderDetail /> },
      { path: 'reports', element: <AdminReports /> },
      { path: 'complaints', element: <AdminComplaints /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
