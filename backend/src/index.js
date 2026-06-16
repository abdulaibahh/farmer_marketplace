const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const Stripe = require('stripe');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const PORT = Number(process.env.PORT || 4000);
const NODE_ENV = String(process.env.NODE_ENV || 'development').toLowerCase();
const RAW_JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const JWT_SECRET = RAW_JWT_SECRET || 'replace-me';
const RAW_CLIENT_ORIGIN = String(process.env.CLIENT_ORIGIN || '').trim();
const CLIENT_ORIGINS = (RAW_CLIENT_ORIGIN || 'http://localhost:8081')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const RAW_PAYMENT_RETURN_URL = String(process.env.PAYMENT_RETURN_URL || '').trim();
const PAYMENT_RETURN_URL = RAW_PAYMENT_RETURN_URL || CLIENT_ORIGINS[0] || 'http://localhost:8081';
const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
const PAYMENT_FX_RATE = Math.max(1, Number(process.env.PAYMENT_FX_RATE || 20000));
const RAW_STRIPE_SECRET_KEY = String(process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_ENABLED = RAW_STRIPE_SECRET_KEY.length > 0;
const STRIPE_WEBHOOK_SECRET = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const PAYMENT_METHODS = ['Secure Card Checkout', 'Orange Money', 'Africell Money', 'Bank Transfer', 'Cash on Delivery'];
const DELIVERY_METHODS = ['Pickup', 'Local Delivery', 'Courier'];
const CATEGORY_OPTIONS = ['All', 'Grains', 'Roots & Tubers', 'Vegetables', 'Fruits', 'Spices', 'Legumes'];

function validateRuntimeConfig() {
  const missing = [];

  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (NODE_ENV === 'production') {
    if (!RAW_JWT_SECRET || RAW_JWT_SECRET.length < 32) {
      missing.push('JWT_SECRET (use a unique 32+ character secret)');
    }

    if (!RAW_CLIENT_ORIGIN) {
      missing.push('CLIENT_ORIGIN');
    }

    if (!RAW_STRIPE_SECRET_KEY) {
      missing.push('STRIPE_SECRET_KEY');
    }

    if (!STRIPE_WEBHOOK_SECRET) {
      missing.push('STRIPE_WEBHOOK_SECRET');
    }

    if (!RAW_PAYMENT_RETURN_URL) {
      missing.push('PAYMENT_RETURN_URL');
    }
  }

  if (missing.length > 0) {
    console.error(`Missing required backend environment values: ${missing.join(', ')}`);
    console.error('Copy backend/.env.example to backend/.env and configure PostgreSQL, JWT, and Stripe before starting.');
    process.exit(1);
  }
}

validateRuntimeConfig();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const stripe = STRIPE_ENABLED ? new Stripe(RAW_STRIPE_SECRET_KEY) : null;

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const allowed = !origin || CLIENT_ORIGINS.includes('*') || CLIENT_ORIGINS.includes(origin);
      callback(null, allowed);
    },
    credentials: false
  })
);
app.use(morgan('dev'));

function slugify(value) {
  return String(value || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'product';
}

function createError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details) {
    error.details = details;
  }
  return error;
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function extractStripeOrderId(source) {
  const metadata = source?.metadata || {};
  const rawOrderId = metadata.order_id || metadata.orderId || source?.client_reference_id;
  const orderId = Number(rawOrderId);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw createError(400, 'Stripe event is missing the order id metadata.');
  }
  return orderId;
}

function mapStripePaymentStatus(eventType, source) {
  if (eventType === 'checkout.session.async_payment_failed' || eventType === 'payment_intent.payment_failed') {
    return { orderStatus: 'failed', paymentStatus: 'failed' };
  }

  if (eventType === 'checkout.session.expired' || eventType === 'payment_intent.canceled') {
    return { orderStatus: 'failed', paymentStatus: 'cancelled' };
  }

  if (
    eventType === 'checkout.session.async_payment_succeeded' ||
    eventType === 'payment_intent.succeeded' ||
    String(source?.payment_status || '').toLowerCase() === 'paid' ||
    String(source?.payment_status || '').toLowerCase() === 'no_payment_required'
  ) {
    return { orderStatus: 'paid', paymentStatus: 'paid' };
  }

  return { orderStatus: 'awaiting_payment', paymentStatus: 'requires_action' };
}

