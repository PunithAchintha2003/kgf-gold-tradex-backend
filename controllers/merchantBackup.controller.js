import crypto from 'crypto';
import mongoose from 'mongoose';
import archiver from 'archiver';
import User from '../models/User.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import ProductReview from '../models/ProductReview.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { AppError } from '../utils/AppError.js';
import { toBackupJson } from '../utils/backupSerialize.js';
const BACKUP_FORMAT_VERSION = '1.0';

const USER_SAFE_SELECT =
  '-password -refreshToken -refreshTokenExpiry -emailVerificationCodeHash -emailVerificationExpires -emailVerificationAttempts -pendingEmail -pendingPassword -credentialOtpHash -credentialOtpExpires -credentialOtpAttempts -credentialOtpPurpose -credentialOtpTargetEmail -loginOtpHash -loginOtpExpires -loginOtpAttempts -loginSessionTokenHash -loginSessionExpires -passwordResetOtpHash -passwordResetOtpExpires -passwordResetOtpAttempts -passwordResetSessionTokenHash -passwordResetSessionExpires -passwordResetOtpVerified';

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function mapOrdersForMerchant(orders, merchantId) {
  const mid = String(merchantId);
  return orders.map((order) => {
    const items = (order.items || []).filter((item) => item.merchant && String(item.merchant) === mid);
    return {
      ...order,
      items,
    };
  });
}

async function collectMerchantBackupData(merchantId) {
  const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

  const [profile, products, ordersRaw, auctions] = await Promise.all([
    User.findById(merchantId).select(USER_SAFE_SELECT).lean(),
    Product.find({ merchant: merchantObjectId }).lean(),
    PurchaseOrder.find({ 'items.merchant': merchantObjectId }).lean(),
    Auction.find({ merchant: merchantObjectId }).lean(),
  ]);

  const productIds = products.map((p) => p._id);
  const auctionIds = auctions.map((a) => a._id);

  const [bids, productReviews, conversations] = await Promise.all([
    auctionIds.length
      ? Bid.find({ auction: { $in: auctionIds } }).lean()
      : [],
    productIds.length
      ? ProductReview.find({ product: { $in: productIds } }).lean()
      : [],
    Conversation.find({
      $or: [{ participants: merchantObjectId }, { auction: { $in: auctionIds } }],
    }).lean(),
  ]);

  const conversationIds = conversations.map((c) => c._id);
  const messages = conversationIds.length
    ? await Message.find({ conversation: { $in: conversationIds } }).lean()
    : [];

  const orders = mapOrdersForMerchant(ordersRaw, merchantId);

  return {
    profile,
    products,
    orders,
    auctions,
    bids,
    product_reviews: productReviews,
    conversations,
    messages,
  };
}

/**
 * Stream merchant-scoped backup ZIP (own catalog, sales, auctions, messages).
 */
export const downloadMerchantBackup = async (req, res, next) => {
  const exportedAt = new Date().toISOString();
  const stamp = backupTimestamp();
  const merchantId = req.userId;
  const filename = `kgf-merchant-backup_${stamp}.zip`;

  try {
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => next(err));
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    archive.pipe(res);

    const data = await collectMerchantBackupData(merchantId);
    const recordCounts = {};
    const checksums = {};

    const merchantFiles = [
      ['merchant/profile.json', { exported_at: exportedAt, record: data.profile }],
      ['merchant/products.json', { exported_at: exportedAt, records: data.products }],
      ['merchant/orders.json', { exported_at: exportedAt, records: data.orders }],
      ['merchant/auctions.json', { exported_at: exportedAt, records: data.auctions }],
      ['merchant/bids.json', { exported_at: exportedAt, records: data.bids }],
      ['merchant/product_reviews.json', { exported_at: exportedAt, records: data.product_reviews }],
      ['merchant/conversations.json', { exported_at: exportedAt, records: data.conversations }],
      ['merchant/messages.json', { exported_at: exportedAt, records: data.messages }],
    ];

    for (const [path, payload] of merchantFiles) {
      const body = toBackupJson(payload);
      checksums[path] = sha256(body);
      const key = path.replace('merchant/', '').replace('.json', '');
      recordCounts[key] = Array.isArray(payload.records)
        ? payload.records.length
        : payload.record
          ? 1
          : 0;
      archive.append(body, { name: path });
    }

    const manifest = {
      backup_format_version: BACKUP_FORMAT_VERSION,
      application: 'kgf-gold-tradex',
      scope: 'merchant',
      merchant_id: merchantId,
      exported_at: exportedAt,
      exported_by: {
        user_id: merchantId,
        email: req.user?.email,
        role: req.user?.role,
      },
      record_counts: recordCounts,
      files: ['manifest.json', ...merchantFiles.map(([path]) => path)],
      checksums_sha256: checksums,
      notes:
        'Contains only this merchant’s data. Passwords and tokens are excluded. Store offline securely.',
    };

    archive.append(toBackupJson(manifest), { name: 'manifest.json' });
    await archive.finalize();
  } catch (error) {
    if (!res.headersSent) {
      return next(error instanceof AppError ? error : new AppError(error.message || 'Backup failed', 500));
    }
    next(error);
  }
};
