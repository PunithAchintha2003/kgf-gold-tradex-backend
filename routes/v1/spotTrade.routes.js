import express from 'express';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// All spot trade routes require authentication
router.use(authenticate);

// Placeholder for spot trade routes
// This will be implemented when spot trading features are added
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Spot trading endpoint - coming soon',
    user: req.user.email,
  });
});

export default router;

