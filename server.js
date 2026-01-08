import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { connectDB } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRoutes from './routes/index.js';

// Load environment variables
dotenv.config();

const app = express();
// Default to 5001 to avoid conflict with common port 5000
const PORT = parseInt(process.env.PORT) || 5001;

// CORS configuration - must be before helmet
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development') {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow all localhost origins in development
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    // Default allowed origins for development (fallback)
    const defaultOrigins = [
      'http://localhost:4000',
      'http://localhost:4001',
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
      'http://localhost:5174',
    ];

    // Get allowed origins from environment variable (comma-separated) or use defaults
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : defaultOrigins;

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log the rejected origin for debugging
      console.log(`⚠️  CORS: Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Helper function to find available port
const findAvailablePort = (startPort, maxAttempts = 10) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    // Ensure startPort is a number
    let currentPort = parseInt(startPort, 10);

    const tryPort = (port) => {
      const testServer = http.createServer();
      
      testServer.listen(port, () => {
        testServer.close(() => resolve(port));
      });

      testServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error(`Could not find available port after ${maxAttempts} attempts`));
          } else {
            // Ensure we're doing numeric addition, not string concatenation
            tryPort(parseInt(port, 10) + 1);
          }
        } else {
          reject(err);
        }
      });
    };

    tryPort(currentPort);
  });
};

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Try to find an available port
    let actualPort = PORT;
    try {
      actualPort = await findAvailablePort(PORT);
      if (actualPort !== PORT) {
        console.log(`⚠️  Port ${PORT} is in use, using port ${actualPort} instead`);
      }
    } catch (error) {
      console.error(`❌ Could not find available port starting from ${PORT}`);
      console.error(`💡 Try killing the process using port ${PORT}:`);
      console.error(`   lsof -ti:${PORT} | xargs kill -9`);
      process.exit(1);
    }
    
    const server = app.listen(actualPort, () => {
      console.log(`🚀 Server running on port ${actualPort}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API: http://localhost:${actualPort}/api/v1`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

