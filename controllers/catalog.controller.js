import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductReview from '../models/ProductReview.js';

/** URL slug (storefront filters) → Product.category value */
const SLUG_TO_CATEGORY = {
  rings: 'Rings',
  necklaces: 'Necklaces',
  earrings: 'Earrings',
  bracelets: 'Bracelets',
  pendants: 'Pendants',
  biscuits: 'Biscuits',
  coins: 'Coins',
  bars: 'Bars',
};

/**
 * Public storefront listing: published products only.
 */
export const getPublishedProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 48, 100);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const slug = (req.query.category || '').toLowerCase();

    const query = { isPublished: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (slug && slug !== 'all' && SLUG_TO_CATEGORY[slug]) {
      query.category = SLUG_TO_CATEGORY[slug];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('merchant', 'name merchantVerified')
        .lean(),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

async function reviewSummaryForProduct(productId) {
  const agg = await ProductReview.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  if (!agg.length) {
    return { count: 0, avgRating: null };
  }
  return {
    count: agg[0].count,
    avgRating: Math.round(agg[0].avgRating * 10) / 10,
  };
}

/**
 * Single published product (storefront detail).
 */
export const getPublishedProductById = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product id' });
    }
    const product = await Product.findOne({ _id: productId, isPublished: true })
      .populate('merchant', 'name merchantVerified')
      .lean();
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const [reviewSummary, reviews] = await Promise.all([
      reviewSummaryForProduct(productId),
      ProductReview.find({ product: productId }).sort({ createdAt: -1 }).limit(30).lean(),
    ]);
    res.status(200).json({
      success: true,
      data: { product, reviewSummary, reviews },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List reviews for a published product (newest first).
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product id' });
    }
    const exists = await Product.exists({ _id: productId, isPublished: true });
    if (!exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const reviews = await ProductReview.find({ product: productId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.status(200).json({ success: true, data: { reviews } });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a review for a published product (public; rate-limit at edge in production).
 */
export const createProductReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product id' });
    }
    const product = await Product.findOne({ _id: productId, isPublished: true }).select('_id');
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    let authorName = (req.body.authorName || '').trim();
    if (!authorName) authorName = 'Anonymous';
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || '').trim();

    const review = await ProductReview.create({
      product: productId,
      authorName,
      rating,
      comment,
    });
    const reviewSummary = await reviewSummaryForProduct(productId);
    res.status(201).json({
      success: true,
      data: { review: review.toJSON(), reviewSummary },
    });
  } catch (error) {
    next(error);
  }
};
