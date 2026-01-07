# Backend Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd kgf-gold-tradex-backend
   npm install
   ```

2. **Set Up Environment Variables**
   
   Create a `.env` file in the `kgf-gold-tradex-backend` directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/kgf-gold-tradex
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
   JWT_ACCESS_TOKEN_EXPIRY=15m
   JWT_REFRESH_TOKEN_EXPIRY=7d
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   CORS_ORIGIN=http://localhost:4000
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

   **Important:** 
   - Replace `JWT_SECRET` and `SESSION_SECRET` with strong, random strings (at least 32 characters)
   - For MongoDB Atlas, use: `mongodb+srv://username:password@cluster.mongodb.net/kgf-gold-tradex?retryWrites=true&w=majority`

3. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # Check if MongoDB is running
   mongosh
   
   # If not running, start it (macOS with Homebrew)
   brew services start mongodb-community
   ```

4. **Run the Server**
   
   Development mode (with auto-reload):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

5. **Verify Setup**
   
   Open your browser and visit:
   - Health check: http://localhost:5000/health
   - API health: http://localhost:5000/api/v1/health

## MongoDB Setup

### Local MongoDB (macOS)

1. **Install MongoDB** (if not already installed):
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

2. **Start MongoDB**:
   ```bash
   brew services start mongodb-community
   ```

3. **Verify MongoDB is running**:
   ```bash
   mongosh
   # Should connect successfully
   ```

4. **Create Database** (optional - MongoDB creates it automatically):
   ```bash
   mongosh
   use kgf-gold-tradex
   ```

### MongoDB Atlas (Cloud)

1. Create an account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Create a database user
4. Get your connection string
5. Update `MONGODB_URI` in `.env` with your Atlas connection string

## Testing the API

### Using curl

**Register a user:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+94 77 123 4567",
    "password": "SecurePass123",
    "address": "123 Main Street, Colombo"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Get current user (replace TOKEN with access token from login):**
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## Troubleshooting

### MongoDB Connection Issues

- **Error: "MongoServerError: Authentication failed"**
  - Check your MongoDB credentials in `MONGODB_URI`
  - Ensure MongoDB is running: `brew services list`

- **Error: "ECONNREFUSED"**
  - MongoDB is not running
  - Start it: `brew services start mongodb-community`

### Port Already in Use

- Change `PORT` in `.env` to a different port (e.g., 5001)
- Or kill the process using port 5000:
  ```bash
  lsof -ti:5000 | xargs kill
  ```

### JWT Errors

- Ensure `JWT_SECRET` is set in `.env`
- Use a strong secret (at least 32 characters)

## Next Steps

1. Test registration and login through the frontend
2. Verify tokens are stored correctly
3. Test protected routes
4. Implement spot trading features

