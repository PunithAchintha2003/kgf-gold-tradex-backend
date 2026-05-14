import { AppError } from '../utils/AppError.js';

/**
 * Must be used after authenticate middleware
 */
export const requireMerchant = (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (req.user.role !== 'MERCHANT') {
      return next(new AppError('Access denied. Merchant privileges required', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
