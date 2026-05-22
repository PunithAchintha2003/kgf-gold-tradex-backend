import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ARTryOnSession from '../models/ARTryOnSession.js';
import { AppError } from '../utils/AppError.js';

/**
 * Inferred AR try-on configuration per jewelry category.
 *
 * `anchor` selects which body landmark we attach the overlay to on the client:
 *   - finger:   ring finger PIP/MCP midpoint (HandLandmarker)
 *   - wrist:    hand wrist landmark         (HandLandmarker)
 *   - ear:      both earlobes               (FaceLandmarker)
 *   - neck:     below chin                  (FaceLandmarker)
 *   - palm:     palm center (fallback)      (HandLandmarker)
 *
 * The numeric defaults are tuned for a "looks good out of the box" experience;
 * users can fine-tune via sliders in the modal.
 */
const CATEGORY_DEFAULTS = {
  Rings:     { anchor: 'finger', camera: 'user',        scale: 1.4, rotationOffsetDeg: 0,   xOffset: 0,   yOffset: 0.05, mirrored: true },
  Bracelets: { anchor: 'wrist',  camera: 'user',        scale: 2.0, rotationOffsetDeg: 0,   xOffset: 0,   yOffset: 0,    mirrored: true },
  Earrings:  { anchor: 'ear',    camera: 'user',        scale: 1.0, rotationOffsetDeg: 0,   xOffset: 0,   yOffset: 0.05, mirrored: true },
  Necklaces: { anchor: 'neck',   camera: 'user',        scale: 1.8, rotationOffsetDeg: 0,   xOffset: 0,   yOffset: 0.18, mirrored: true },
  Pendants:  { anchor: 'neck',   camera: 'user',        scale: 1.2, rotationOffsetDeg: 0,   xOffset: 0,   yOffset: 0.16, mirrored: true },
  Biscuits:  { anchor: 'palm',   camera: 'user',        scale: 1.8, rotationOffsetDeg: 0,   xOffset: 0,   yOffset: 0,    mirrored: true },
  Coins:     { anchor: 'palm',   camera: 'user',        scale: 1.6, rotationOffsetDeg: 0,   xOffset: 0,   yOffset: 0,    mirrored: true },
  Bars:      { anchor: 'palm',   camera: 'user',        scale: 2.0, rotationOffsetDeg: 0,   xOffset: 0,   yOffset: 0,    mirrored: true },
};

const FALLBACK_CONFIG = {
  anchor: 'palm',
  camera: 'user',
  scale: 1.5,
  rotationOffsetDeg: 0,
  xOffset: 0,
  yOffset: 0,
  mirrored: true,
};

/**
 * Resolve AR config for a product. Public endpoint: anyone can fetch.
 */
export const getARConfig = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError('Invalid product id', 400);
    }
    const product = await Product.findOne({ _id: productId, isPublished: true })
      .select('_id title category images imageUrl')
      .lean();
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const category = product.category || 'Rings';
    const base = CATEGORY_DEFAULTS[category] || FALLBACK_CONFIG;

    // Pick the best overlay image. The client crops alpha + composites this
    // PNG/JPG onto the camera feed, so any high-quality square product photo
    // works. (Hosting an alpha-cut-out version in the catalog gives the best
    // result and is recommended for production catalogs.)
    const overlayImage =
      (Array.isArray(product.images) && product.images[0]) || product.imageUrl || '';

    return res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        title: product.title,
        category,
        overlayImage,
        config: { ...base },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Start a try-on session. Allowed anonymously (req.user may be null).
 */
export const startSession = async (req, res, next) => {
  try {
    const { productId, anchor, camera, client } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError('Invalid product id', 400);
    }
    const product = await Product.findOne({ _id: productId, isPublished: true })
      .select('_id category')
      .lean();
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const inferredCategory = product.category || 'Rings';
    const inferred = CATEGORY_DEFAULTS[inferredCategory] || FALLBACK_CONFIG;

    const session = await ARTryOnSession.create({
      user: req.userId ? new mongoose.Types.ObjectId(req.userId) : null,
      product: product._id,
      anchor: anchor || inferred.anchor,
      camera: camera === 'environment' ? 'environment' : inferred.camera || 'user',
      startedAt: new Date(),
      client: {
        userAgent: (client && client.userAgent ? String(client.userAgent) : '').slice(0, 500),
        viewport: {
          width: client && Number(client?.viewport?.width) > 0 ? Number(client.viewport.width) : 0,
          height: client && Number(client?.viewport?.height) > 0 ? Number(client.viewport.height) : 0,
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: { session: session.toJSON() },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Finalize a try-on session (durationMs computed server-side).
 */
export const endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.isValidObjectId(sessionId)) {
      throw new AppError('Invalid session id', 400);
    }
    const session = await ARTryOnSession.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Optional ownership check: only the original visitor (anonymous or matching user) can close.
    if (session.user && req.userId && String(session.user) !== String(req.userId)) {
      throw new AppError('Cannot end another user\'s session', 403);
    }

    const now = new Date();
    session.endedAt = now;
    session.durationMs = Math.max(0, now.getTime() - new Date(session.startedAt).getTime());

    const { frameCount, trackedFrameCount, snapshotCount, shareCount, endReason, errorMessage } = req.body;
    if (Number.isFinite(frameCount)) session.frameCount = Math.max(0, Math.floor(frameCount));
    if (Number.isFinite(trackedFrameCount)) session.trackedFrameCount = Math.max(0, Math.floor(trackedFrameCount));
    if (Number.isFinite(snapshotCount)) session.snapshotCount = Math.max(0, Math.floor(snapshotCount));
    if (Number.isFinite(shareCount)) session.shareCount = Math.max(0, Math.floor(shareCount));
    if (endReason && ['closed', 'error', 'addedToCart', 'navigated', 'timeout'].includes(endReason)) {
      session.endReason = endReason;
    }
    if (typeof errorMessage === 'string') {
      session.errorMessage = errorMessage.slice(0, 500);
    }

    await session.save();
    return res.status(200).json({ success: true, data: { session: session.toJSON() } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Record a snapshot/share event. We do NOT store the image bytes here; the
 * captured PNG stays on the client (downloaded by the user / shared via the
 * Web Share API). Only counters are persisted.
 */
export const recordSnapshot = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.isValidObjectId(sessionId)) {
      throw new AppError('Invalid session id', 400);
    }
    const session = await ARTryOnSession.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const kind = req.body.kind === 'share' ? 'share' : 'snapshot';
    if (kind === 'share') {
      session.shareCount += 1;
    } else {
      session.snapshotCount += 1;
    }
    await session.save();

    return res.status(200).json({
      success: true,
      data: { snapshotCount: session.snapshotCount, shareCount: session.shareCount },
    });
  } catch (error) {
    return next(error);
  }
};