async function syncStripePayment({ source, eventType }) {
  const orderId = extractStripeOrderId(source);
  const paymentIntentId = typeof source?.payment_intent === 'string' ? source.payment_intent : source?.payment_intent?.id || '';
  const paymentReference = String(source?.id || paymentIntentId || '');
  const checkoutUrl = typeof source?.url === 'string' && source.url.length > 0 ? source.url : null;
  const { orderStatus, paymentStatus } = mapStripePaymentStatus(eventType, source);
  const metadata = {
    stripeEventType: eventType,
    stripeSessionId: source?.id || null,
    stripePaymentIntentId: paymentIntentId || null,
    stripePaymentStatus: source?.payment_status || source?.status || null,
    buyerId: source?.metadata?.buyer_id || source?.metadata?.buyerId || null,
    farmerId: source?.metadata?.farmer_id || source?.metadata?.farmerId || null
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT id, total_price_leones FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );

    if (!orderResult.rows[0]) {
      throw createError(404, 'That order no longer exists.');
    }

    const amountLeones = Number(orderResult.rows[0].total_price_leones || 0);

    await client.query(
      `UPDATE orders
       SET payment_provider = 'stripe',
           payment_reference = $1,
           payment_status = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [paymentReference, orderStatus, orderId]
    );

    await client.query(
      `INSERT INTO payments (order_id, provider, status, amount_leones, currency, provider_reference, checkout_url, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (order_id) DO UPDATE
       SET provider = EXCLUDED.provider,
           status = EXCLUDED.status,
           amount_leones = EXCLUDED.amount_leones,
           currency = EXCLUDED.currency,
           provider_reference = EXCLUDED.provider_reference,
           checkout_url = COALESCE(EXCLUDED.checkout_url, payments.checkout_url),
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
      [
        orderId,
        'stripe',
        paymentStatus,
        amountLeones,
        STRIPE_CURRENCY,
        paymentReference,
        checkoutUrl,
        JSON.stringify(metadata)
      ]
    );

    await client.query('COMMIT');
    return { orderId, orderStatus, paymentStatus };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      throw createError(503, 'STRIPE_WEBHOOK_SECRET is not configured.');
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      throw createError(400, 'Missing Stripe-Signature header.');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      throw createError(400, `Stripe webhook signature verification failed: ${error.message}`);
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded' ||
      event.type === 'checkout.session.async_payment_failed' ||
      event.type === 'checkout.session.expired'
    ) {
      const result = await syncStripePayment({ source: event.data.object, eventType: event.type });
      return res.json({ received: true, event: event.type, ...result });
    }

    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      const result = await syncStripePayment({ source: event.data.object, eventType: event.type });
      return res.json({ received: true, event: event.type, ...result });
    }

    res.json({ received: true, event: event.type, ignored: true });
  })
);

app.use(express.json({ limit: '2mb' }));

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    location: row.location || '',
    phone: row.phone || '',
    storeName: row.store_name || '',
    bio: row.bio || '',
    avatarUrl: row.avatar_url || '',
    isActive: Boolean(row.is_active),
    isVerified: Boolean(row.is_verified),
    preferredPaymentMethod: row.preferred_payment_method || PAYMENT_METHODS[0],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    farmerRating: Number(row.farmer_rating || 0),
    name: row.name,
    category: row.category,
    price: Number(row.price_leones || 0),
    quantity: Number(row.quantity || 0),
    unit: row.unit,
    location: row.location || '',
    imageUrl: row.image_url || '',
    description: row.description || '',
    isAvailable: Boolean(row.is_available),
    isVisible: Boolean(row.is_visible),
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    productId: row.product_id,
    productName: row.product_name,
    category: row.category,
    quantity: Number(row.quantity || 0),
    unit: row.unit,
    unitPrice: Number(row.unit_price_leones || 0),
    totalPrice: Number(row.total_price_leones || 0),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    deliveryMethod: row.delivery_method,
    status: row.status,
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
    deliveredAt: row.delivered_at,
    reviewed: Boolean(row.reviewed),
    paymentProvider: row.payment_provider || '',
    paymentReference: row.payment_reference || '',
    checkoutUrl: row.checkout_url || ''
  };
}

function mapReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    productId: row.product_id,
    rating: Number(row.rating || 0),
    comment: row.comment || '',
    createdAt: row.created_at
  };
}

function buildAnalytics({ users, products, orders }) {
  const completedOrders = orders.filter((order) => order.status === 'delivered');
  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.status === 'delivered' || order.paymentStatus === 'paid' ? Number(order.totalPrice || 0) : 0),
    0
  );
  const activeProducts = products.filter((product) => product.isVisible && product.isAvailable);
  const topProduct = products
    .map((product) => ({
      product,
      sold: orders
        .filter((order) => order.productId === product.id && order.status !== 'cancelled')
        .reduce((sum, order) => sum + Number(order.quantity || 0), 0)
    }))
    .sort((left, right) => right.sold - left.sold)[0];
  const activeOrderCount = orders.filter((order) => order.status !== 'cancelled').length;

  return {
    totalRevenue,
    activeProducts: activeProducts.length,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    totalUsers: users.length,
    farmers: users.filter((user) => user.role === 'farmer').length,
    buyers: users.filter((user) => user.role === 'buyer').length,
    topProductName: topProduct?.product?.name || '—',
    averageOrderValue: activeOrderCount === 0 ? 0 : totalRevenue / activeOrderCount
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function getSafeUsers(client = pool) {
  const { rows } = await client.query(
    `SELECT id, full_name, email, role, location, phone, store_name, bio, avatar_url, is_active, is_verified, preferred_payment_method, created_at, updated_at
     FROM users
     ORDER BY created_at ASC`
  );
  return rows.map(mapUser);
}

async function getProducts(client = pool) {
  const { rows } = await client.query(
    `SELECT
        p.*,
        u.full_name AS farmer_name,
        COALESCE(
          ROUND((
            SELECT AVG(rating)::numeric
            FROM reviews r
            WHERE r.seller_id = u.id
          ), 1),
          4.5
        ) AS farmer_rating
     FROM products p
     JOIN users u ON u.id = p.farmer_id
     ORDER BY p.is_featured DESC, p.created_at DESC`
  );
  return rows.map(mapProduct);
}

async function getOrders(client = pool) {
  const { rows } = await client.query(
    `SELECT
        o.*,
        buyer.full_name AS buyer_name,
        farmer.full_name AS farmer_name
     FROM orders o
     JOIN users buyer ON buyer.id = o.buyer_id
     JOIN users farmer ON farmer.id = o.farmer_id
     ORDER BY o.created_at DESC`
  );
  return rows.map(mapOrder);
}

async function getReviews(client = pool) {
  const { rows } = await client.query(
    `SELECT id, order_id, buyer_id, seller_id, product_id, rating, comment, created_at
     FROM reviews
     ORDER BY created_at DESC`
  );
  return rows.map(mapReview);
}

async function getCurrentUser(userId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, full_name, email, role, location, phone, store_name, bio, avatar_url, is_active, is_verified, preferred_payment_method, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return mapUser(rows[0]);
}

async function loadBootstrap(userId, client = pool) {
  const [users, products, orders, reviews, currentUser] = await Promise.all([
    getSafeUsers(client),
    getProducts(client),
    getOrders(client),
    getReviews(client),
    getCurrentUser(userId, client)
  ]);
  return {
    currentUser,
    users,
    products,
    orders,
    reviews,
    analytics: buildAnalytics({ users, products, orders }),
    catalog: {
      paymentMethods: PAYMENT_METHODS,
      deliveryMethods: DELIVERY_METHODS,
      categories: CATEGORY_OPTIONS
    }
  };
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.auth = { userId: Number(payload.sub), role: payload.role };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    return next();
  };
}

