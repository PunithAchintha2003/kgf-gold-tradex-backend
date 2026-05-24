import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/generateTokens.js';
import { sendVerificationEmail, sendLoginOtpEmail, sendPasswordResetEmail, isEmailConfigured } from '../services/emailService.js';

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  role: user.role,
  merchantVerified: user.merchantVerified,
  emailVerified: user.emailVerified,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
});

const issueAuthTokens = async (user, res) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
  user.setRefreshToken(refreshToken, refreshTokenExpiry);
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, refreshToken };
};

const sendUserVerificationCode = async (user) => {
  if (!isEmailConfigured()) {
    throw new AppError('Email service is not configured. Please contact support.', 503);
  }

  const code = await user.issueEmailVerificationCode();

  try {
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      code,
    });
  } catch (error) {
    user.clearEmailVerification();
    await user.save({ validateBeforeSave: true });
    throw new AppError('Failed to send verification email. Please try again later.', 503);
  }
};

const OTP_ERROR_MESSAGES = {
  expired: 'Verification code has expired. Request a new code.',
  max_attempts: 'Too many failed attempts. Request a new verification code.',
  invalid: 'Invalid verification code. Please try again.',
  no_code: 'No active verification code. Request a new code.',
};

const LOGIN_SELECT =
  '+password +loginOtpHash +loginOtpExpires +loginOtpAttempts +loginSessionTokenHash +loginSessionExpires';

const PASSWORD_RESET_SELECT =
  '+password +passwordResetOtpHash +passwordResetOtpExpires +passwordResetOtpAttempts +passwordResetSessionTokenHash +passwordResetSessionExpires +passwordResetOtpVerified';

const sendLoginOtp = async (user) => {
  if (!isEmailConfigured()) {
    throw new AppError('Email service is not configured. Please contact support.', 503);
  }

  const { code, loginSessionToken } = await user.issueLoginChallenge();

  try {
    await sendLoginOtpEmail({
      to: user.email,
      name: user.name,
      code,
    });
  } catch (error) {
    user.clearLoginChallenge();
    await user.save({ validateBeforeSave: true });
    throw new AppError('Failed to send verification email. Please try again later.', 503);
  }

  return loginSessionToken;
};

const sendPasswordResetOtp = async (user) => {
  if (!isEmailConfigured()) {
    throw new AppError('Email service is not configured. Please contact support.', 503);
  }

  const { code, resetSessionToken } = await user.issuePasswordResetChallenge();

  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      code,
    });
  } catch (error) {
    user.clearPasswordResetChallenge();
    await user.save({ validateBeforeSave: true });
    throw new AppError('Failed to send verification email. Please try again later.', 503);
  }

  return resetSessionToken;
};

/**
 * Register a new user (email verification required before login)
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, address } = req.body;
    const phone = req.body.phone?.trim() || '';
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.emailVerified === false) {
        await sendUserVerificationCode(existingUser);
        return res.status(200).json({
          success: true,
          message: 'Verification code sent. Please check your email.',
          data: {
            requiresEmailVerification: true,
            email: existingUser.email,
          },
        });
      }
      return next(new AppError('User with this email already exists', 400));
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password,
      address: address?.trim() || '',
      emailVerified: false,
    });

    await sendUserVerificationCode(user);

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email to continue.',
      data: {
        requiresEmailVerification: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          emailVerified: false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email with 6-digit code and sign in
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationCodeHash +emailVerificationExpires +emailVerificationAttempts'
    );

    if (!user) {
      return next(new AppError('Invalid verification request', 400));
    }

    if (user.emailVerified) {
      const tokens = await issueAuthTokens(user, res);
      return res.status(200).json({
        success: true,
        message: 'Email already verified',
        data: {
          user: formatUser(user),
          ...tokens,
        },
      });
    }

    const result = await user.verifyEmailCode(code);

    if (!result.ok) {
      const messages = {
        expired: 'Verification code has expired. Request a new code.',
        max_attempts: 'Too many failed attempts. Request a new verification code.',
        invalid: 'Invalid verification code. Please try again.',
        no_code: 'No active verification code. Request a new code.',
      };
      return next(new AppError(messages[result.reason] || 'Verification failed', 400));
    }

    const tokens = await issueAuthTokens(user, res);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: formatUser(user),
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend email verification code
 */
