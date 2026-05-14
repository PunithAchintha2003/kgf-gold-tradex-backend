import mongoose from 'mongoose';

const pendingItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    priceLkr: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: undefined,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    /** Primary listing image at checkout (HTTPS) */
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: undefined,
    },
  },
  { _id: false }
);

const pendingCheckoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stripeSessionId: {
      type: String,
      trim: true,
      default: '',
      index: true,
      sparse: true,
    },
    items: {
      type: [pendingItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

pendingCheckoutSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

const PendingCheckout = mongoose.model('PendingCheckout', pendingCheckoutSchema);

export default PendingCheckout;
