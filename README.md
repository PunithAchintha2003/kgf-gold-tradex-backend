# 🥇 KGF Gold TradeX — Backend

> REST API for the **KGF Gold TradeX** platform — authentication, catalog, checkout, auctions, merchant operations, admin tooling, and realtime features. Built with **Node.js**, **Express**, and **MongoDB**.

**Live API:** [https://kgf-gold-tradex-backend.onrender.com](https://kgf-gold-tradex-backend.onrender.com)

[![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-8.0-880000?logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![JWT](https://img.shields.io/badge/JWT-9.0-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Stripe](https://img.shields.io/badge/Stripe-17.7-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-2.10-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Helmet](https://img.shields.io/badge/Helmet-7.1-000000?logo=helmet&logoColor=white)](https://helmetjs.github.io/)
[![express-validator](https://img.shields.io/badge/express--validator-7.0-000000)](https://express-validator.github.io/)
[![API](https://img.shields.io/badge/API-v1-0EA5E9)](https://kgf-gold-tradex-backend.onrender.com/api/v1/health)
[![Live](https://img.shields.io/badge/Live-Render-46E3B7)](https://kgf-gold-tradex-backend.onrender.com)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

## 📑 Table of contents

- [About](#about)
- [Live deployment](#live-deployment)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Development](#development)
- [API reference](#api-reference)
- [Authentication](#authentication)
- [User roles](#user-roles)
- [Error responses](#error-responses)
- [Realtime](#realtime)
- [Project structure](#project-structure)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## 📖 About

This repository is the backend service for **KGF Gold TradeX**. It exposes a versioned REST API (`/api/v1`), integrates with **Stripe** for payments and **Cloudinary** for media, and uses **Socket.IO** for auction and notification realtime updates.

| Environment | Base URL |
|-------------|----------|
| 🌐 **Production** | `https://kgf-gold-tradex-backend.onrender.com` |
| 💻 **Local** | `http://localhost:5001` (default `PORT`) |

All JSON responses follow a consistent `{ success, data \| error }` shape unless noted otherwise.

## 🌐 Live deployment

Hosted on [Render](https://render.com).

| Endpoint | URL |
|----------|-----|
| **Base** | [https://kgf-gold-tradex-backend.onrender.com](https://kgf-gold-tradex-backend.onrender.com) |
| **Health** | `GET /health` |
| **API base** | `/api/v1` |
| **API health** | `GET /api/v1/health` |

```bash
curl https://kgf-gold-tradex-backend.onrender.com/api/v1/health
```

## ✨ Features

| Area | Capabilities |
|------|----------------|
| 🔐 **Auth** | Register, email verification (OTP), login verification, password reset, JWT access/refresh, HTTP-only refresh cookies, logout |
| 👤 **Users** | Profile read/update, credential change with OTP |
| 🛍️ **Catalog** | Public published products (search, pagination, categories), product detail, reviews |
| 💳 **Checkout** | Stripe cart sessions, payment verification, purchase order history |
| 🔨 **Auctions** | Public auction listings, bidding, merchant auction CRUD, scheduled close, winner chat handoff |
| 💬 **Chat** | User conversations and AI-assisted support chat |
| 🪞 **AR try-on** | Product AR config and session tracking |
| 🏪 **Merchant** | Dashboard, orders, delivery updates, product CRUD, image upload, data backup export |
| ⚙️ **Admin** | Dashboard, user CRUD, roles, merchant verification, platform backup export |
| 🌐 **Platform** | API versioning, validation, rate limiting, Helmet, CORS, compression, global error handling |
| 📡 **Realtime** | Socket.IO for live auction and notification events |

📈 Spot trading routes exist as a placeholder for future work.

## 🛠️ Tech stack

| Layer | Technology |
|-------|------------|
| 🟢 **Runtime** | Node.js 18+ (ES modules) |
| ⚡ **Framework** | Express.js |
| 🍃 **Database** | MongoDB, Mongoose |
| 🔐 **Auth** | `jsonwebtoken`, `bcryptjs`, `cookie-parser` |
| 💳 **Payments** | Stripe |
| 🖼️ **Media** | Cloudinary, Multer |
| 📧 **Email** | Nodemailer (verification OTP) |
| 📡 **Realtime** | Socket.IO |
| ✅ **Validation** | `express-validator` |
| 🛡️ **Security / ops** | Helmet, CORS, `express-rate-limit`, Morgan, compression |

## ⚡ Quick start

```bash
git clone <repository-url>
cd kgf-gold-tradex-backend
npm install
cp .env.example .env   # or create .env manually — see Configuration
# Set MONGODB_URI and JWT_SECRET in .env
npm run dev
```

| Check | Local URL |
|-------|-----------|
| 💚 Health | `http://localhost:5001/health` |
| 🌐 API base | `http://localhost:5001/api/v1` |
| 💚 API health | `http://localhost:5001/api/v1/health` |

Optional seeds (development only):

```bash
npm run seed:admin
npm run seed:merchant
npm run seed:auctions
```

## 📋 Prerequisites

- **Node.js** 18 or later
- **MongoDB** — [local](https://www.mongodb.com/try/download/community) or [MongoDB Atlas](https://www.mongodb.com/atlas)
- **npm** (or compatible package manager)

Optional integrations:

- [Stripe](https://stripe.com) — checkout
- [Cloudinary](https://cloudinary.com) — merchant product images
- Gmail (or SMTP) — email verification OTP

## 📦 Installation

### 1️⃣ Clone and install dependencies

```bash
git clone <repository-url>
cd kgf-gold-tradex-backend
npm install
```

### 2️⃣ Configure environment

Create a `.env` file in the project root. See [Configuration](#configuration) for the full variable list.

Minimum for local development:

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/kgf-gold-tradex
JWT_SECRET=your-long-random-secret
```

### 3️⃣ Seed roles (optional)

```bash
npm run seed:admin      # SUPER_ADMIN
npm run seed:merchant   # MERCHANT
npm run seed:auctions   # Sample auctions (optional)
```

Credentials are printed by each seed script. **Use seeds only in local development.**

### 4️⃣ Run the server

```bash
npm run dev
```

Default port is **5001**. If the port is in use, the process tries the next available port automatically.

## 🔐 Configuration

Copy the template below into `.env` and adjust values for your environment.

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/kgf-gold-tradex
JWT_SECRET=
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGIN=http://localhost:4000,http://localhost:5173
STRIPE_SECRET_KEY=
STOREFRONT_URL=http://localhost:4000
CLOUDINARY_URL=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Environment variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | `development` or `production` | `development` |
| `PORT` | No | HTTP port | `5001` |
| `MONGODB_URI` | Yes* | MongoDB connection string | `mongodb://localhost:27017/kgf-gold-tradex` |
| `JWT_SECRET` | Yes | Secret for signing access/refresh tokens | — |
| `JWT_ACCESS_TOKEN_EXPIRY` | No | Access token lifetime | `15m` |
| `JWT_REFRESH_TOKEN_EXPIRY` | No | Refresh token lifetime | `7d` |
| `CORS_ORIGIN` | No | Comma-separated allowed origins | Localhost ports (4000, 3000, 5173, …) |
| `RATE_LIMIT_WINDOW_MS` | No | Auth rate-limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max auth requests per window | `5` |
| `STRIPE_SECRET_KEY` | For checkout | Stripe secret key | — |
| `STOREFRONT_URL` | No | Redirect base after Stripe checkout | `http://localhost:4000` |
| `CLOUDINARY_URL` | For uploads† | Full Cloudinary URL | — |
| `CLOUDINARY_CLOUD_NAME` | For uploads† | Cloud name (if not using URL) | — |
| `CLOUDINARY_API_KEY` | For uploads† | API key | — |
| `CLOUDINARY_API_SECRET` | For uploads† | API secret | — |
| `SMTP_HOST` | For email verification | SMTP host | `smtp.gmail.com` |
| `SMTP_PORT` | No | SMTP port | `587` |
| `SMTP_USER` | For email verification | Sender address | — |
| `SMTP_PASS` | For email verification | App password (not account password) | — |
| `SMTP_FROM_NAME` | No | Display name in outgoing mail | `KGF Gold TradeX` |
| `EMAIL_VERIFICATION_EXPIRY_MINUTES` | No | OTP validity | `15` |
| `EMAIL_VERIFICATION_MAX_ATTEMPTS` | No | Max wrong OTP tries per code | `5` |
| `EMAIL_RESEND_RATE_LIMIT` | No | Max resend requests per 15 min | `3` |

\*Required in production; a local default exists for development.  
†Either `CLOUDINARY_URL` or the three `CLOUDINARY_*` fields.

> ⚠️ Never commit `.env` or secrets. Rotate `JWT_SECRET` and database credentials for production.

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start production server |
| `npm run seed:admin` | Create or update super admin user |
| `npm run seed:merchant` | Create or update merchant user |
| `npm run seed:auctions` | Seed sample auction data |
| `npm test` | Not configured yet |

## 💻 Development

**Development mode**

```bash
npm run dev
```

**Production mode**

```bash
NODE_ENV=production npm start
```

**CORS behavior**

- In `development`, any `http://localhost:*` and `http://127.0.0.1:*` origin is allowed.
- In other environments, only origins listed in `CORS_ORIGIN` are accepted.

## 🌐 API reference

**Base path:** `/api/v1`  
**Auth header:** `Authorization: Bearer <accessToken>` (where marked *Yes*)

Prefix all paths below with the base URL (local or production).

### 💚 Health

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | No |

### 🔑 Authentication — `/auth`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/register` | No | Rate limited |
| `POST` | `/verify-email` | No | Email OTP after register |
| `POST` | `/resend-verification` | No | Resend registration OTP |
| `POST` | `/login` | No | Rate limited; may require OTP step |
| `POST` | `/verify-login` | No | Complete login with OTP |
| `POST` | `/resend-login-code` | No | Resend login OTP |
| `POST` | `/forgot-password` | No | Start password reset |
| `POST` | `/verify-forgot-password` | No | Verify reset OTP |
| `POST` | `/resend-forgot-password` | No | Resend reset OTP |
| `POST` | `/reset-forgotten-password` | No | Set new password |
| `POST` | `/refresh-token` | No | Body: `{ "refreshToken" }` |
| `POST` | `/logout` | Yes | |
| `GET` | `/me` | Yes | Current user |

### 👤 Users — `/users`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/profile` | Yes | |
| `PUT` | `/profile` | Yes | |
| `POST` | `/change-email` | Yes | OTP flow |
| `POST` | `/verify-change-email` | Yes | |
| `POST` | `/change-password` | Yes | OTP flow |
| `POST` | `/verify-change-password` | Yes | |
| `POST` | `/resend-credential-otp` | Yes | Rate limited |

### 🛍️ Catalog — `/catalog` (public)

| Method | Path | Auth | Query / params |
|--------|------|------|----------------|
| `GET` | `/products` | No | `page`, `limit`, `search`, `category` |
| `GET` | `/products/:productId` | No | |
| `GET` | `/products/:productId/reviews` | No | `limit` |
| `POST` | `/products/:productId/reviews` | No | `rating`, `comment`, optional `authorName` |

Product categories: `Rings`, `Necklaces`, `Earrings`, `Bracelets`, `Pendants`, `Biscuits`, `Coins`, `Bars`.

### 💳 Checkout — `/checkout`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/cart-session` | Yes | Stripe Checkout session |
| `GET` | `/verify-session` | Yes | Query: `session_id` |
| `GET` | `/orders` | Yes | User purchase orders |

### 🔨 Auctions — `/auctions` (public)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/` | No | List active auctions |
| `GET` | `/:id` | No | Auction detail |
| `GET` | `/:id/bids` | No | Bid history |
| `POST` | `/:id/bids` | Yes | Place bid (nested under `/auctions/:id/bids`) |

### 🏪 Merchant auctions — `/merchant/auctions`

Requires `MERCHANT` role and `merchantVerified: true`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List own auctions |
| `POST` | `/` | Create auction |
| `GET` | `/:id` | Auction detail |
| `PUT` | `/:id` | Update auction |
| `PATCH` | `/:id/cancel` | Cancel auction |
| `DELETE` | `/:id` | Delete auction |
| `GET` | `/:id/bidders` | Bidder list |
| `GET` | `/:id/winner-conversation` | Chat handoff after win |

### 🏪 Merchant — `/merchant`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard/stats` | Dashboard metrics |
| `GET` | `/orders` | Orders with merchant line items |
| `PATCH` | `/orders/:orderId/line-items/:lineItemId` | Update delivery status |
| `GET` | `/products` | List own products |
| `POST` | `/products` | Create product |
| `GET` | `/products/:id` | Product detail |
| `PUT` | `/products/:id` | Update product |
| `DELETE` | `/products/:id` | Delete product |
| `POST` | `/products/images` | Upload images (multipart) |
| `GET` | `/backup` | Export merchant data (rate limited) |

Delivery statuses: `pending`, `processing`, `shipped`, `delivered`, `cancelled`.

### ⚙️ Admin — `/admin`

Requires `SUPER_ADMIN` role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard/stats` | Admin dashboard metrics |
| `GET` | `/users` | List users (`page`, `limit`, `search`, `role`) |
| `GET` | `/users/:id` | User by ID |
| `POST` | `/users` | Create user |
| `PUT` | `/users/:id` | Update user |
| `DELETE` | `/users/:id` | Delete user |
| `GET` | `/backup` | Platform data export (rate limited) |

### 💬 Chat — `/chat`

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/conversations` | Yes |
| `GET` | `/conversations/:id/messages` | Yes |
| `POST` | `/conversations/:id/messages` | Yes |
| `PATCH` | `/conversations/:id/read` | Yes |

### 🤖 Support — `/support`

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/status` | No |
| `POST` | `/chat` | No / session-based |

### 🪞 AR try-on — `/ar-tryon`

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/config/:productId` | No |
| `POST` | `/sessions` | No |
| `PATCH` | `/sessions/:sessionId` | No |
| `POST` | `/sessions/:sessionId/events` | No |

### 📈 Spot trading — `/spot-trade`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/` | Yes | Placeholder — not implemented |

### 📝 Example: register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+94 77 123 4567",
  "password": "SecurePass123",
  "address": "123 Main Street, Colombo"
}
```

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### 📝 Example: authenticated request

```http
GET /api/v1/users/profile
Authorization: Bearer <accessToken>
```

## 🔑 Authentication

- **Access token** — Returned in JSON on register/login; send as `Authorization: Bearer <token>`.
- **Refresh token** — HTTP-only cookie and/or body for `POST /auth/refresh-token`.
- **Email OTP** — Registration, login, password reset, and credential changes use time-limited codes (see SMTP settings).
- **Expiry** — Controlled by `JWT_ACCESS_TOKEN_EXPIRY` and `JWT_REFRESH_TOKEN_EXPIRY`.
- **Rate limiting** — Applied on auth and sensitive OTP endpoints to reduce abuse.

## 👥 User roles

| Role | Description |
|------|-------------|
| 👤 `USER` | Default; catalog, checkout, auctions, profile |
| 🏪 `MERCHANT` | Products, orders, auctions; requires `merchantVerified` to publish |
| ⚙️ `SUPER_ADMIN` | User management, admin dashboard, platform backup |

## ⚠️ Error responses

Errors use a consistent JSON shape:

```json
{
  "success": false,
  "error": "Error message"
}
```

Validation failures may include field details:

```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please provide a valid email address" }
  ]
}
```

In `development`, stack traces may be included on server errors.

## 📡 Realtime

The HTTP server also hosts **Socket.IO** for live auction updates and notifications. Connect from the client using the same origin as the API base URL; see `realtime/socket.js` and `realtime/notify.js` for event names and payloads.

## 📁 Project structure

```
kgf-gold-tradex-backend/
├── config/
│   └── database.js              # MongoDB connection
├── constants/
│   └── productCategories.js
├── controllers/                 # Route handlers
├── middleware/                  # Auth, RBAC, validation, errors
├── models/                      # Mongoose schemas
├── routes/
│   ├── index.js                 # /api → v1
│   └── v1/                      # Versioned REST routes
├── realtime/
│   ├── socket.js                # Socket.IO setup
│   ├── io.js
│   ├── notify.js
│   └── auctionScheduler.js
├── services/                    # Email, auctions, support AI
├── scripts/                     # Seed scripts
├── utils/                       # Shared helpers
├── server.js                    # Application entry point
├── package.json
└── README.md
```

## 🛡️ Security

- 🔒 Passwords hashed with bcrypt
- 🎫 JWT access and refresh tokens with rotation support
- 🍪 HTTP-only, `Secure` cookies for refresh tokens in production
- 🚦 Rate limiting on authentication and OTP routes
- 🪖 Helmet security headers
- 🌍 Configurable CORS
- ✅ Request validation via `express-validator`
- 👮 Role-based access for admin and merchant routes

Do not commit `.env` or secrets. Rotate `JWT_SECRET` and database credentials for production deployments.

## 🤝 Contributing

1. Fork the repository and create a feature branch from `main`.
2. Install dependencies and run `npm run dev` locally.
3. Keep changes focused; match existing code style and patterns.
4. Open a pull request with a clear description and test steps.

Bug reports and feature requests are welcome via issues.

## 📄 License

This project is licensed under the **ISC** License. See [LICENSE](LICENSE) for details.
