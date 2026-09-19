
# FarmDirect

FarmDirect is a full-stack farm-to-table marketplace that connects farmers, consumers, delivery partners, and administrators. Farmers list produce and manage orders, consumers shop and track deliveries, delivery partners manage fulfilment, and admins operate the platform from a live management console.

![FarmDirect](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

## Highlights

- React 19 SPA with TypeScript and Vite
- Express.js backend with SQLite persistence
- Four role-based experiences: Farmer, Consumer, Delivery Partner, and Admin
- Live product, order, user, address, review, complaint, and certificate APIs
- Real-time order and messaging updates with Socket.IO
- Interactive Leaflet/OpenStreetMap maps with multiple backend-driven markers
- Responsive dark and light themes
- Multilingual interface with English and Indian language locale files
- Product price analysis for any farmer-entered product name
- Order-linked ratings and reviews for farmers and delivery partners
- Optional parcel photo proof during pickup and delivery

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React , TypeScript, |
| Styling | Tailwind CSS 4, CSS theme variables |
| Routing | React Router 7 |
| API client | Axios |
| Backend | Node.js, Express 5 |
| Database | SQLite3 |
| Real-time | Socket.IO |
| Maps |  OpenStreetMap |
| Charts and motion | Recharts, Framer Motion |
| Icons | Lucide React |


## Requirements

- Node.js 18 or newer
- npm
- A modern browser

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables on Windows
copy .env.example .env

# Start development server
npm run dev:all

# Production build
npm run build

# Preview production build
npm run preview
```

The frontend runs at `http://localhost:4173` and the API runs at `http://localhost:3001`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run dev:server` | Start the Express and SQLite API server |
| `npm run dev:all` | Start frontend and backend concurrently |
| `npm run build` | Type-check and create a production Vite build |
| `npm run lint` | Run TypeScript without emitting files |
| `npm run preview` | Preview the production build |

## Default Admin

On first backend startup, a default admin account is created if one does not exist:

```text
Email: admin@farmdirect.local
Password: admin123
```

Override these values with `ADMIN_EMAIL` and `ADMIN_PASSWORD` before starting the server. Change default credentials before production deployment.

## Role Features

### Farmer

- Dashboard with orders, products, certificate status, and farming insights
- Add, edit, remove, and availability-toggle products
- Price recommendation for any product name
- Order workflow from pending through completed or cancelled
- Profile hub with edit profile, complete farm address, certification, orders, Help & Support, and logout
- Consumer and delivery-partner message sections
- Rate delivery partners after completed orders

### Consumer

- Browse and search farmer products
- View farmer and delivery-partner profiles
- Cart and checkout workflow
- Multiple saved delivery addresses with default-address selection
- Order history and order tracking
- Rate products, farmers, and delivery partners on completed orders
- Profile hub with edit profile, addresses, orders, Help & Support, and logout
- Farmer and delivery-partner message sections

### Delivery Partner

- Dashboard for assigned, active, and completed deliveries
- New delivery requests and status updates
- Pickup and delivery navigation using saved order coordinates
- Optional parcel photo upload at pickup and delivery
- Delivery history and earnings history
- Profile hub with personal details, vehicle and licence, address, history, earnings, ratings, Help & Support, and logout
- Farmer and consumer message sections

### Admin

- Dashboard with live platform statistics
- Farmer management and certificate approval/rejection
- Consumer management and account suspension/activation
- Delivery-partner management and document verification
- Product management with product details and removal
- Order management with product, payment, order, and delivery information
- Reports and analytics
- Complaints and Help & Support submissions

## Routes

Public: `/`, `/login/:role`, `/signup/:role`

Farmer: `/farmer/dashboard`, `/farmer/products`, `/farmer/orders`, `/farmer/orders/:status`, `/farmer/delivery`, `/farmer/certificate`, `/farmer/messages`, `/farmer/profile`, `/farmer/profile/edit`, `/farmer/profile/address`, `/farmer/profile/certification`, `/farmer/help`

Consumer: `/consumer/home`, `/consumer/search`, `/consumer/map`, `/consumer/cart`, `/consumer/checkout`, `/consumer/orders`, `/consumer/orders/:id`, `/consumer/messages`, `/consumer/product/:id`, `/consumer/farmer/:id`, `/consumer/delivery/:id`, `/consumer/profile`, `/consumer/profile/edit`, `/consumer/profile/address`, `/consumer/help`

Delivery: `/delivery/dashboard`, `/delivery/orders`, `/delivery/orders/:id`, `/delivery/map`, `/delivery/history`, `/delivery/earnings`, `/delivery/messages`, `/delivery/profile`, `/delivery/profile/edit`, `/delivery/profile/vehicle`, `/delivery/profile/address`, `/delivery/profile/reviews`, `/delivery/help`

Admin: `/admin/dashboard`, `/admin/farmers`, `/admin/farmers/:id`, `/admin/consumers`, `/admin/consumers/:id`, `/admin/agents`, `/admin/agents/:id`, `/admin/certificates`, `/admin/products`, `/admin/products/:id`, `/admin/orders`, `/admin/orders/:id`, `/admin/reports`, `/admin/complaints`

## Backend API

The API is mounted under `/api`.

Authentication: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`

Users and addresses: `GET /users/:id`, `PUT /users/:id/profile`, `GET /users/:id/addresses`, `POST /users/:id/addresses`, `DELETE /users/:userId/addresses/:addressId`, `GET /admin/users`, `PUT /admin/users/:id/status`

Products: `GET /products`, `GET /products/:id`, `GET /products/farmer/:farmerId`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`

Orders: `GET /orders?userId=:id&role=:role`, `POST /orders`, `PUT /orders/:id/status`

Reviews: `GET /reviews?productId=:id`, `GET /reviews?targetType=farmer|delivery&targetId=:id`, `POST /reviews`

Certificates and delivery: `GET /certificates`, `POST /certificates`, `PUT /certificates/:id/status`, `PUT /admin/delivery-partners/:id/verification`, `GET /delivery/nearby`

Messages and support: `GET /chat/contacts`, `GET /messages`, `POST /messages`, `PUT /messages/:id/read`, `POST /complaints`, `GET /admin/complaints`

Administration: `GET /admin/stats`, `GET /health`

## Database

The backend creates and migrates `server/farmdirect.sqlite` on startup. Main tables are `users`, `products`, `orders`, `order_items`, `messages`, `certificates`, `reviews`, `delivery_addresses`, and `complaints`. Newer columns for complete addresses, review targets, delivery coordinates, parcel photos, and account verification are added automatically.

## Maps

Maps use Leaflet and OpenStreetMap tiles. Consumer Map displays all farmers, and Farmer Delivery Map displays all delivery partners. Stored coordinates are used first; saved addresses are geocoded only when coordinates are unavailable. Delivery navigation uses exact coordinates saved with the order.

## Price Analysis

Price recommendations use deterministic local analysis and do not require an API key. Common crops use bounded market baselines; unknown products use their stored database price. The model applies seasonal factors, a bounded long-term adjustment, and k-means clustering across 10 years of monthly observations. It is an analysis aid, not a guaranteed market quote.

## Project Structure

```
src/
├── components/
│   ├── cards/        # ProductCard, OrderCard, RatingCard
│   ├── common/       # SearchBar, MapView, LanguageSelector, Breadcrumb
│   ├── layout/       # Sidebar, Navbar, DashboardLayout, BottomNav
│   └── ui/           # Button, Card, Input, Modal, Badge, Skeleton
├── context/          # Auth, Cart, Theme, Toast providers
├── data/mock/        # Legacy re-exports → use data/index.ts
├── data/index.ts     # Static and compatibility data
├── i18n/locales/     # 10 language translation files
├── pages/
│   ├── farmer/       # Farmer operations and account pages
│   ├── consumer/     # Consumer shopping and account pages
│   ├── delivery/     # Delivery operations and account pages
│   └── admin/        # Administrative pages
├── routes/           # React Router config
├── services/         # Axios and Socket.IO API clients
├── types/            # TypeScript interfaces
└── utils/            # Helpers (cn, formatCurrency, etc.)
```

## Production Notes

- Use strong admin credentials in production.
- Add authorization middleware around administrative endpoints before public deployment.
- Configure HTTPS, rate limits, upload limits, and managed storage for multi-instance deployments.
- Run `npm audit` and review dependency advisories before release.

## License

MIT