export const resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a verification code has been sent.',
      });
    }

    if (user.emailVerified) {
      return next(new AppError('This email is already verified. You can sign in.', 400, 'EMAIL_ALREADY_VERIFIED'));
    }

    await sendUserVerificationCode(user);

    res.status(200).json({
      success: true,
      message: 'Verification code sent. Please check your email.',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user — validates credentials; customer accounts receive an email OTP before tokens are issued
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(LOGIN_SELECT);

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 403));
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (user.emailVerified === false) {
      await sendUserVerificationCode(user);
      return res.status(200).json({
        success: true,
        message: 'Please verify your email to continue. Check your inbox for the 6-digit code.',
        data: {
          requiresEmailVerification: true,
          email: user.email,
        },
      });
    }

    // Merchants and admins sign in directly without OTP
    if (user.role !== 'USER') {
      const tokens = await issueAuthTokens(user, res);
      user.lastLogin = new Date();
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: formatUser(user),
          ...tokens,
        },
      });
    }

    const loginSessionToken = await sendLoginOtp(user);

    res.status(200).json({
      success: true,
      message: 'Verification code sent. Please check your email.',
      data: {
        requiresLoginOtp: true,
        email: user.email,
        loginSessionToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify login OTP and complete sign-in
 */
export const verifyLogin = async (req, res, next) => {
  try {
    const { email, code, loginSessionToken } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(LOGIN_SELECT);

    if (!user) {
      return next(new AppError('Invalid verification request', 400));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 403));
    }

    if (user.emailVerified === false) {
      return next(new AppError('Please verify your email before signing in', 403, 'EMAIL_NOT_VERIFIED'));
    }

    const sessionValid = await user.verifyLoginSessionToken(loginSessionToken);
    if (!sessionValid) {
      return next(new AppError('Sign-in session expired. Please sign in again.', 400, 'LOGIN_SESSION_EXPIRED'));
    }

    const result = await user.verifyLoginOtp(code);

    if (!result.ok) {
      return next(new AppError(OTP_ERROR_MESSAGES[result.reason] || 'Verification failed', 400));
    }

    const tokens = await issueAuthTokens(user, res);
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUser(user),
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend login OTP for an active sign-in session
 */
export const resendLoginCode = async (req, res, next) => {
  try {
    const { email, loginSessionToken } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(LOGIN_SELECT);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a verification code has been sent.',
      });
    }

    const sessionValid = await user.verifyLoginSessionToken(loginSessionToken);
    if (!sessionValid) {
      return next(new AppError('Sign-in session expired. Please sign in again.', 400, 'LOGIN_SESSION_EXPIRED'));
    }

    const newSessionToken = await sendLoginOtp(user);

    res.status(200).json({
      success: true,
      message: 'Verification code sent. Please check your email.',
      data: {
        email: user.email,
        loginSessionToken: newSessionToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const user = await User.findById(decoded.userId).select('+refreshToken +refreshTokenExpiry');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.isActive) {
      return next(new AppError('User account is inactive', 403));
    }

    if (user.emailVerified === false) {
      return next(new AppError('Please verify your email before continuing', 403, 'EMAIL_NOT_VERIFIED'));
    }

    if (user.refreshToken !== refreshToken) {
      return next(new AppError('Invalid refresh token', 401));
    }

    if (user.refreshTokenExpiry && user.refreshTokenExpiry < new Date()) {
      return next(new AppError('Refresh token expired', 401));
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (user) {
      user.clearRefreshToken();
      await user.save();
    }

    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...formatUser(user),
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset — sends OTP to email
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(PASSWORD_RESET_SELECT);

    if (user && user.isActive) {
      const resetSessionToken = await sendPasswordResetOtp(user);
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a verification code has been sent.',
        data: {
          email: user.email,
          resetSessionToken,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a verification code has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify password reset OTP
 */
export const verifyForgotPasswordCode = async (req, res, next) => {
  try {
    const { email, code, resetSessionToken } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(PASSWORD_RESET_SELECT);

    if (!user) {
      return next(new AppError('Invalid verification request', 400));
    }

    const sessionValid = await user.verifyPasswordResetSessionToken(resetSessionToken);
    if (!sessionValid) {
      return next(new AppError('Password reset session expired. Please start again.', 400, 'RESET_SESSION_EXPIRED'));
    }

    const result = await user.verifyPasswordResetOtp(code);

    if (!result.ok) {
      return next(new AppError(OTP_ERROR_MESSAGES[result.reason] || 'Verification failed', 400));
    }

    res.status(200).json({
      success: true,
      message: 'Code verified. You can now set a new password.',
      data: {
        email: user.email,
        resetSessionToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend password reset OTP
 */
export const resendForgotPasswordCode = async (req, res, next) => {
  try {
    const { email, resetSessionToken } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(PASSWORD_RESET_SELECT);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a verification code has been sent.',
      });
    }

    const sessionValid = await user.verifyPasswordResetSessionToken(resetSessionToken);
    if (!sessionValid) {
      return next(new AppError('Password reset session expired. Please start again.', 400, 'RESET_SESSION_EXPIRED'));
    }

    const newSessionToken = await sendPasswordResetOtp(user);

    res.status(200).json({
      success: true,
      message: 'Verification code sent. Please check your email.',
      data: {
        email: user.email,
        resetSessionToken: newSessionToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set new password after OTP verification
 */
export const resetForgottenPassword = async (req, res, next) => {
  try {
    const { email, newPassword, resetSessionToken } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(PASSWORD_RESET_SELECT);

    if (!user) {
      return next(new AppError('Invalid password reset request', 400));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 403));
    }

    const sessionValid = await user.verifyPasswordResetSessionToken(resetSessionToken);
    if (!sessionValid) {
      return next(new AppError('Password reset session expired. Please start again.', 400, 'RESET_SESSION_EXPIRED'));
    }

    if (!user.passwordResetOtpVerified) {
      return next(new AppError('Please verify the code sent to your email first.', 400));
    }

    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return next(new AppError('New password must be different from your current password', 400));
    }

    user.password = newPassword;
    user.clearPasswordResetChallenge();
    user.clearRefreshToken();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
