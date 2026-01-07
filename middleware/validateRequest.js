import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware to validate request using express-validator
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errorMessages,
    });
  }

  next();
};