async function fetchAuthUser(req, res, next) {
  const currentUser = await getCurrentUser(req.auth.userId);
  if (!currentUser) {
    return res.status(401).json({ error: 'User account not found.' });
  }
  if (!currentUser.isActive) {
    return res.status(403).json({ error: 'This account is suspended.' });
  }
  req.currentUser = currentUser;
  return next();
}

function combineAuth(...middlewares) {
  return [authRequired, fetchAuthUser, ...middlewares];
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['farmer', 'buyer']).default('buyer'),
  location: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  storeName: z.string().optional().default(''),
  bio: z.string().optional().default(''),
  preferredPaymentMethod: z.string().optional().default(PAYMENT_METHODS[0])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  storeName: z.string().optional(),
  bio: z.string().optional(),
  preferredPaymentMethod: z.string().optional(),
  avatarUrl: z.string().optional()
});

const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0),
  unit: z.string().min(1),
  location: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  description: z.string().optional().default(''),
  isFeatured: z.coerce.boolean().optional().default(false),
  isAvailable: z.coerce.boolean().optional().default(true),
  isVisible: z.coerce.boolean().optional().default(true)
});

const orderSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1),
  paymentMethod: z.string().min(1),
  deliveryMethod: z.string().min(1),
  note: z.string().optional().default('')
});

const reviewSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional().default('')
});

async function fetchProductById(productId, client = pool) {
  const { rows } = await client.query(
    `SELECT
        p.*,
        u.full_name AS farmer_name,
        COALESCE(
          ROUND((
            SELECT AVG(rating)::numeric
            FROM reviews r
            WHERE r.seller_id = u.id
          ), 1),
          4.5
        ) AS farmer_rating
     FROM products p
     JOIN users u ON u.id = p.farmer_id
     WHERE p.id = $1
     `,
    [productId]
  );
  return mapProduct(rows[0]);
}

async function fetchOrderById(orderId, client = pool) {
  const { rows } = await client.query(
    `SELECT
        o.*,
        buyer.full_name AS buyer_name,
        farmer.full_name AS farmer_name
     FROM orders o
     JOIN users buyer ON buyer.id = o.buyer_id
     JOIN users farmer ON farmer.id = o.farmer_id
     WHERE o.id = $1`,
    [orderId]
  );
  return mapOrder(rows[0]);
}

async function fetchPaymentByOrderId(orderId, client = pool) {
  const { rows } = await client.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
  return rows[0] || null;
}

function gatewayAmountForOrder(totalLeones) {
  return Math.max(100, Math.round((Number(totalLeones || 0) / PAYMENT_FX_RATE) * 100));
}

async function createPaymentFlow({ order, buyer }) {
  if (order.paymentMethod !== 'Secure Card Checkout') {
    return {
      provider: 'manual',
      status: 'pending',
      reference: null,
      checkoutUrl: null
    };
  }

  if (!stripe) {
    throw createError(503, 'Stripe is not configured for secure card checkout.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: buyer.email,
    line_items: [
      {
        price_data: {
          currency: STRIPE_CURRENCY,
          product_data: {
            name: `${order.productName} • ${order.quantity} ${order.unit}`
          },
          unit_amount: gatewayAmountForOrder(order.totalPrice)
        },
        quantity: 1
      }
    ],
    client_reference_id: String(order.id),
    payment_intent_data: {
      metadata: {
        order_id: String(order.id),
        buyer_id: String(buyer.id),
        farmer_id: String(order.farmerId)
      }
    },
    success_url: `${PAYMENT_RETURN_URL}?payment=success&order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PAYMENT_RETURN_URL}?payment=cancelled&order=${order.id}`,
    metadata: {
      order_id: String(order.id),
      buyer_id: String(buyer.id),
      farmer_id: String(order.farmerId)
    }
  });

  return {
    provider: 'stripe',
    status: 'requires_action',
    reference: session.id,
    checkoutUrl: session.url
  };
}

