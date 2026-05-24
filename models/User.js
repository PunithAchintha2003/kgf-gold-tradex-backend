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
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
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
    pendingEmail: {
      type: String,
      select: false,
    },
    pendingPassword: {
      type: String,
      select: false,
    },
    credentialOtpHash: {
      type: String,
      select: false,
    },
    credentialOtpExpires: {
      type: Date,
      select: false,
    },
    credentialOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    credentialOtpPurpose: {
      type: String,
      enum: ['change_email', 'change_password'],
      select: false,
    },
    credentialOtpTargetEmail: {
      type: String,
      select: false,
    },
    loginOtpHash: {
      type: String,
      select: false,
    },
    loginOtpExpires: {
      type: Date,
      select: false,
    },
    loginOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    loginSessionTokenHash: {
      type: String,
      select: false,
    },
    loginSessionExpires: {
      type: Date,
      select: false,
    },
    passwordResetOtpHash: {
      type: String,
      select: false,
    },
    passwordResetOtpExpires: {
      type: Date,
      select: false,
    },
    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    passwordResetSessionTokenHash: {
      type: String,
      select: false,
    },
    passwordResetSessionExpires: {
      type: Date,
      select: false,
    },
    passwordResetOtpVerified: {
      type: Boolean,
      default: false,
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
        delete ret.pendingEmail;
        delete ret.pendingPassword;
        delete ret.credentialOtpHash;
        delete ret.credentialOtpExpires;
        delete ret.credentialOtpAttempts;
        delete ret.credentialOtpPurpose;
        delete ret.credentialOtpTargetEmail;
        delete ret.loginOtpHash;
        delete ret.loginOtpExpires;
        delete ret.loginOtpAttempts;
        delete ret.loginSessionTokenHash;
        delete ret.loginSessionExpires;
        delete ret.passwordResetOtpHash;
        delete ret.passwordResetOtpExpires;
        delete ret.passwordResetOtpAttempts;
        delete ret.passwordResetSessionTokenHash;
        delete ret.passwordResetSessionExpires;
        delete ret.passwordResetOtpVerified;
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

userSchema.methods.issueCredentialOtp = async function (purpose, targetEmail) {
  const code = crypto.randomInt(100000, 1000000).toString();
  const salt = await bcrypt.genSalt(10);
  this.credentialOtpHash = await bcrypt.hash(code, salt);
  this.credentialOtpExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS);
  this.credentialOtpAttempts = 0;
  this.credentialOtpPurpose = purpose;
  this.credentialOtpTargetEmail = targetEmail.toLowerCase();
  await this.save({ validateBeforeSave: true });
  return code;
};

userSchema.methods.verifyCredentialOtp = async function (candidateCode) {
  if (!this.credentialOtpHash || !this.credentialOtpExpires) {
    return { ok: false, reason: 'no_code' };
  }

  if (this.credentialOtpExpires < new Date()) {
    return { ok: false, reason: 'expired' };
  }

  if (this.credentialOtpAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    return { ok: false, reason: 'max_attempts' };
  }

  this.credentialOtpAttempts += 1;

  const isMatch = await bcrypt.compare(String(candidateCode).trim(), this.credentialOtpHash);

  if (!isMatch) {
    await this.save({ validateBeforeSave: true });
    return { ok: false, reason: 'invalid' };
  }

  this.credentialOtpHash = undefined;
  this.credentialOtpExpires = undefined;
  this.credentialOtpAttempts = 0;

  return { ok: true };
};

userSchema.methods.clearCredentialChange = function () {
  this.pendingEmail = undefined;
  this.pendingPassword = undefined;
  this.credentialOtpHash = undefined;
  this.credentialOtpExpires = undefined;
  this.credentialOtpAttempts = 0;
  this.credentialOtpPurpose = undefined;
  this.credentialOtpTargetEmail = undefined;
};

userSchema.methods.issueLoginChallenge = async function () {
  const code = crypto.randomInt(100000, 1000000).toString();
  const loginSessionToken = crypto.randomBytes(32).toString('hex');

  const salt = await bcrypt.genSalt(10);
  this.loginOtpHash = await bcrypt.hash(code, salt);
  this.loginOtpExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS);
  this.loginOtpAttempts = 0;
  this.loginSessionTokenHash = await bcrypt.hash(loginSessionToken, salt);
  this.loginSessionExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS);

  await this.save({ validateBeforeSave: true });

  return { code, loginSessionToken };
};

