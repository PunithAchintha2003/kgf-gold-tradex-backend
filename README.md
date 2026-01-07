# KGF Gold TradeX Backend

MERN Stack backend API for KGF Gold TradeX platform with user authentication and authorization.

## Features

- ✅ User Registration and Login
- ✅ JWT Access & Refresh Token System
- ✅ Session Management
- ✅ Authentication & Authorization Middleware
- ✅ Global Error Handler
- ✅ API Versioning (v1)
- ✅ Schema Validations (express-validator)
- ✅ Rate Limiting
- ✅ Security Headers (Helmet)
- ✅ MongoDB Integration
- ✅ Spot Trading Support (placeholder)

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **express-validator** - Request validation

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (installed locally or MongoDB Atlas account)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kgf-gold-tradex
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
SESSION_SECRET=your-super-secret-session-key
CORS_ORIGIN=http://localhost:4000
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication (`/api/v1/auth`)

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user (requires auth)
- `GET /api/v1/auth/me` - Get current user (requires auth)

### Users (`/api/v1/users`)

- `GET /api/v1/users/profile` - Get user profile (requires auth)
- `PUT /api/v1/users/profile` - Update user profile (requires auth)

### Spot Trading (`/api/v1/spot-trade`)

- `GET /api/v1/spot-trade` - Spot trading endpoint (requires auth)

## Request/Response Examples

### Register User

**Request:**
```json
POST /api/v1/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+94 77 123 4567",
  "password": "SecurePass123",
  "address": "123 Main Street, Colombo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+94 77 123 4567",
      "address": "123 Main Street, Colombo",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

**Request:**
```json
POST /api/v1/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+94 77 123 4567",
      "address": "123 Main Street, Colombo",
      "lastLogin": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Authenticated Request

**Headers:**
```
Authorization: Bearer <accessToken>
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Validation errors include field-specific messages:

```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- HTTP-only cookies for refresh tokens
- Rate limiting on auth endpoints
- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization

## Project Structure

```
kgf-gold-tradex-backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── auth.controller.js   # Authentication logic
│   └── user.controller.js   # User operations
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── errorHandler.js      # Global error handler
│   ├── notFound.js          # 404 handler
│   └── validateRequest.js   # Request validation
├── models/
│   └── User.js              # User schema
├── routes/
│   ├── index.js             # Main router
│   └── v1/
│       ├── index.js         # v1 routes
│       ├── auth.routes.js   # Auth routes
│       ├── user.routes.js   # User routes
│       └── spotTrade.routes.js # Spot trade routes
├── utils/
│   ├── AppError.js          # Custom error class
│   └── generateTokens.js   # JWT token utilities
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── README.md
└── server.js                # Entry point
```

## License

ISC
