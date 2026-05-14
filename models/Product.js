import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    sku: {
      type: String,
      trim: true,
      maxlength: [64, 'SKU cannot exceed 64 characters'],
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'LKR',
      maxlength: [8, 'Currency code is too long'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [80, 'Category cannot exceed 80 characters'],
      default: 'Rings',
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    /** Cloudinary (or other HTTPS) image URLs, newest first optional; primary thumbnail = images[0] */
    images: {
      type: [String],
      default: [],
      validate: {
        validator(arr) {
          return !Array.isArray(arr) || arr.length <= 5;
        },
        message: 'A maximum of 5 images is allowed per product',
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
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

productSchema.index({ merchant: 1, createdAt: -1 });
productSchema.index(
  { merchant: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: { sku: { $type: 'string', $gt: '' } },
  }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
