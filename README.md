
# FarmDirect

FarmDirect is a full-stack agriculture marketplace that connects farmers, consumers, delivery partners, and admins in a role-based e-commerce platform. It allows farmers to list produce, consumers to buy locally, delivery partners to fulfil orders, and admins to monitor and manage the platform.

## Project Overview

This app is built to simulate a real agricultural commerce workflow across multiple user roles. The system combines product catalog management, order lifecycle tracking, messaging, maps, profile handling, certifications, payment state, and platform administration in one interface.

## Main Features

- Farmer product listing and inventory management
- Consumer browsing, cart, checkout, and order tracking
- Delivery partner order assignment and status updates
- Admin dashboard for users, complaints, orders, products, and reports
- Map-based farmer and delivery discovery
- Real-time messaging through Socket.IO
- Role-based profile management and account state
- Multi-language support with translation files
- Certification workflow for farmers
- Ratings and reviews for products, farmers, and delivery partners

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express
- Database: SQLite
- Real-time updates: Socket.IO
- Routing: React Router
- Styling: Tailwind CSS
- Maps: Leaflet + OpenStreetMap
- HTTP client: Axios
- Icons: Lucide and React Icons
- State and UI helpers: React hooks, context providers, utility functions

## Architecture

The application is divided into two main parts:

1. Frontend application in src/
2. Backend server in server/

The frontend handles all pages and user interactions. The backend manages the database, API endpoints, authentication, and real-time communication.

### Frontend flow

The React app is organized by role and feature area:

- src/pages/farmer/
- src/pages/consumer/
- src/pages/delivery/
- src/pages/admin/

Shared state is managed mainly through context in:

- src/context/AppContext.tsx
- src/context/ThemeContext.tsx
- src/context/ToastContext.tsx

These contexts keep the current user, theme, notifications, and profile details available across the app.

### Backend flow

The Express server in server/index.js is responsible for:

- user registration and login
- database setup and migrations
- products CRUD operations
- order creation and updates
- delivery coordination
- chat and contact APIs
- admin moderation and reporting
- certificate verification
- Socket.IO event broadcasting

## How the App Works

### Farmer workflow

- Farmer logs in to the dashboard
- Adds and updates products
- Sets availability, product categories, pricing, and metadata
- Views incoming orders
- Updates order progress and fulfillment status
- Completes profile and certification details
- Communicates with consumers and delivery partners

### Consumer workflow

- Consumer browses products and farmer profiles
- Searches products by name or category
- Adds products to cart
- Places an order with delivery details
- Tracks order progress
- Reviews products and sellers after delivery
- Uses saved addresses and map-based farmer discovery

### Delivery partner workflow

- Delivery partner logs in and views active deliveries
- Accepts or updates assigned order status
- Tracks pickup and drop-off location
- Reviews earnings and order history
- Manages profile, vehicle information, and delivery records

### Admin workflow

- Admin monitors platform activity
- Reviews farmer certification applications
- Manages users and verification states
- Handles complaints and support requests
- Checks product and order records
- Tracks analytics and reports

## Folder Structure

```text
farm/
├── index.html
├── package.json
├── README.md
├── tsconfig.json
├── vite.config.ts
├── public/
├── server/
│   ├── index.js
│   └── certificates/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── assets/
│   ├── components/
│   │   ├── cards/
│   │   ├── common/
│   │   ├── layout/
│   │   └── ui/
│   ├── context/
│   │   ├── AppContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ToastContext.tsx
│   ├── data/
│   │   ├── index.ts
│   │   └── mock/
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/
│   ├── pages/
│   │   ├── admin/
│   │   ├── consumer/
│   │   ├── delivery/
│   │   ├── farmer/
│   │   └── shared/
│   ├── routes/
│   │   └── index.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── socket.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── cn.ts
│       ├── cropPricePrediction.ts
│       ├── locationService.ts
│       ├── orderService.ts
│       └── productService.ts
└── server/farmdirect.sqlite
```

## Important Files

### src/App.tsx
This is the main app entry and root UI wrapper. It provides the application shell and route integration.

### src/routes/index.tsx
Defines the role-based route structure for farmers, consumers, delivery partners, and admin users.

### src/context/AppContext.tsx
This is the central authentication and profile state file. It stores session information such as user role, details, address, avatar, and login state.

### src/services/api.ts
API client layer that handles HTTP requests to the backend and collects data for pages and profiles.

