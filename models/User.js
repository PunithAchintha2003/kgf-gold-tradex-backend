import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenExpiry: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'USER', 'MERCHANT'],
      default: 'USER',
    },
    /** Platform-verified seller (merchants need this to publish live listings) */
    merchantVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCodeHash: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.refreshTokenExpiry;
        delete ret.emailVerificationCodeHash;
        delete ret.emailVerificationExpires;
        delete ret.emailVerificationAttempts;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for faster queries (email already has unique index, so we only need createdAt)
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update refresh token
userSchema.methods.setRefreshToken = function (token, expiry) {
  this.refreshToken = token;
  this.refreshTokenExpiry = expiry;
};

// Method to clear refresh token
userSchema.methods.clearRefreshToken = function () {
  this.refreshToken = undefined;
  this.refreshTokenExpiry = undefined;
};

const VERIFICATION_EXPIRY_MS =
  parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || '15', 10) * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = parseInt(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || '5', 10);

userSchema.methods.issueEmailVerificationCode = async function () {
  const code = crypto.randomInt(100000, 1000000).toString();
  const salt = await bcrypt.genSalt(10);
  this.emailVerificationCodeHash = await bcrypt.hash(code, salt);
  this.emailVerificationExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS);
  this.emailVerificationAttempts = 0;
  await this.save({ validateBeforeSave: true });
  return code;
};

userSchema.methods.verifyEmailCode = async function (candidateCode) {
  if (!this.emailVerificationCodeHash || !this.emailVerificationExpires) {
    return { ok: false, reason: 'no_code' };
  }

  if (this.emailVerificationExpires < new Date()) {
    return { ok: false, reason: 'expired' };
  }

  if (this.emailVerificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    return { ok: false, reason: 'max_attempts' };
  }

  this.emailVerificationAttempts += 1;

  const isMatch = await bcrypt.compare(String(candidateCode).trim(), this.emailVerificationCodeHash);

  if (!isMatch) {
    await this.save({ validateBeforeSave: true });
    return { ok: false, reason: 'invalid' };
  }

  this.emailVerified = true;
  this.emailVerificationCodeHash = undefined;
  this.emailVerificationExpires = undefined;
  this.emailVerificationAttempts = 0;
  await this.save({ validateBeforeSave: true });

  return { ok: true };
};

userSchema.methods.clearEmailVerification = function () {
  this.emailVerificationCodeHash = undefined;
  this.emailVerificationExpires = undefined;
  this.emailVerificationAttempts = 0;
};

const User = mongoose.model('User', userSchema);

export default User;