userSchema.methods.verifyLoginSessionToken = async function (candidateToken) {
  if (!this.loginSessionTokenHash || !this.loginSessionExpires) {
    return false;
  }
  if (this.loginSessionExpires < new Date()) {
    return false;
  }
  return bcrypt.compare(String(candidateToken), this.loginSessionTokenHash);
};

userSchema.methods.verifyLoginOtp = async function (candidateCode) {
  if (!this.loginOtpHash || !this.loginOtpExpires) {
    return { ok: false, reason: 'no_code' };
  }

  if (this.loginOtpExpires < new Date()) {
    return { ok: false, reason: 'expired' };
  }

  if (this.loginOtpAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    return { ok: false, reason: 'max_attempts' };
  }

  this.loginOtpAttempts += 1;

  const isMatch = await bcrypt.compare(String(candidateCode).trim(), this.loginOtpHash);

  if (!isMatch) {
    await this.save({ validateBeforeSave: true });
    return { ok: false, reason: 'invalid' };
  }

  this.clearLoginChallenge();
  await this.save({ validateBeforeSave: true });

  return { ok: true };
};

userSchema.methods.clearLoginChallenge = function () {
  this.loginOtpHash = undefined;
  this.loginOtpExpires = undefined;
  this.loginOtpAttempts = 0;
  this.loginSessionTokenHash = undefined;
  this.loginSessionExpires = undefined;
};

userSchema.methods.issuePasswordResetChallenge = async function () {
  const code = crypto.randomInt(100000, 1000000).toString();
  const resetSessionToken = crypto.randomBytes(32).toString('hex');

  const salt = await bcrypt.genSalt(10);
  this.passwordResetOtpHash = await bcrypt.hash(code, salt);
  this.passwordResetOtpExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS);
  this.passwordResetOtpAttempts = 0;
  this.passwordResetSessionTokenHash = await bcrypt.hash(resetSessionToken, salt);
  this.passwordResetSessionExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS);
  this.passwordResetOtpVerified = false;

  await this.save({ validateBeforeSave: true });

  return { code, resetSessionToken };
};

userSchema.methods.verifyPasswordResetSessionToken = async function (candidateToken) {
  if (!this.passwordResetSessionTokenHash || !this.passwordResetSessionExpires) {
    return false;
  }
  if (this.passwordResetSessionExpires < new Date()) {
    return false;
  }
  return bcrypt.compare(String(candidateToken), this.passwordResetSessionTokenHash);
};

userSchema.methods.verifyPasswordResetOtp = async function (candidateCode) {
  if (!this.passwordResetOtpHash || !this.passwordResetOtpExpires) {
    return { ok: false, reason: 'no_code' };
  }

  if (this.passwordResetOtpExpires < new Date()) {
    return { ok: false, reason: 'expired' };
  }

  if (this.passwordResetOtpAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    return { ok: false, reason: 'max_attempts' };
  }

  this.passwordResetOtpAttempts += 1;

  const isMatch = await bcrypt.compare(String(candidateCode).trim(), this.passwordResetOtpHash);

  if (!isMatch) {
    await this.save({ validateBeforeSave: true });
    return { ok: false, reason: 'invalid' };
  }

  this.passwordResetOtpHash = undefined;
  this.passwordResetOtpExpires = undefined;
  this.passwordResetOtpAttempts = 0;
  this.passwordResetOtpVerified = true;
  await this.save({ validateBeforeSave: true });

  return { ok: true };
};

userSchema.methods.clearPasswordResetChallenge = function () {
  this.passwordResetOtpHash = undefined;
  this.passwordResetOtpExpires = undefined;
  this.passwordResetOtpAttempts = 0;
  this.passwordResetSessionTokenHash = undefined;
  this.passwordResetSessionExpires = undefined;
  this.passwordResetOtpVerified = false;
};

const User = mongoose.model('User', userSchema);

export default User;

