import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

/**
 * Get all users (with pagination)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const roleFilter = req.query.role;

    // Build query
    const query = {};
    if (roleFilter && ['SUPER_ADMIN', 'USER', 'MERCHANT'].includes(roleFilter)) {
      query.role = roleFilter;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Get users with pagination
    const users = await User.find(query)
      .select('-password -refreshToken -refreshTokenExpiry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create user (super admin)
 */
export const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      address,
      role = 'USER',
      merchantVerified = false,
      isActive = true,
    } = req.body;

    const allowedRoles = ['SUPER_ADMIN', 'USER', 'MERCHANT'];
    const effectiveRole = allowedRoles.includes(role) ? role : 'USER';
    const mv = effectiveRole === 'MERCHANT' ? Boolean(merchantVerified) : false;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      address,
      role: effectiveRole,
      merchantVerified: mv,
      isActive: Boolean(isActive),
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          merchantVerified: user.merchantVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid user ID format', 400));
    }

    const user = await User.findById(id).select('-password -refreshToken -refreshTokenExpiry');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user (admin can update any user)
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, isActive, merchantVerified } = req.body;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid user ID format', 400));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent admin from changing their own role
    if (id === req.userId && role && role !== user.role) {
      return next(new AppError('You cannot change your own role', 400));
    }

    // Prevent admin from deactivating themselves
    if (id === req.userId && isActive === false) {
      return next(new AppError('You cannot deactivate your own account', 400));
    }

    // Super admins can only change role, isActive, and merchant verification flags
    if (req.body.name !== undefined) {
      return next(new AppError('Super admins cannot change user name', 403));
    }
    if (req.body.phone !== undefined) {
      return next(new AppError('Super admins cannot change user phone number', 403));
    }
    if (req.body.address !== undefined) {
      return next(new AppError('Super admins cannot change user address', 403));
    }
    if (req.body.email !== undefined) {
      return next(new AppError('Super admins cannot change user email', 403));
    }

    // Only SUPER_ADMIN can change isActive status
    if (isActive !== undefined && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('Only super admins can activate/deactivate users', 403));
    }

    const allowedRoles = ['SUPER_ADMIN', 'USER', 'MERCHANT'];
    if (role !== undefined && allowedRoles.includes(role)) {
      if (user.role === 'MERCHANT' && role !== 'MERCHANT') {
        user.merchantVerified = false;
      }
      user.role = role;
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    if (merchantVerified !== undefined) {
      if (req.user.role !== 'SUPER_ADMIN') {
        return next(new AppError('Only super admins can change seller verification', 403));
      }
      if (user.role !== 'MERCHANT') {
        return next(new AppError('Seller verification can only be managed for merchant accounts', 400));
      }
      user.merchantVerified = Boolean(merchantVerified);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          isActive: user.isActive,
          merchantVerified: user.merchantVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid user ID format', 400));
    }

    // Prevent admin from deleting themselves
    if (id === req.userId) {
      return next(new AppError('You cannot delete your own account', 400));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    const superAdmins = await User.countDocuments({ role: 'SUPER_ADMIN' });
    const regularUsers = await User.countDocuments({ role: 'USER' });
    const merchants = await User.countDocuments({ role: 'MERCHANT' });
    const verifiedMerchants = await User.countDocuments({ role: 'MERCHANT', merchantVerified: true });

    // Get users registered in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get users who logged in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLoginUsers = await User.countDocuments({
      lastLogin: { $gte: today },
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          superAdmins,
          regularUsers,
          merchants,
          verifiedMerchants,
          recentUsers,
          todayLoginUsers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

