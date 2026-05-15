import Product from '../models/Product.js';
import User from '../models/User.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { AppError } from '../utils/AppError.js';
import { uploadImageBuffer, isCloudinaryConfigured } from '../utils/cloudinaryUpload.js';
import { DEFAULT_PRODUCT_CATEGORY, PRODUCT_CATEGORIES } from '../constants/productCategories.js';

const MAX_IMAGES = 5;

/** Normalize image URL list from JSON body (Cloudinary HTTPS URLs). */
function normalizeProductImages(body) {
  if (Array.isArray(body.images)) {
    return body.images
      .filter((u) => typeof u === 'string' && /^https:\/\//i.test(u.trim()))
      .map((u) => u.trim())
      .slice(0, MAX_IMAGES);
  }
  const single = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  if (single && /^https:\/\//i.test(single)) {
    return [single];
  }
  return [];
}

function normalizeCategory(value) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (PRODUCT_CATEGORIES.includes(v)) return v;
  return DEFAULT_PRODUCT_CATEGORY;
}

const assertCanPublish = async (userId, wantsPublished) => {
  if (!wantsPublished) return;
  const user = await User.findById(userId).select('merchantVerified role');
  if (!user || user.role !== 'MERCHANT') {
    throw new AppError('Merchant account required', 403);
  }
  if (!user.merchantVerified) {
    throw new AppError('Verified seller status is required to publish products', 403);
  }
};

/**
 * Merchant dashboard summary
 */
export const getMerchantDashboardStats = async (req, res, next) => {
  try {
    const merchantId = req.userId;
    const user = await User.findById(merchantId).select('merchantVerified name');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const [totalProducts, publishedProducts, draftProducts, stockAgg, orderStats] = await Promise.all([
      Product.countDocuments({ merchant: merchantId }),
      Product.countDocuments({ merchant: merchantId, isPublished: true }),
      Product.countDocuments({ merchant: merchantId, isPublished: false }),
      Product.aggregate([
        { $match: { merchant: user._id } },
        { $group: { _id: null, units: { $sum: '$stock' } } },
      ]),
      PurchaseOrder.aggregate([
        { $match: { 'items.merchant': user._id } },
        { $unwind: '$items' },
        { $match: { 'items.merchant': user._id } },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: { $multiply: ['$items.unitPriceLkr', '$items.quantity'] } },
            orderIds: { $addToSet: '$_id' },
          },
        },
      ]),
    ]);

    const inventoryUnits = stockAgg[0]?.units ?? 0;
    const totalIncomeLkr = orderStats[0]?.totalIncome ?? 0;
    const totalOrderCount = orderStats[0]?.orderIds?.length ?? 0;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          merchantVerified: user.merchantVerified,
          totalProducts,
          publishedProducts,
          draftProducts,
          inventoryUnits,
          totalIncomeLkr,
          totalOrderCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List own products (paginated)
 */
export const getMyProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const query = { merchant: req.userId };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
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

/**
 * Get single product (must belong to merchant)
 */
export const getMyProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid product ID format', 400));
    }

    const product = await Product.findOne({ _id: id, merchant: req.userId });
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload product images to Cloudinary (multipart field "images", max 5 per request).
 * Optional query: ?productId=<mongoId> to group assets under that product folder.
 */
