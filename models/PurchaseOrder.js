import mongoose from 'mongoose';

const buyerSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const lineItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: undefined,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    name: { type: String, required: true, trim: true },
    unitPriceLkr: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    deliveryStatus: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    /** Snapshot of product thumbnail at purchase time */
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: undefined,
    },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    amountTotalLkr: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'lkr',
    },
    items: {
      type: [lineItemSchema],
      default: [],
    },
    paymentStatus: {
      type: String,
      trim: true,
      default: 'paid',
    },
    buyerSnapshot: {
      type: buyerSnapshotSchema,
      default: undefined,
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

purchaseOrderSchema.index({ user: 1, createdAt: -1 });
purchaseOrderSchema.index({ 'items.merchant': 1, createdAt: -1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;
