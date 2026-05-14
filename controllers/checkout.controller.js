import Stripe from 'stripe';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import PendingCheckout from '../models/PendingCheckout.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function storefrontOrigin() {
  const raw = process.env.STOREFRONT_URL || 'http://localhost:4000';
  return raw.replace(/\/$/, '');
}

function safeImageUrl(raw) {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim().slice(0, 2048);
  if (!/^https?:\/\//i.test(t)) return undefined;
  return t;
}

/**
 * Stripe LKR uses 2 decimal places: `unit_amount` / line `amount_total` / session `amount_total`
 * are in the smallest unit (1/100 of a rupee). App DB stores whole LKR.
 */
function lkrMajorToStripeMinor(lkrMajor) {
  return Math.round(Number(lkrMajor) * 100);
}

function stripeMinorToLkrMajor(minor) {
  return Math.round(Number(minor) / 100);
}

/**
 * Create a Stripe Checkout Session for cart line items (LKR).
 * Persists cart lines (product + merchant) on PendingCheckout for verify-session.
 */
export const createCartCheckoutSession = async (req, res, next) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: 'Payments are not configured. Set STRIPE_SECRET_KEY on the server.',
      });
    }

    const { items } = req.body;
    const userId = req.userId;

    const pendingItems = items.map((item) => ({
      name: String(item.name).trim().slice(0, 200),
      priceLkr: Math.round(item.priceLkr),
      quantity: item.quantity,
      productId: item.productId && mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : undefined,
      merchantId: item.merchantId && mongoose.Types.ObjectId.isValid(item.merchantId) ? item.merchantId : undefined,
      imageUrl: safeImageUrl(item.imageUrl) || safeImageUrl(item.image) || undefined,
    }));

    const pending = await PendingCheckout.create({
      user: userId,
      items: pendingItems,
    });

    const lineItems = items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: 'lkr',
        product_data: {
          name: item.name.slice(0, 250),
        },
        unit_amount: lkrMajorToStripeMinor(item.priceLkr),
      },
    }));

    const origin = storefrontOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: userId,
      metadata: {
        userId,
        pendingCheckoutId: pending._id.toString(),
      },
      line_items: lineItems,
      success_url: `${origin}/products?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/products?checkout=cancelled`,
    });

    pending.stripeSessionId = session.id;
    await pending.save();

    res.status(200).json({
      success: true,
      data: { url: session.url },
    });
  } catch (error) {
    next(error);
  }
};

function buildItemsFromStripeOnly(lineRows) {
  return lineRows.map((li) => {
    const qty = li.quantity || 1;
    const lineTotalMinor = typeof li.amount_total === 'number' ? li.amount_total : 0;
    const unitMinor = qty > 0 ? Math.round(lineTotalMinor / qty) : lineTotalMinor;
    return {
      name: (li.description || 'Product').slice(0, 300),
      unitPriceLkr: stripeMinorToLkrMajor(unitMinor),
      quantity: qty,
      deliveryStatus: 'pending',
    };
  });
}

function zipPendingWithStripe(lineRows, pendingItems) {
  const rows = [];
  for (let i = 0; i < lineRows.length; i += 1) {
    const li = lineRows[i];
    const pend = pendingItems?.[i];
    const qty = li.quantity || 1;
    const lineTotalMinor = typeof li.amount_total === 'number' ? li.amount_total : 0;
    const unitMinor = qty > 0 ? Math.round(lineTotalMinor / qty) : lineTotalMinor;
    const name = (pend?.name || li.description || 'Product').slice(0, 300);
    const row = {
      name,
      unitPriceLkr: stripeMinorToLkrMajor(unitMinor),
      quantity: qty,
      deliveryStatus: 'pending',
    };
    if (pend?.productId && mongoose.Types.ObjectId.isValid(pend.productId)) {
      row.product = pend.productId;
    }
    if (pend?.merchantId && mongoose.Types.ObjectId.isValid(pend.merchantId)) {
      row.merchant = pend.merchantId;
    }
    if (pend?.imageUrl) {
      row.imageUrl = pend.imageUrl;
    }
    rows.push(row);
  }
  return rows;
}

