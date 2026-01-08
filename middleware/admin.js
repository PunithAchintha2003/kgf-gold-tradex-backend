import { AppError } from '../utils/AppError.js';

/**
 * Middleware to check if user is a super admin
 * Must be used after authenticate middleware
 */
export const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('Access denied. Super admin privileges required', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

