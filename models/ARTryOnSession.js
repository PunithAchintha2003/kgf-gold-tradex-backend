import mongoose from 'mongoose';

/**
 * Per-product AR try-on session.
 *
 * Captures lightweight analytics about how users interact with the AR try-on
 * experience. The actual computer-vision tracking happens entirely client-side
 * (MediaPipe Tasks Vision running in the browser); the backend only records
 * which product was tried, by whom, for how long, how many snapshots were taken,
 * and whether tracking succeeded. No biometric data or raw video is ever sent.
 */
const arTryOnSessionSchema = new mongoose.Schema(
  {
    /** Authenticated buyer if available; otherwise null (anonymous visitor). */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    /** Inferred from product category at session start. */
    anchor: {
      type: String,
      enum: ['finger', 'wrist', 'ear', 'neck', 'palm'],
      required: true,
    },
    camera: {
      type: String,
      enum: ['user', 'environment'],
      default: 'user',
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    /** Duration in milliseconds; set when session ends. */
    durationMs: {
      type: Number,
      default: null,
      min: 0,
    },
    /** Number of camera frames processed during the session (sampled). */
    frameCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Number of frames where tracking successfully located the anchor. */
    trackedFrameCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    snapshotCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Client-reported reason the session ended (closed, error, addedToCart…). */
    endReason: {
      type: String,
      enum: ['closed', 'error', 'addedToCart', 'navigated', 'timeout', null],
      default: null,
    },
    /** Free-form error message if endReason === 'error'. */
    errorMessage: {
      type: String,
      default: '',
      maxlength: 500,
    },
    /** Coarse client info; never personally identifying. */
    client: {
      userAgent: { type: String, default: '', maxlength: 500 },
      viewport: {
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

arTryOnSessionSchema.index({ product: 1, createdAt: -1 });
arTryOnSessionSchema.index({ user: 1, createdAt: -1 });

const ARTryOnSession = mongoose.model('ARTryOnSession', arTryOnSessionSchema);

export default ARTryOnSession;