async function updateProductById(productId, patch, client = pool) {
  const existing = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
  if (!existing.rows[0]) {
    throw createError(404, 'That product no longer exists.');
  }

  const current = existing.rows[0];
  const updates = [];
  const values = [];
  const nextSlug = `${slugify(patch.name || current.name)}-${productId}`;

  const applyField = (column, value) => {
    values.push(value);
    updates.push(`${column} = $${values.length}`);
  };

  if (patch.name !== undefined) applyField('name', patch.name);
  if (patch.category !== undefined) applyField('category', patch.category);
  if (patch.price !== undefined) applyField('price_leones', Math.max(0, Math.round(Number(patch.price))));
  if (patch.quantity !== undefined) applyField('quantity', Math.max(0, Math.round(Number(patch.quantity))));
  if (patch.unit !== undefined) applyField('unit', patch.unit);
  if (patch.location !== undefined) applyField('location', patch.location);
  if (patch.imageUrl !== undefined) applyField('image_url', patch.imageUrl);
  if (patch.description !== undefined) applyField('description', patch.description);
  if (patch.isFeatured !== undefined) applyField('is_featured', Boolean(patch.isFeatured));
  if (patch.isAvailable !== undefined) applyField('is_available', Boolean(patch.isAvailable));
  if (patch.isVisible !== undefined) applyField('is_visible', Boolean(patch.isVisible));

  if (patch.quantity !== undefined && patch.isAvailable === undefined) {
    applyField('is_available', Math.max(0, Math.round(Number(patch.quantity))) > 0);
  }

  if (patch.name !== undefined || patch.quantity !== undefined || updates.length === 0) {
    applyField('slug', nextSlug);
  }

  if (updates.length === 0) {
    return fetchProductById(productId, client);
  }

  values.push(productId);
  await client.query(
    `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
    values
  );

  return fetchProductById(productId, client);
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'farmer-marketplace-api' });
});

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'farmer-marketplace-api',
    health: '/health'
  });
});

app.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const normalizedEmail = body.email.trim().toLowerCase();

    const existing = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [normalizedEmail]);
    if (existing.rows[0]) {
      throw createError(409, 'That email address is already registered.');
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const insert = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, location, phone, store_name, bio, preferred_payment_method, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, FALSE)
       RETURNING id`,
      [
        body.name.trim(),
        normalizedEmail,
        passwordHash,
        body.role,
        body.location || '',
        body.phone || '',
        body.storeName || '',
        body.bio || '',
        body.preferredPaymentMethod || PAYMENT_METHODS[0]
      ]
    );

    const userId = insert.rows[0].id;
    const currentUser = await getCurrentUser(userId);
    const bootstrap = await loadBootstrap(userId);

    res.status(201).json({
      token: signToken(currentUser),
      user: currentUser,
      bootstrap
    });
  })
);

app.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const normalizedEmail = body.email.trim().toLowerCase();
    const { rows } = await pool.query(
      `SELECT id, full_name, email, password_hash, role, location, phone, store_name, bio, avatar_url, is_active, is_verified, preferred_payment_method, created_at, updated_at
       FROM users
       WHERE lower(email) = lower($1)`,
      [normalizedEmail]
    );

    const row = rows[0];
    if (!row || !(await bcrypt.compare(body.password, row.password_hash))) {
      throw createError(401, 'We could not match those login details.');
    }

    const currentUser = mapUser(row);
    if (!currentUser.isActive) {
      throw createError(403, 'This account is suspended.');
    }

    const bootstrap = await loadBootstrap(currentUser.id);

    res.json({
      token: signToken(currentUser),
      user: currentUser,
      bootstrap
    });
  })
);

app.get(
  '/auth/me',
  ...combineAuth(
    asyncHandler(async (req, res) => {
      res.json({ user: req.currentUser });
    })
  )
);

app.get(
  '/app/bootstrap',
  ...combineAuth(
    asyncHandler(async (req, res) => {
      res.json(await loadBootstrap(req.currentUser.id));
    })
  )
);

