import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema(
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
    images: {
      type: [String],
      default: [],
      validate: {
        validator(arr) {
          return !Array.isArray(arr) || arr.length <= 5;
        },
        message: 'A maximum of 5 images is allowed per auction',
      },
    },
    category: {
      type: String,
      trim: true,
      maxlength: [80, 'Category cannot exceed 80 characters'],
      default: 'Rings',
    },
    purity: {
      type: String,
      trim: true,
      maxlength: [32, 'Purity cannot exceed 32 characters'],
      default: '22K',
    },
    weight: {
      type: String,
      trim: true,
      maxlength: [32, 'Weight cannot exceed 32 characters'],
      default: '',
    },
    condition: {
      type: String,
      trim: true,
      maxlength: [64, 'Condition cannot exceed 64 characters'],
      default: 'Excellent',
    },
    startingBid: {
      type: Number,
      required: [true, 'Starting bid is required'],
      min: [0, 'Starting bid cannot be negative'],
    },
    currentBid: {
      type: Number,
      required: true,
      min: [0, 'Current bid cannot be negative'],
    },
    minIncrement: {
      type: Number,
      default: 2000,
      min: [1, 'Minimum increment must be at least 1'],
    },
    nextMinimum: {
      type: Number,
      required: true,
      min: [0, 'Next minimum cannot be negative'],
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
      index: true,
    },
    bidCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    watcherCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    winnerBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
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

auctionSchema.index({ status: 1, endsAt: 1 });
auctionSchema.index({ merchant: 1, createdAt: -1 });

const Auction = mongoose.model('Auction', auctionSchema);

export default Auction;
