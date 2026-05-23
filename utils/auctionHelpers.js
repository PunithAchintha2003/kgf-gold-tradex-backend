import { DEFAULT_PRODUCT_CATEGORY, PRODUCT_CATEGORIES } from '../constants/productCategories.js';

const MAX_IMAGES = 5;
const ANTI_SNIPE_WINDOW_MS = 30 * 1000;
const ANTI_SNIPE_EXTENSION_MS = 2 * 60 * 1000;

export function normalizeCategory(value) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (PRODUCT_CATEGORIES.includes(v)) return v;
  return DEFAULT_PRODUCT_CATEGORY;
}

export function normalizeAuctionImages(body) {
  if (Array.isArray(body.images)) {
    return body.images
      .filter((u) => typeof u === 'string' && /^https:\/\//i.test(u.trim()))
      .map((u) => u.trim())
      .slice(0, MAX_IMAGES);
  }
  return [];
}

export function computeNextMinimum(currentBid, minIncrement) {
  return currentBid + (minIncrement || 2000);
}

export function applyAntiSnipe(endsAt) {
  const now = Date.now();
  const endMs = new Date(endsAt).getTime();
  if (endMs - now <= ANTI_SNIPE_WINDOW_MS) {
    return new Date(endMs + ANTI_SNIPE_EXTENSION_MS);
  }
  return endsAt;
}

export function serializeAuctionForPublic(auction, merchantName) {
  const doc = auction.toObject ? auction.toObject() : { ...auction };
  const endsAt = doc.endsAt;
  const timeLeftMs = Math.max(0, new Date(endsAt).getTime() - Date.now());
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    images: doc.images || [],
    category: doc.category,
    purity: doc.purity,
    weight: doc.weight,
    condition: doc.condition,
    startingBid: doc.startingBid,
    currentBid: doc.currentBid,
    nextMinimum: doc.nextMinimum,
    minIncrement: doc.minIncrement,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
    timeLeftMs,
    bidCount: doc.bidCount,
    watcherCount: doc.watcherCount,
    status: doc.status,
    seller: merchantName || 'Verified Merchant',
    merchantId: String(doc.merchant?._id || doc.merchant),
    isEnding: timeLeftMs > 0 && timeLeftMs < 2 * 3600 * 1000,
    winnerId: doc.winner ? String(doc.winner) : null,
    winnerBidId: doc.winnerBid ? String(doc.winnerBid) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export { ANTI_SNIPE_WINDOW_MS, ANTI_SNIPE_EXTENSION_MS, MAX_IMAGES };
