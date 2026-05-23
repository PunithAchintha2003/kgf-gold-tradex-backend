import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['auction_winner', 'support'],
      default: 'auction_winner',
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      default: null,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessagePreview: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    unread: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        if (ret.unread instanceof Map) {
          ret.unread = Object.fromEntries(ret.unread);
        }
        return ret;
      },
    },
  }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ auction: 1 }, { unique: true, sparse: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
