# 🥇 KGF Gold TradeX — Backend API

REST API for the **KGF Gold TradeX** platform: user authentication, product catalog, Stripe checkout, merchant product management, and admin operations. Built with Node.js, Express, and MongoDB.

[![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-8.0-880000?logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![JWT](https://img.shields.io/badge/JWT-9.0-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Stripe](https://img.shields.io/badge/Stripe-17.7-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-2.10-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Helmet](https://img.shields.io/badge/Helmet-7.1-000000?logo=helmet&logoColor=white)](https://helmetjs.github.io/)
[![express-validator](https://img.shields.io/badge/express--validator-7.0-000000)](https://express-validator.github.io/)
[![API](https://img.shields.io/badge/API-v1-0EA5E9)](http://localhost:5001/api/v1/health)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

## 📑 Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Running the server](#running-the-server)
- [API overview](#api-overview)
- [Authentication](#authentication)
- [User roles](#user-roles)
- [Error responses](#error-responses)
- [Project structure](#project-structure)
- [Security](#security)
- [License](#license)

<a id="features"></a>

## ✨ Features

| Area | Capabilities |
|------|----------------|
| 🔐 **Auth** | Registration, login, JWT access/refresh tokens, HTTP-only refresh cookies, logout, current user |
| 👤 **Users** | Profile read/update |
| 🛍️ **Catalog** | Public published products (search, pagination, categories), product detail, reviews |
| 💳 **Checkout** | Stripe cart sessions, payment verification, purchase order history |
| 🏪 **Merchant** | Dashboard stats, orders, delivery status updates, CRUD products, Cloudinary image upload |
| ⚙️ **Admin** | Dashboard stats, user CRUD, role and merchant verification management |
| 🌐 **Platform** | API versioning (`/api/v1`), request validation, rate limiting, Helmet, CORS, compression, global error handling |

📈 Spot trading routes exist as a placeholder for future work.

<a id="tech-stack"></a>

## 🛠️ Tech stack

- 🟢 **Runtime:** Node.js (ES modules)
- ⚡ **Framework:** Express.js
- 🍃 **Database:** MongoDB with Mongoose
- 🔐 **Auth:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- 💳 **Payments:** Stripe
- 🖼️ **Media:** Cloudinary, Multer
- ✅ **Validation:** `express-validator`
- 🛡️ **Security / ops:** Helmet, CORS, `express-rate-limit`, Morgan, compression

<a id="prerequisites"></a>

## 📋 Prerequisites

- **Node.js** 18+
- **MongoDB** (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **npm** (or yarn)
- Optional for full functionality:
  - [Stripe](https://stripe.com) account (checkout)
  - [Cloudinary](https://cloudinary.com) account (merchant product images)

<a id="getting-started"></a>

## 🚀 Getting started

### 1️⃣ Clone and install

```bash
git clone <repository-url>
cd kgf-gold-tradex-backend
npm install
```

### 2️⃣ Configure environment

Create a `.env` file in the project root (see [Environment variables](#environment-variables)). At minimum, set `MONGODB_URI` and `JWT_SECRET`.

### 3️⃣ Seed local roles (optional)

```bash
npm run seed:admin      # SUPER_ADMIN user
npm run seed:merchant   # MERCHANT user (see script for defaults)
```

Credentials are printed by each seed script. Use only in local development.

### 4️⃣ Start the API

```bash
npm run dev
```

The server listens on `PORT` (default **5001**). If that port is busy, the process automatically tries the next available port.

- 💚 Health: `GET http://localhost:5001/health`
- 🌐 API base: `http://localhost:5001/api/v1`
- 💚 API health: `GET http://localhost:5001/api/v1/health`

<a id="environment-variables"></a>

## 🔐 Environment variables

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
| `SMTP_HOST` | For email verification | SMTP host (Gmail: `smtp.gmail.com`) | `smtp.gmail.com` |
| `SMTP_PORT` | No | SMTP port | `587` |
| `SMTP_USER` | For email verification | Sender Gmail address | — |
| `SMTP_PASS` | For email verification | Gmail App Password (not account password) | — |
| `SMTP_FROM_NAME` | No | Display name in outgoing mail | `KGF Gold TradeX` |
| `EMAIL_VERIFICATION_EXPIRY_MINUTES` | No | OTP validity | `15` |
| `EMAIL_VERIFICATION_MAX_ATTEMPTS` | No | Max wrong OTP tries per code | `5` |
| `EMAIL_RESEND_RATE_LIMIT` | No | Max resend requests per 15 min | `3` |

\*Required in production; a local default exists for development.  
†Either `CLOUDINARY_URL` or the three `CLOUDINARY_*` fields.

<a id="scripts"></a>

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start production server |
| `npm run seed:admin` | Create or update super admin user |
| `npm run seed:merchant` | Create or update merchant user |
| `npm test` | Not configured yet |

<a id="running-the-server"></a>

## ▶️ Running the server

**Development**

```bash
npm run dev
```

**Production**

```bash
NODE_ENV=production npm start
```

In development, CORS allows any `http://localhost:*` and `http://127.0.0.1:*` origin. In other environments, only origins listed in `CORS_ORIGIN` are accepted.

<a id="api-overview"></a>

## 🌐 API overview

Base path: **`/api/v1`**

### 💚 Health

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | No |

### 🔑 Authentication — `/auth`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/register` | No | Rate limited |
| `POST` | `/login` | No | Rate limited |
| `POST` | `/refresh-token` | No | Body: `{ "refreshToken" }` |
| `POST` | `/logout` | Yes | |
| `GET` | `/me` | Yes | Current user |

### 👤 Users — `/users`

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/profile` | Yes |
| `PUT` | `/profile` | Yes |

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
| `POST` | `/cart-session` | Yes | Stripe Checkout session for cart items |
| `GET` | `/verify-session` | Yes | Query: `session_id` |
| `GET` | `/orders` | Yes | User purchase orders |

### 🏪 Merchant — `/merchant`

Requires authenticated user with role `MERCHANT` and `merchantVerified: true` for publishing workflows.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard/stats` | Merchant dashboard metrics |
| `GET` | `/orders` | Orders containing merchant line items |
| `PATCH` | `/orders/:orderId/line-items/:lineItemId` | Update line delivery status |
| `GET` | `/products` | List own products (`page`, `limit`, `search`) |
| `GET` | `/products/:id` | Product detail |
| `POST` | `/products` | Create product |
| `PUT` | `/products/:id` | Update product |
| `DELETE` | `/products/:id` | Delete product |
| `POST` | `/products/images` | Upload images (multipart; optional `productId` query) |

Delivery statuses: `pending`, `processing`, `shipped`, `delivered`, `cancelled`.

### ⚙️ Admin — `/admin`

Requires role `SUPER_ADMIN`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard/stats` | Admin dashboard metrics |
| `GET` | `/users` | List users (`page`, `limit`, `search`, `role`) |
| `GET` | `/users/:id` | User by ID |
| `POST` | `/users` | Create user |
| `PUT` | `/users/:id` | Update user (role, `merchantVerified`, `isActive`, …) |
| `DELETE` | `/users/:id` | Delete user |

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

<a id="authentication"></a>

## 🔑 Authentication

- **Access token:** Returned in JSON on register/login; send as `Authorization: Bearer <token>`.
- **Refresh token:** Stored in an HTTP-only cookie and/or request body for `/auth/refresh-token`.
- **Expiry:** Configured via `JWT_ACCESS_TOKEN_EXPIRY` and `JWT_REFRESH_TOKEN_EXPIRY`.
- **Auth endpoints** are rate-limited to reduce brute-force attempts.

<a id="user-roles"></a>

## 👥 User roles

| Role | Description |
|------|-------------|
| 👤 `USER` | Default; catalog browsing, checkout, profile |
| 🏪 `MERCHANT` | Manage products and orders; requires `merchantVerified` to publish |
| ⚙️ `SUPER_ADMIN` | Full user management and admin dashboard |

<a id="error-responses"></a>

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

<a id="project-structure"></a>

## 📁 Project structure

```
kgf-gold-tradex-backend/
├── config/
│   └── database.js           # MongoDB connection
├── constants/
│   └── productCategories.js  # Shared product categories
├── controllers/
│   ├── admin.controller.js
│   ├── auth.controller.js
│   ├── catalog.controller.js
│   ├── checkout.controller.js
│   ├── merchant.controller.js
│   └── user.controller.js
├── middleware/
│   ├── admin.js              # requireAdmin
│   ├── auth.js               # authenticate (JWT)
│   ├── errorHandler.js
│   ├── merchant.js           # requireMerchant
│   ├── notFound.js
│   ├── productImageUpload.js
│   └── validateRequest.js
├── models/
│   ├── PendingCheckout.js
│   ├── Product.js
│   ├── ProductReview.js
│   ├── PurchaseOrder.js
│   └── User.js
├── routes/
│   ├── index.js              # /api → v1
│   └── v1/
│       ├── index.js
│       ├── admin.routes.js
│       ├── auth.routes.js
│       ├── catalog.routes.js
│       ├── checkout.routes.js
│       ├── merchant.routes.js
│       ├── spotTrade.routes.js
│       └── user.routes.js
├── scripts/
│   ├── seedAdmin.js
│   └── seedMerchant.js
├── utils/
│   ├── AppError.js
│   ├── cloudinaryUpload.js
│   └── generateTokens.js
├── server.js                 # Application entry point
├── package.json
└── README.md
```

<a id="security"></a>

## 🛡️ Security

- Passwords hashed with bcrypt
- JWT-based authentication with refresh rotation support
- HTTP-only, `Secure` cookies for refresh tokens in production
- Rate limiting on authentication routes
- Helmet security headers
- Configurable CORS
- Request validation and sanitization via `express-validator`
- Role-based access control for admin and merchant routes

Do not commit `.env` or secrets. Rotate `JWT_SECRET` and database credentials for production deployments.

<a id="license"></a>

## 📄 License

ISC