function buildItemsFromPendingOnly(pendingItems) {
  return pendingItems.map((pend) => {
    const row = {
      name: pend.name.slice(0, 300),
      unitPriceLkr: Math.round(pend.priceLkr),
      quantity: pend.quantity,
      deliveryStatus: 'pending',
    };
    if (pend.productId && mongoose.Types.ObjectId.isValid(pend.productId)) {
      row.product = pend.productId;
    }
    if (pend.merchantId && mongoose.Types.ObjectId.isValid(pend.merchantId)) {
      row.merchant = pend.merchantId;
    }
    if (pend.imageUrl) {
      row.imageUrl = pend.imageUrl;
    }
    return row;
  });
}

/**
 * Confirm Checkout Session was paid (and belongs to the signed-in user).
 */
export const verifyCartCheckoutSession = async (req, res, next) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: 'Payments are not configured.',
      });
    }

    const { session_id: sessionId } = req.query;
    const session = await stripe.checkout.sessions.retrieve(String(sessionId), {
      expand: ['line_items'],
    });

    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (!sessionUserId || sessionUserId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'This payment session does not belong to your account.',
      });
    }

    const paid = session.payment_status === 'paid';

    if (paid) {
      let pending = await PendingCheckout.findOne({
        stripeSessionId: session.id,
        user: req.userId,
      });

      if (!pending && session.metadata?.pendingCheckoutId) {
        pending = await PendingCheckout.findOne({
          _id: session.metadata.pendingCheckoutId,
          user: req.userId,
        });
      }

      const lineRows = session.line_items?.data || [];
      const buyer = await User.findById(req.userId).select('name email phone address').lean();
      const buyerSnapshot = buyer
        ? {
            name: buyer.name || '',
            email: buyer.email || '',
            phone: buyer.phone || '',
            address: buyer.address || '',
          }
        : undefined;

      let items;
      if (pending?.items?.length && lineRows.length > 0) {
        items = zipPendingWithStripe(lineRows, pending.items);
      } else if (lineRows.length > 0) {
        items = buildItemsFromStripeOnly(lineRows);
      } else if (pending?.items?.length) {
        items = buildItemsFromPendingOnly(pending.items);
      } else {
        items = [];
      }

      const amountTotal =
        typeof session.amount_total === 'number'
          ? stripeMinorToLkrMajor(session.amount_total)
          : items.reduce((s, i) => s + i.unitPriceLkr * i.quantity, 0);

      if (items.length > 0) {
        try {
          await PurchaseOrder.create({
            user: req.userId,
            stripeSessionId: session.id,
            amountTotalLkr: amountTotal,
            currency: session.currency || 'lkr',
            items,
            paymentStatus: session.payment_status,
            buyerSnapshot,
          });
        } catch (err) {
          if (err?.code !== 11000) {
            throw err;
          }
        }
      }

      if (pending?._id) {
        await PendingCheckout.deleteOne({ _id: pending._id });
      }
    }

    res.status(200).json({
      success: true,
      data: { paid },
    });
  } catch (error) {
    if (error?.type === 'StripeInvalidRequestError' || error?.code === 'resource_missing') {
      return next(new AppError('Invalid or expired checkout session', 400));
    }
    next(error);
  }
};

/**
 * List completed storefront purchases for the signed-in user.
 */
export const listPurchaseOrders = async (req, res, next) => {
  try {
    const orders = await PurchaseOrder.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const productIds = new Set();
    for (const order of orders) {
      for (const item of order.items || []) {
        if (item.product) productIds.add(String(item.product));
      }
    }

    if (productIds.size > 0) {
      const products = await Product.find({ _id: { $in: [...productIds] } })
        .select('title images imageUrl')
        .lean();
      const byId = Object.fromEntries(products.map((p) => [String(p._id), p]));
      for (const order of orders) {
        for (const item of order.items || []) {
          if (item.product) {
            const key = String(item.product);
            if (byId[key]) item.product = byId[key];
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};