export const uploadProductImages = async (req, res, next) => {
  try {
    if (!isCloudinaryConfigured()) {
      return next(new AppError('Image uploads are not configured on the server', 503));
    }

    const files = req.files;
    if (!files?.length) {
      return next(new AppError('No images provided', 400));
    }

    const productId = (req.query.productId || '').trim();
    let folder = `kgf-gold-tradex/merchants/${req.userId}/products`;
    if (productId && /^[0-9a-fA-F]{24}$/.test(productId)) {
      const owned = await Product.exists({ _id: productId, merchant: req.userId });
      if (!owned) {
        return next(new AppError('Product not found', 404));
      }
      folder += `/${productId}`;
    }

    const urls = [];
    for (const file of files) {
      const url = await uploadImageBuffer(file.buffer, folder);
      urls.push(url);
    }

    res.status(200).json({
      success: true,
      message: 'Images uploaded',
      data: { urls },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create product
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      title,
      description = '',
      sku = '',
      price,
      currency = 'LKR',
      stock = 0,
      isPublished = false,
    } = req.body;

    const category = normalizeCategory(req.body.category);

    const images = normalizeProductImages(req.body);
    const imageUrl = images[0] || '';

    await assertCanPublish(req.userId, Boolean(isPublished));

    try {
      const product = await Product.create({
        merchant: req.userId,
        title,
        description,
        sku,
        price,
        currency,
        category,
        stock,
        imageUrl,
        images,
        isPublished,
      });

      res.status(201).json({
        success: true,
        message: 'Product created',
        data: { product },
      });
    } catch (err) {
      if (err.code === 11000) {
        return next(new AppError('SKU must be unique among your products', 400));
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid product ID format', 400));
    }

    const product = await Product.findOne({ _id: id, merchant: req.userId });
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    const nextPublished =
      req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : product.isPublished;

    await assertCanPublish(req.userId, nextPublished);

    const allowed = ['title', 'description', 'sku', 'price', 'currency', 'stock', 'isPublished'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        product[key] = req.body[key];
      }
    }

    if (req.body.category !== undefined) {
      product.category = normalizeCategory(req.body.category);
    }

    if (req.body.images !== undefined) {
      product.images = normalizeProductImages(req.body);
      product.imageUrl = product.images[0] || '';
    } else if (req.body.imageUrl !== undefined) {
      const v = typeof req.body.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
      product.imageUrl = v;
      product.images = v && /^https:\/\//i.test(v) ? [v] : [];
    }

    try {
      await product.save();
      res.status(200).json({
        success: true,
        message: 'Product updated',
        data: { product },
      });
    } catch (err) {
      if (err.code === 11000) {
        return next(new AppError('SKU must be unique among your products', 400));
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid product ID format', 400));
    }

    const result = await Product.deleteOne({ _id: id, merchant: req.userId });
    if (result.deletedCount === 0) {
      return next(new AppError('Product not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Order lines for this merchant (buyer snapshot for fulfilment).
 */
function safeHttpUrl(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  return t.slice(0, 2048);
}

export const getMerchantOrders = async (req, res, next) => {
  try {
    const merchantId = req.userId;
    const orders = await PurchaseOrder.find({ 'items.merchant': merchantId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const productIds = new Set();
    for (const order of orders) {
      for (const item of order.items || []) {
        if (!item.merchant || String(item.merchant) !== String(merchantId)) continue;
        if (!item._id) continue;
        if (item.product) productIds.add(String(item.product));
      }
    }

    const thumbByProductId = new Map();
    if (productIds.size > 0) {
      const products = await Product.find({ _id: { $in: [...productIds] } })
        .select('images imageUrl')
        .lean();
      for (const p of products) {
        const imgs = [...(p.images || [])].filter(Boolean);
        const url = safeHttpUrl(imgs[0]) || safeHttpUrl(p.imageUrl);
        if (url) thumbByProductId.set(String(p._id), url);
      }
    }

    const lines = [];
    for (const order of orders) {
      for (const item of order.items || []) {
        if (!item.merchant || String(item.merchant) !== String(merchantId)) continue;
        if (!item._id) continue;
        let imageUrl = safeHttpUrl(item.imageUrl);
        if (!imageUrl && item.product) {
          imageUrl = thumbByProductId.get(String(item.product)) || null;
        }
        lines.push({
          orderId: String(order._id),
          lineItemId: String(item._id),
          stripeSessionId: order.stripeSessionId,
          productId: item.product ? String(item.product) : null,
          name: item.name,
          unitPriceLkr: item.unitPriceLkr,
          quantity: item.quantity,
          deliveryStatus: item.deliveryStatus || 'pending',
          buyer: order.buyerSnapshot || null,
          createdAt: order.createdAt,
          orderTotalLkr: order.amountTotalLkr,
          imageUrl: imageUrl ?? null,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { lines },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update delivery status for a line that belongs to this merchant.
 */
export const updateMerchantOrderLineDelivery = async (req, res, next) => {
  try {
    const { orderId, lineItemId } = req.params;
    const { deliveryStatus } = req.body;

    const order = await PurchaseOrder.findById(orderId);
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    const item = order.items.id(lineItemId);
    if (!item) {
      return next(new AppError('Line item not found', 404));
    }
    if (!item.merchant || String(item.merchant) !== String(req.userId)) {
      return next(new AppError('This line does not belong to your store', 403));
    }

    item.deliveryStatus = deliveryStatus;
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        lineItem: {
          _id: item._id,
          deliveryStatus: item.deliveryStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
