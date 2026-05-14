import mongoose from 'mongoose';

const productReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      trim: true,
      maxlength: [80, 'Name is too long'],
      default: 'Anonymous',
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
      default: '',
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

productReviewSchema.index({ product: 1, createdAt: -1 });

const ProductReview = mongoose.model('ProductReview', productReviewSchema);

export default ProductReview;
