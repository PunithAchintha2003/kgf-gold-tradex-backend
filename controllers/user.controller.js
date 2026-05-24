import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { sendCredentialChangeEmail, isEmailConfigured } from '../services/emailService.js';

const CREDENTIAL_SELECT =
  '+pendingEmail +pendingPassword +credentialOtpHash +credentialOtpExpires +credentialOtpAttempts +credentialOtpPurpose +credentialOtpTargetEmail +password';

const OTP_ERROR_MESSAGES = {
  expired: 'Verification code has expired. Request a new code.',
  max_attempts: 'Too many failed attempts. Request a new verification code.',
  invalid: 'Invalid verification code. Please try again.',
  no_code: 'No active verification code. Request a new code.',
};

const sendCredentialOtp = async (user, purpose, targetEmail) => {
  if (!isEmailConfigured()) {
    throw new AppError('Email service is not configured. Please contact support.', 503);
  }

  const code = await user.issueCredentialOtp(purpose, targetEmail);

  try {
    await sendCredentialChangeEmail({
      to: targetEmail,
      name: user.name,
      code,
      purpose,
    });
  } catch (error) {
    user.clearCredentialChange();
    await user.save({ validateBeforeSave: true });
    throw new AppError('Failed to send verification email. Please try again later.', 503);
  }
};

/**
 * Get user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
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
 * Update user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Update only provided fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request email change — sends OTP to the new email address
 */
export const requestEmailChange = async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    const normalizedEmail = newEmail.toLowerCase();

    const user = await User.findById(req.userId).select(CREDENTIAL_SELECT);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (normalizedEmail === user.email) {
      return next(new AppError('New email must be different from your current email', 400));
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError('This email is already in use', 400));
    }

    user.pendingEmail = normalizedEmail;
    user.pendingPassword = undefined;
    await sendCredentialOtp(user, 'change_email', normalizedEmail);

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your new email address.',
      data: { email: normalizedEmail },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm email change with 6-digit OTP
 */
export const confirmEmailChange = async (req, res, next) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.userId).select(CREDENTIAL_SELECT);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.credentialOtpPurpose !== 'change_email' || !user.pendingEmail) {
      return next(new AppError('No pending email change request. Please start again.', 400));
    }

    const result = await user.verifyCredentialOtp(code);

    if (!result.ok) {
      return next(new AppError(OTP_ERROR_MESSAGES[result.reason] || 'Verification failed', 400));
    }

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.credentialOtpPurpose = undefined;
    user.credentialOtpTargetEmail = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password change — sends OTP to current email
 */
export const requestPasswordChange = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId).select(CREDENTIAL_SELECT);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      return next(new AppError('Current password is incorrect', 401));
    }

    user.pendingPassword = newPassword;
    user.pendingEmail = undefined;
    await sendCredentialOtp(user, 'change_password', user.email);

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email address.',
      data: { email: user.email },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm password change with 6-digit OTP
 */
export const confirmPasswordChange = async (req, res, next) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.userId).select(CREDENTIAL_SELECT);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.credentialOtpPurpose !== 'change_password' || !user.pendingPassword) {
      return next(new AppError('No pending password change request. Please start again.', 400));
    }

    const result = await user.verifyCredentialOtp(code);

    if (!result.ok) {
      return next(new AppError(OTP_ERROR_MESSAGES[result.reason] || 'Verification failed', 400));
    }

    user.password = user.pendingPassword;
    user.pendingPassword = undefined;
    user.credentialOtpPurpose = undefined;
    user.credentialOtpTargetEmail = undefined;
    user.clearRefreshToken();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend credential change OTP for the active pending request
 */
export const resendCredentialOtp = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select(CREDENTIAL_SELECT);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.credentialOtpPurpose) {
      return next(new AppError('No pending credential change request. Please start again.', 400));
    }

    if (user.credentialOtpPurpose === 'change_email' && !user.pendingEmail) {
      return next(new AppError('No pending email change request. Please start again.', 400));
    }

    if (user.credentialOtpPurpose === 'change_password' && !user.pendingPassword) {
      return next(new AppError('No pending password change request. Please start again.', 400));
    }

    const targetEmail =
      user.credentialOtpPurpose === 'change_email' ? user.pendingEmail : user.email;

    await sendCredentialOtp(user, user.credentialOtpPurpose, targetEmail);

    res.status(200).json({
      success: true,
      message: 'Verification code sent. Please check your email.',
      data: { email: targetEmail },
    });
  } catch (error) {
    next(error);
  }
};