app.patch(
  '/me',
  ...combineAuth(
    asyncHandler(async (req, res) => {
      const body = profileSchema.parse(req.body);
      const fields = {
        name: body.name,
        location: body.location,
        phone: body.phone,
        store_name: body.storeName,
        bio: body.bio,
        preferred_payment_method: body.preferredPaymentMethod,
        avatar_url: body.avatarUrl
      };

      const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
      if (entries.length > 0) {
        const values = [];
        const clauses = entries.map(([column, value]) => {
          values.push(value);
          return `${column} = $${values.length}`;
        });
        values.push(req.currentUser.id);
        await pool.query(`UPDATE users SET ${clauses.join(', ')} WHERE id = $${values.length}`, values);
      }

      res.json({ bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.get(
  '/products',
  ...combineAuth(
    asyncHandler(async (req, res) => {
      res.json({ products: await getProducts() });
    })
  )
);

app.post(
  '/products',
  ...combineAuth(
    requireRole('farmer'),
    asyncHandler(async (req, res) => {
      const body = productSchema.parse(req.body);
      const slugBase = slugify(body.name);
      const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

      const insert = await pool.query(
        `INSERT INTO products (farmer_id, name, slug, category, price_leones, quantity, unit, location, image_url, description, is_available, is_visible, is_featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          req.currentUser.id,
          body.name.trim(),
          slug,
          body.category,
          Math.max(0, Math.round(body.price)),
          Math.max(0, Math.round(body.quantity)),
          body.unit,
          body.location || '',
          body.imageUrl || '',
          body.description || '',
          Boolean(body.isAvailable),
          Boolean(body.isVisible),
          Boolean(body.isFeatured)
        ]
      );

      const product = await fetchProductById(insert.rows[0].id);
      res.status(201).json({ product, bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.patch(
  '/products/:id',
  ...combineAuth(
    asyncHandler(async (req, res) => {
      const productId = Number(req.params.id);
      const existing = await pool.query('SELECT farmer_id FROM products WHERE id = $1', [productId]);
      if (!existing.rows[0]) {
        throw createError(404, 'That product no longer exists.');
      }

      const canEdit = req.currentUser.role === 'admin' || existing.rows[0].farmer_id === req.currentUser.id;
      if (!canEdit) {
        throw createError(403, 'You are not allowed to edit that listing.');
      }

      const body = productSchema.partial().parse(req.body);
      const product = await updateProductById(productId, body);
      res.json({ product, bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.patch(
  '/products/:id/availability',
  ...combineAuth(
    asyncHandler(async (req, res) => {
      const productId = Number(req.params.id);
      const nextValue = Boolean(req.body?.isAvailable);
      const existing = await pool.query('SELECT farmer_id FROM products WHERE id = $1', [productId]);
      if (!existing.rows[0]) {
        throw createError(404, 'That product no longer exists.');
      }

      const canEdit = req.currentUser.role === 'admin' || existing.rows[0].farmer_id === req.currentUser.id;
      if (!canEdit) {
        throw createError(403, 'You are not allowed to edit that listing.');
      }

      const updated = await pool.query(
        `UPDATE products SET is_available = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
        [nextValue, productId]
      );
      const product = await fetchProductById(updated.rows[0].id);
      res.json({ product, bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.delete(
  '/products/:id',
  ...combineAuth(
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const productId = Number(req.params.id);
      await pool.query(
        `UPDATE products SET is_visible = FALSE, is_available = FALSE, updated_at = NOW() WHERE id = $1`,
        [productId]
      );
      res.json({ bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.post(
  '/products/:id/restore',
  ...combineAuth(
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const productId = Number(req.params.id);
      const productRow = await pool.query('SELECT quantity FROM products WHERE id = $1', [productId]);
      if (!productRow.rows[0]) {
        throw createError(404, 'That product no longer exists.');
      }

      await pool.query(
        `UPDATE products
         SET is_visible = TRUE, is_available = quantity > 0, updated_at = NOW()
         WHERE id = $1`,
        [productId]
      );
      res.json({ bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.post(
  '/orders',
  ...combineAuth(
    requireRole('buyer'),
    asyncHandler(async (req, res) => {
      const body = orderSchema.parse(req.body);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const productResult = await client.query(
          `SELECT p.*, u.full_name AS farmer_name, COALESCE(ROUND(AVG(r.rating)::numeric, 1), 4.5) AS farmer_rating
           FROM products p
           JOIN users u ON u.id = p.farmer_id
           LEFT JOIN reviews r ON r.seller_id = u.id
           WHERE p.id = $1
           GROUP BY p.id, u.full_name
           FOR UPDATE`,
          [body.productId]
        );

        const productRow = productResult.rows[0];
        if (!productRow || !productRow.is_visible || !productRow.is_available) {
          throw createError(400, 'That product is not available right now.');
        }

        if (Number(body.quantity) > Number(productRow.quantity || 0)) {
          throw createError(400, 'There is not enough stock for that quantity.');
        }

        const totalPrice = Number(body.quantity) * Number(productRow.price_leones || 0);
        const paymentStatus = body.paymentMethod === 'Secure Card Checkout' ? 'awaiting_payment' : 'pending';

        const orderInsert = await client.query(
          `INSERT INTO orders (
            buyer_id, farmer_id, product_id, product_name, category, quantity, unit,
            unit_price_leones, total_price_leones, payment_method, payment_status, delivery_method,
            status, note, reviewed
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13,FALSE)
          RETURNING id`,
          [
            req.currentUser.id,
            productRow.farmer_id,
            productRow.id,
            productRow.name,
            productRow.category,
            Number(body.quantity),
            productRow.unit,
            Number(productRow.price_leones || 0),
            totalPrice,
            body.paymentMethod,
            paymentStatus,
            body.deliveryMethod,
            body.note || ''
          ]
        );

        const orderId = orderInsert.rows[0].id;

        await client.query(
          `UPDATE products
           SET quantity = quantity - $1,
               is_available = CASE WHEN quantity - $1 > 0 THEN TRUE ELSE FALSE END,
               updated_at = NOW()
           WHERE id = $2`,
          [Number(body.quantity), productRow.id]
        );

        const order = await fetchOrderById(orderId, client);
        const paymentFlow = await createPaymentFlow({ order, buyer: req.currentUser });

        await client.query(
          `UPDATE orders
           SET payment_provider = $1,
               payment_reference = $2,
               checkout_url = $3,
               payment_status = $4,
               updated_at = NOW()
           WHERE id = $5`,
          [paymentFlow.provider, paymentFlow.reference, paymentFlow.checkoutUrl, paymentFlow.status, order.id]
        );

        await client.query(
          `INSERT INTO payments (order_id, provider, status, amount_leones, currency, provider_reference, checkout_url, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (order_id) DO UPDATE
           SET provider = EXCLUDED.provider,
               status = EXCLUDED.status,
               amount_leones = EXCLUDED.amount_leones,
               currency = EXCLUDED.currency,
               provider_reference = EXCLUDED.provider_reference,
               checkout_url = EXCLUDED.checkout_url,
               updated_at = NOW()`,
          [
            order.id,
            paymentFlow.provider,
            paymentFlow.status,
            order.totalPrice,
            STRIPE_CURRENCY,
            paymentFlow.reference,
            paymentFlow.checkoutUrl,
            JSON.stringify({ buyerId: req.currentUser.id, farmerId: order.farmerId })
          ]
        );

        const refreshed = await fetchOrderById(order.id, client);
        await client.query('COMMIT');
        res.status(201).json({
          order: refreshed,
          checkoutUrl: paymentFlow.checkoutUrl || null,
          bootstrap: await loadBootstrap(req.currentUser.id)
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })
  )
);

app.post(
  '/orders/:id/confirm',
  ...combineAuth(
    requireRole('farmer', 'admin'),
    asyncHandler(async (req, res) => {
      const orderId = Number(req.params.id);
      const existing = await pool.query('SELECT farmer_id FROM orders WHERE id = $1', [orderId]);
      if (!existing.rows[0]) {
        throw createError(404, 'That order no longer exists.');
      }

      if (req.currentUser.role === 'farmer' && existing.rows[0].farmer_id !== req.currentUser.id) {
        throw createError(403, 'You cannot confirm that order.');
      }

      await pool.query(
        `UPDATE orders SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, NOW()), updated_at = NOW() WHERE id = $1`,
        [orderId]
      );
      res.json({ order: await fetchOrderById(orderId), bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.post(
  '/orders/:id/deliver',
  ...combineAuth(
    requireRole('farmer', 'admin'),
    asyncHandler(async (req, res) => {
      const orderId = Number(req.params.id);
      const existing = await pool.query('SELECT farmer_id, payment_method FROM orders WHERE id = $1', [orderId]);
      if (!existing.rows[0]) {
        throw createError(404, 'That order no longer exists.');
      }

      if (req.currentUser.role === 'farmer' && existing.rows[0].farmer_id !== req.currentUser.id) {
        throw createError(403, 'You cannot update that order.');
      }

      await pool.query(
        `UPDATE orders
         SET status = 'delivered',
             payment_status = CASE WHEN payment_method = 'Cash on Delivery' THEN 'paid' ELSE payment_status END,
             delivered_at = COALESCE(delivered_at, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );
      res.json({ order: await fetchOrderById(orderId), bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.post(
  '/orders/:id/reviews',
  ...combineAuth(
    requireRole('buyer'),
    asyncHandler(async (req, res) => {
      const body = reviewSchema.parse({ ...req.body, orderId: req.params.id });
      const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [body.orderId]);
      const order = orderResult.rows[0];

      if (!order || order.buyer_id !== req.currentUser.id || order.status !== 'delivered') {
        throw createError(400, 'Reviews are available once the order is delivered.');
      }

      const existing = await pool.query('SELECT id FROM reviews WHERE order_id = $1', [body.orderId]);
      if (existing.rows[0]) {
        throw createError(400, 'You already reviewed that order.');
      }

      await pool.query(
        `INSERT INTO reviews (order_id, buyer_id, seller_id, product_id, rating, comment)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [body.orderId, req.currentUser.id, order.farmer_id, order.product_id, body.rating, body.comment || '']
      );

      await pool.query('UPDATE orders SET reviewed = TRUE, updated_at = NOW() WHERE id = $1', [body.orderId]);
      res.status(201).json({ bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.patch(
  '/users/:id/status',
  ...combineAuth(
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const userId = Number(req.params.id);
      if (userId === req.currentUser.id) {
        throw createError(400, 'You cannot suspend your own account.');
      }

      const existing = await pool.query('SELECT is_active FROM users WHERE id = $1', [userId]);
      if (!existing.rows[0]) {
        throw createError(404, 'That user no longer exists.');
      }

      await pool.query('UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1', [userId]);
      res.json({ bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.patch(
  '/users/:id/verification',
  ...combineAuth(
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const userId = Number(req.params.id);
      if (userId === req.currentUser.id) {
        throw createError(400, 'You cannot verify your own account.');
      }

      const existing = await pool.query('SELECT role, is_verified FROM users WHERE id = $1', [userId]);
      if (!existing.rows[0]) {
        throw createError(404, 'That user no longer exists.');
      }

      if (existing.rows[0].role !== 'farmer') {
        throw createError(400, 'Only farmer accounts can be verified.');
      }

      await pool.query('UPDATE users SET is_verified = NOT is_verified, updated_at = NOW() WHERE id = $1', [userId]);
      res.json({ bootstrap: await loadBootstrap(req.currentUser.id) });
    })
  )
);

app.get(
  '/analytics',
  ...combineAuth(
    asyncHandler(async (req, res) => {
      res.json((await loadBootstrap(req.currentUser.id)).analytics);
    })
  )
);

app.get(
  '/catalog',
  ...combineAuth(
    asyncHandler(async (req, res) => {
      res.json({
        paymentMethods: PAYMENT_METHODS,
        deliveryMethods: DELIVERY_METHODS,
        categories: CATEGORY_OPTIONS
      });
    })
  )
);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  const message = error.message || 'An unexpected error occurred.';
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({
    error: message,
    details: error.details || null
  });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
      console.log(`Public checkout return URL: ${PAYMENT_RETURN_URL}`);
    });
  } catch (error) {
    console.error('Unable to start backend', error);
    process.exit(1);
  }
}

start();
