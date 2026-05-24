import crypto from 'crypto';
import archiver from 'archiver';
import User from '../models/User.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import ProductReview from '../models/ProductReview.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import PendingCheckout from '../models/PendingCheckout.js';
import ARTryOnSession from '../models/ARTryOnSession.js';
import { AppError } from '../utils/AppError.js';
import { toBackupJson } from '../utils/backupSerialize.js';

const BACKUP_FORMAT_VERSION = '1.0';

const USER_SAFE_SELECT =
  '-password -refreshToken -refreshTokenExpiry -emailVerificationCodeHash -emailVerificationExpires -emailVerificationAttempts -pendingEmail -pendingPassword -credentialOtpHash -credentialOtpExpires -credentialOtpAttempts -credentialOtpPurpose -credentialOtpTargetEmail -loginOtpHash -loginOtpExpires -loginOtpAttempts -loginSessionTokenHash -loginSessionExpires -passwordResetOtpHash -passwordResetOtpExpires -passwordResetOtpAttempts -passwordResetSessionTokenHash -passwordResetSessionExpires -passwordResetOtpVerified';

const PLATFORM_COLLECTIONS = [
  { path: 'platform/users.json', model: User, query: () => User.find().select(USER_SAFE_SELECT).lean() },
  { path: 'platform/products.json', model: Product, query: () => Product.find().lean() },
  { path: 'platform/purchase_orders.json', model: PurchaseOrder, query: () => PurchaseOrder.find().lean() },
  { path: 'platform/auctions.json', model: Auction, query: () => Auction.find().lean() },
  { path: 'platform/bids.json', model: Bid, query: () => Bid.find().lean() },
  { path: 'platform/product_reviews.json', model: ProductReview, query: () => ProductReview.find().lean() },
  { path: 'platform/conversations.json', model: Conversation, query: () => Conversation.find().lean() },
  { path: 'platform/messages.json', model: Message, query: () => Message.find().lean() },
  { path: 'platform/pending_checkouts.json', model: PendingCheckout, query: () => PendingCheckout.find().lean() },
  { path: 'platform/ar_try_on_sessions.json', model: ARTryOnSession, query: () => ARTryOnSession.find().lean() },
];

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function fetchSpotTradingBackup(authorizationHeader) {
  const baseUrl = process.env.SPOT_TRADE_API_URL || 'http://localhost:8001/api/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/spot-trade/admin/backup`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
      Accept: 'application/zip',
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Spot trading backup failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Stream a full platform backup ZIP (MongoDB + spot trading service).
 */
export const downloadPlatformBackup = async (req, res, next) => {
  const exportedAt = new Date().toISOString();
  const stamp = backupTimestamp();
  const filename = `kgf-gold-tradex-backup_${stamp}.zip`;

  try {
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => next(err));
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    archive.pipe(res);

    const recordCounts = {};
    const checksums = {};

    for (const { path, query } of PLATFORM_COLLECTIONS) {
      const records = await query();
      const payload = {
        exported_at: exportedAt,
        collection: path.replace('platform/', '').replace('.json', ''),
        records,
      };
      const body = toBackupJson(payload);
      checksums[path] = sha256(body);
      recordCounts[path.replace('platform/', '').replace('.json', '')] = records.length;
      archive.append(body, { name: path });
    }

    let spotStatus = 'included';
    let spotError = null;
    try {
      const spotZip = await fetchSpotTradingBackup(req.headers.authorization);
      archive.append(spotZip, { name: 'spot-trading/kgf-spot-trading-backup.zip' });
      checksums['spot-trading/kgf-spot-trading-backup.zip'] = crypto
        .createHash('sha256')
        .update(spotZip)
        .digest('hex');
    } catch (spotErr) {
      spotStatus = 'failed';
      spotError = spotErr instanceof Error ? spotErr.message : 'Spot trading backup unavailable';
      const failureDoc = {
        exported_at: exportedAt,
        error: spotError,
        hint: 'Ensure the spot trading API is running and SPOT_TRADE_API_URL is configured.',
      };
      const body = toBackupJson(failureDoc);
      archive.append(body, { name: 'spot-trading/EXPORT_FAILED.json' });
      checksums['spot-trading/EXPORT_FAILED.json'] = sha256(body);
    }

    const manifest = {
      backup_format_version: BACKUP_FORMAT_VERSION,
      application: 'kgf-gold-tradex',
      scope: 'full_platform',
      exported_at: exportedAt,
      exported_by: {
        user_id: req.userId,
        email: req.user?.email,
        role: req.user?.role,
      },
      record_counts: recordCounts,
      spot_trading: spotStatus,
      ...(spotError ? { spot_trading_error: spotError } : {}),
      files: [
        'manifest.json',
        ...PLATFORM_COLLECTIONS.map((c) => c.path),
        spotStatus === 'included'
          ? 'spot-trading/kgf-spot-trading-backup.zip'
          : 'spot-trading/EXPORT_FAILED.json',
      ],
      checksums_sha256: checksums,
      notes:
        'Passwords, refresh tokens, and OTP secrets are excluded. Store offline in a secure location.',
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
