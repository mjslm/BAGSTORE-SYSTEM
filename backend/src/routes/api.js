import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAdmin } from '../middleware/http.js';
import { HttpError } from '../utils/http.js';

function limit(max) {
  return rateLimit({ windowMs: 60_000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (req, res, next) => next(new HttpError(429, 'RATE_LIMIT', 'Too many requests. Try again in a minute.')),
  });
}

export function apiRoutes(c, auth) {
  const api = Router();
  const admin = Router();
  const authLimit = limit(25);
  api.get('/health', c.health);
  api.post('/auth/register', authLimit, c.register);
  api.post('/auth/login', authLimit, c.login);
  api.get('/auth/me', auth, c.me);
  api.get('/categories', c.categories);
  api.get('/products', c.products);
  api.get('/products/:id', c.product);
  api.get('/cart', auth, c.cart);
  api.patch('/cart', auth, c.editCart);
  api.post('/checkout/quote', auth, c.quote);
  api.post('/checkout', auth, limit(30), c.place);
  api.get('/orders', auth, c.orders);
  api.get('/orders/:id', auth, c.order);
  api.post('/orders/:id/verify', auth, limit(30), c.verify);
  api.post('/orders/:id/cancel', auth, c.cancel);
  api.post('/orders/:id/restore-cart', auth, c.restore);
  api.post('/ai/discover', limit(8), c.discover);
  admin.use(auth, requireAdmin);
  admin.get('/dashboard', c.dashboard);
  admin.get('/products', c.adminProducts);
  admin.post('/products', c.createProduct);
  admin.patch('/products/:id', c.saveProduct);
  admin.delete('/products/:id', c.deleteProduct);
  admin.patch('/products/:id/stock', c.adjustStock);
  admin.get('/products/:id/stock', c.stockHistory);
  admin.get('/categories', c.adminCategories);
  admin.post('/categories', c.createCategory);
  admin.put('/categories/:id', c.saveCategory);
  admin.get('/coupons', c.coupons);
  admin.post('/coupons', c.createCoupon);
  admin.put('/coupons/:code', c.saveCoupon);
  admin.get('/orders', c.adminOrders);
  admin.patch('/orders/:id', c.advance);
  api.use('/admin', admin);
  return api;
}
