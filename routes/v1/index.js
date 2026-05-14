import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import spotTradeRoutes from './spotTrade.routes.js';
import adminRoutes from './admin.routes.js';
import merchantRoutes from './merchant.routes.js';
import catalogRoutes from './catalog.routes.js';
import checkoutRoutes from './checkout.routes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API v1 is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/spot-trade', spotTradeRoutes);
router.use('/admin', adminRoutes);
router.use('/merchant', merchantRoutes);
router.use('/catalog', catalogRoutes);
router.use('/checkout', checkoutRoutes);

export default router;