### src/services/socket.ts
Socket.IO client that connects the frontend to backend events for live updates such as chat and order changes.

### src/pages/
All user interface screens are here. Each folder is dedicated to a role and contains pages for dashboards, orders, profiles, messages, map views, and admin management.

### server/index.js
This is the core backend server. It creates the SQLite database, bootstraps tables, serves API routes, and defines the real-time server logic.

### src/utils/locationService.ts
Used for geolocation and location-related processing, such as checking proximity between users and farmers or delivery locations.

### src/utils/cropPricePrediction.ts
Responsible for yield and pricing support logic for crop-based price analysis.

## Routes

### Public routes
- /
- /login/:role
- /signup/:role

### Farmer routes
- /farmer/dashboard
- /farmer/products
- /farmer/orders
- /farmer/delivery
- /farmer/messages
- /farmer/profile
- /farmer/profile/address
- /farmer/profile/certification
- /farmer/help

### Consumer routes
- /consumer/home
- /consumer/search
- /consumer/map
- /consumer/cart
- /consumer/orders
- /consumer/messages
- /consumer/profile
- /consumer/profile/address
- /consumer/help

### Delivery routes
- /delivery/dashboard
- /delivery/orders
- /delivery/map
- /delivery/history
- /delivery/earnings
- /delivery/messages
- /delivery/profile
- /delivery/help

### Admin routes
- /admin/dashboard
- /admin/farmers
- /admin/consumers
- /admin/agents
- /admin/products
- /admin/orders
- /admin/reports
- /admin/complaints

## Backend API Summary

The backend exposes APIs under the /api base path.

### Authentication
- POST /auth/register
- POST /auth/login
- POST /auth/logout

### Users and profiles
- GET /users/:id
- PUT /users/:id/profile
- GET /users/:id/addresses
- POST /users/:id/addresses
- DELETE /users/:userId/addresses/:addressId

### Products
- GET /products
- GET /products/:id
- GET /products/farmer/:farmerId
- POST /products
- PUT /products/:id
- DELETE /products/:id

### Orders
- GET /orders
- POST /orders
- PUT /orders/:id/status

### Reviews
- GET /reviews
- POST /reviews

### Certificates and verification
- GET /certificates
- POST /certificates
- PUT /certificates/:id/status
- PUT /admin/delivery-partners/:id/verification

### Messaging and support
- GET /chat/contacts
- GET /messages
- POST /messages
- PUT /messages/:id/read
- POST /complaints
- GET /admin/complaints

### Admin statistics
- GET /admin/stats
- GET /health

## Database

The app uses SQLite and creates the database file at server/farmdirect.sqlite on startup.

Major tables include:

- users
- products
- orders
- order_items
- messages
- certificates
- reviews
- delivery_addresses
- complaints

This database stores essential operational data for user profiles, products, chats, ratings, delivery details, and admin moderation.

## Maps and Location Features

The app uses Leaflet and OpenStreetMap to display locations. Consumer pages can show nearby farmers based on radius and distance calculations, while delivery pages use saved coordinates for route and fulfillment management.

The location layer is important because the app depends on real user coordinates for:

- nearby farmer filtering
- delivery assignment
- order geo-location tracking
- map-based profile views

## Setup and Run

### Install dependencies

```bash
npm install
```

### Start frontend and backend together

```bash
npm run dev:all
```

This starts:

- Vite frontend at http://localhost:5173
- Express backend at http://localhost:3001

### Start frontend only

```bash
npm run dev
```

### Start backend only

```bash
npm run dev:server
```

### Build for production

```bash
npm run build
```

### Type check

```bash
npm run lint
```

### Preview production build

```bash
npm run preview
```

## Default Admin Account

When the backend starts for the first time, it creates a default admin record if one is missing:

```text
Email: admin@farmdirect.local
Password: admin123
```

It is recommended to change this before deploying the app to production.

## Project Notes

- The app is built as a demo/full-stack marketplace and is designed to feel realistic for agricultural commerce.
- Translation files are present for multiple Indian languages through the src/i18n/locales folder.
- The app supports both dark/light user themes and responsive dashboard layouts.
- Profile and order data are centralized and reloaded from backend state to maintain consistency across pages.

## Production Guidance

Before using this in a production environment:

- rotate or replace default admin credentials
- secure admin API routes
- review authentication and role checks
- use HTTPS and proper hosting
- consider a stronger database system for large-scale deployment
- back up SQLite data regularly

## License

MIT
