import { createHash, randomUUID } from 'node:crypto';
import { all, one, orderById, orderHistory, orderItems, page } from '../repositories/store.js';
import { conflict, HttpError, requireValue } from '../utils/http.js';
import { validateItem } from './catalog.js';
import { cartRows, clearCart, lockCartProduct, lockCustomer, logStock, saveCartLine } from '../repositories/catalog.js';
import { quoteCart } from './pricing.js';
import { uuidPattern } from '../patterns/maya.js';

const next = { paid: 'processing', processing: 'shipped', shipped: 'delivered' };
const terminalFailure = { PAYMENT_FAILED: 'failed', PAYMENT_EXPIRED: 'expired', PAYMENT_CANCELLED: 'cancelled' };
const retryable = new Set(Object.values(terminalFailure));
const finalStatus = new Set(['PAYMENT_SUCCESS', ...Object.keys(terminalFailure)]);
const age = 70 * 60 * 1000;

function paymentStatus(payment) {
  return payment?.paymentStatus || payment?.status;
}

function reportedMoney(payment) {
  const asCents = (value) => {
    const amount = String(value ?? '');
    return /^\d+(?:\.\d{1,2}0*)?$/.test(amount) ? Math.round(Number(amount) * 100) : NaN;
  };
  const amount = asCents(payment.amount ?? payment.totalAmount?.value);
  const currency = payment.currency ?? payment.totalAmount?.currency;
  const conflicting = (payment.amount != null && payment.totalAmount?.value != null && amount !== asCents(payment.totalAmount.value))
    || (payment.currency && payment.totalAmount?.currency && currency !== payment.totalAmount.currency);
  return { amount, currency, conflicting };
}

function requireOrder(order, user) {
  return requireValue(order && (user.role === 'admin' || user.id === order.user_id) ? order : null, 'Order not found.');
}

async function details(db, row) {
  const { idem_key, request_hash, session_state, ...order } = row;
  const [items, history] = await Promise.all([orderItems(db, row.id), orderHistory(db, row.id)]);
  return { ...order, items, history, canRetry: retryable.has(order.status) };
}

export function listOrders(db, user, filters, admin = false) {
  const params = [];
  const conditions = [];
  function add(condition, value) {
    params.push(value);
    conditions.push(condition.replace('?', '$' + params.length));
  }
  if (!admin) add('user_id=?', user.id);
  if (filters.status) add('status=?', filters.status);
  if (filters.from) add('created_at>=?::date', filters.from);
  if (filters.to) add("created_at<?::date + interval '1 day'", filters.to);
  return page(db, 'id, user_id, status, total_cents, currency, created_at, payment_flag',
    'FROM orders', conditions, 'created_at DESC, id', params, filters);
}

export async function getOrder(db, id, user) {
  return details(db, requireOrder(await orderById(db, id), user));
}

async function history(db, id, status, actor) {
  await db.query('INSERT INTO order_history (order_id,status,actor) VALUES ($1,$2,$3)', [id, status, actor]);
}

async function changeOrder(db, order, status, actor) {
  const updated = await one(db, 'UPDATE orders SET status=$2,updated_at=now() WHERE id=$1 RETURNING *', [order.id, status]);
  await history(db, order.id, status, actor);
  return updated;
}

async function release(db, order, status, actor) {
  const reservations = await all(db, "UPDATE reservations SET state='released' WHERE order_id=$1 AND state='held' RETURNING product_id, quantity", [order.id]);
  reservations.sort((a, b) => a.product_id.localeCompare(b.product_id));
  for (const item of reservations) {
    const product = await one(db, 'UPDATE products SET stock=stock+$2 WHERE id=$1 RETURNING stock', [item.product_id, item.quantity]);
    await logStock(db, item.product_id, product.stock - item.quantity, product.stock, 'Reservation released');
  }
  return changeOrder(db, order, status, actor);
}

export function advanceOrder(db, id, status, actor) {
  return db.transaction(async (tx) => {
    const order = requireValue(await orderById(tx, id, true));
    if (next[order.status] !== status) throw conflict('ILLEGAL_ORDER_STATE', 'This order cannot move to that status.');
    return details(tx, await changeOrder(tx, order, status, actor));
  });
}

export class CheckoutService {
  constructor(db, gateway, pricing = quoteCart) {
    Object.assign(this, { db, gateway, pricing });
  }

  async place(user, key, input) {
    const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const { row, created } = await this.db.transaction(async (tx) => {
      await lockCustomer(tx, user.id);
      const existing = await one(tx, 'SELECT * FROM orders WHERE user_id=$1 AND idem_key=$2', [user.id, key]);
      if (existing) {
        if (existing.request_hash !== requestHash) throw conflict('IDEMPOTENCY_CONFLICT', 'This checkout key already belongs to different shipping or coupon details.');
        return { row: existing, created: false };
      }
      const pending = await one(tx, "SELECT id FROM orders WHERE user_id=$1 AND status='pending_payment'", [user.id]);
      if (pending) throw conflict('ACTIVE_CHECKOUT', 'Finish or cancel your pending checkout first.', { orderId: pending.id });
      if (!this.gateway.configured) throw new HttpError(503, 'PAYMENT_UNAVAILABLE', 'Maya Sandbox has not been configured.');
      const quote = await this.pricing(tx, await cartRows(tx, user.id, true), input.couponCode, user.id, true);
      const id = randomUUID();
      const expiresAt = new Date(Date.now() + age).toISOString();
      const data = [id, user.id, key, requestHash, JSON.stringify(input.shipping), input.couponCode || null,
        quote.subtotal_cents, quote.discount_cents, quote.shipping_cents, quote.total_cents, expiresAt];
      const row = await one(tx, `INSERT INTO orders (id,user_id,idem_key,request_hash,shipping,coupon_code,
        subtotal_cents,discount_cents,shipping_cents,total_cents,expires_at,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending_payment') RETURNING *`, data);
      const quantities = new Map();
      for (const item of quote.items) {
        await tx.query('INSERT INTO order_items VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, item.id, item.name, item.image, item.monogram, item.unit_cents, item.quantity]);
        quantities.set(item.id, (quantities.get(item.id) ?? 0) + item.quantity);
      }
      for (const [productId, quantity] of quantities) {
        const product = await one(tx, 'UPDATE products SET stock=stock-$2 WHERE id=$1 AND stock>=$2 RETURNING stock', [productId, quantity]);
        if (!product) throw conflict('STOCK_CONFLICT', 'Another customer reserved the last available bag.');
        await tx.query('INSERT INTO reservations (order_id,product_id,quantity,expires_at) VALUES ($1,$2,$3,$4)', [id, productId, quantity, expiresAt]);
        await logStock(tx, productId, product.stock + quantity, product.stock, 'Checkout reservation', user.id);
      }
      await clearCart(tx, user.id);
      await history(tx, id, 'pending_payment', user.id);
      return { row, created: true };
    });
    const order = await this.startSession(row);
    return { order: await details(this.db, order), created };
  }

  async startSession(order) {
    if (order.status !== 'pending_payment' || order.session_state !== 'new') return order;
    const row = await one(this.db, `UPDATE orders SET session_state='creating', updated_at=now()
      WHERE id=$1 AND status='pending_payment' AND session_state='new' RETURNING *`, [order.id]);
    if (!row) return orderById(this.db, order.id);
    let session;
    try {
      session = await this.gateway.create(row);
    } catch (error) {
      const definiteRejection = [400, 401, 403, 404, 422].includes(error.providerStatus);
      await this.db.transaction(async (tx) => {
        const current = await orderById(tx, row.id, true);
        if (current.status !== 'pending_payment') return;
        if (definiteRejection) await release(tx, current, 'failed', 'maya');
        else await tx.query("UPDATE orders SET session_state='uncertain',updated_at=now() WHERE id=$1", [row.id]);
      });
      throw new HttpError(503, 'PAYMENT_UNAVAILABLE', 'Maya checkout could not be opened. Check the order before retrying.', { orderId: row.id });
    }
    return one(this.db, "UPDATE orders SET gateway_id=$2,checkout_url=$3,session_state='ready',updated_at=now() WHERE id=$1 RETURNING *", [row.id, session.id, session.url]);
  }

  async verifyOrder(id, user) {
    const order = requireOrder(await orderById(this.db, id), user);
    return details(this.db, await this.reconcile(order));
  }

  async reconcile(order, expectedId) {
    if (order.status !== 'pending_payment') return order;
    let payment;
    const paymentId = order.gateway_id || expectedId;
    if (paymentId) payment = await this.gateway.retrieve(paymentId);
    else if (order.session_state !== 'new') {
      const candidates = await this.gateway.find(order.id);
      if (!Array.isArray(candidates)) throw new HttpError(503, 'PAYMENT_UNAVAILABLE', 'Maya payment details are unavailable.');
      payment = candidates.find((candidate) => candidate.requestReferenceNumber === order.id && paymentStatus(candidate) === 'PAYMENT_SUCCESS')
        ?? candidates.find((candidate) => candidate.requestReferenceNumber === order.id);
    }
    if (!payment) return order;
    return this.applyPayment(order.id, payment, expectedId);
  }

  applyPayment(id, payment, expectedId) {
    return this.db.transaction(async (tx) => {
      const order = requireValue(await orderById(tx, id, true));
      const status = paymentStatus(payment);
      const final = finalStatus.has(status);
      const canRecoverId = order.session_state === 'uncertain' && !order.gateway_id;
      if (order.status !== 'pending_payment' || (!final && !canRecoverId)) return order;
      if (!uuidPattern.test(payment.id || '') || (expectedId && payment.id !== expectedId) ||
          (order.gateway_id && payment.id !== order.gateway_id) || payment.requestReferenceNumber !== order.id) {
        if (!final) return order;
        return one(tx, 'UPDATE orders SET payment_flag=$2 WHERE id=$1 RETURNING *',
          [id, JSON.stringify({ reason: 'Maya reference mismatch', received: payment.id ?? null })]);
      }
      const { amount: cents, currency, conflicting } = reportedMoney(payment);
      if (conflicting || cents !== order.total_cents || currency !== order.currency || (status === 'PAYMENT_SUCCESS' && payment.isPaid === false)) {
        if (!final) return order;
        return one(tx, 'UPDATE orders SET payment_flag=$2 WHERE id=$1 RETURNING *', [id, JSON.stringify({
          reason: 'Payment amount or currency mismatch', expectedCents: order.total_cents, receivedCents: Number.isFinite(cents) ? cents : null,
          expectedCurrency: order.currency, receivedCurrency: currency ?? null,
        })]);
      }
      const verified = await one(tx, 'UPDATE orders SET gateway_id=$2,payment_flag=NULL WHERE id=$1 RETURNING *', [id, payment.id]);
      if (!final) return verified;
      if (terminalFailure[status]) return release(tx, order, terminalFailure[status], 'maya');
      await tx.query('INSERT INTO payments (gateway_id,order_id,amount_cents,currency) VALUES ($1,$2,$3,$4)', [payment.id, id, cents, currency]);
      await tx.query("UPDATE reservations SET state='consumed' WHERE order_id=$1 AND state='held'", [id]);
      return changeOrder(tx, order, 'paid', 'maya');
    });
  }

  async cancel(id, user) {
    let order = requireOrder(await orderById(this.db, id), user);
    if (order.status === 'cancelled') return details(this.db, order);
    if (order.status !== 'pending_payment') throw conflict('ILLEGAL_ORDER_STATE', 'Only orders awaiting payment can be cancelled.');
    if (order.session_state === 'new') {
      order = await this.db.transaction(async (tx) => {
        const current = await orderById(tx, id, true);
        if (current.session_state !== 'new' || current.status !== 'pending_payment') return current;
        return release(tx, current, 'cancelled', user.id);
      });
      if (order.status === 'cancelled') return details(this.db, order);
    }
    order = await this.reconcile(order);
    if (order.status === 'pending_payment' && order.gateway_id && !order.payment_flag) {
      try { await this.gateway.cancel(order.gateway_id); } catch (error) {
        if (![400, 409, 422].includes(error.providerStatus)) throw error;
      }
      order = await this.reconcile(order);
    }
    if (!retryable.has(order.status)) throw conflict('ILLEGAL_ORDER_STATE', 'Maya has not confirmed this payment can be cancelled. Refresh the order status.');
    return details(this.db, order);
  }

  async restore(id, user) {
    return this.db.transaction(async (tx) => {
      await lockCustomer(tx, user.id);
      const order = requireOrder(await orderById(tx, id, true), user);
      if (order.user_id !== user.id || !retryable.has(order.status)) throw conflict('ILLEGAL_ORDER_STATE', 'Only your cancelled, failed or expired orders can be restored.');
      const items = await orderItems(tx, id);
      const quantities = new Map();
      for (const item of items) {
        const product = await lockCartProduct(tx, item.product_id);
        validateItem(product, item.monogram);
        const quantity = (quantities.get(item.product_id) ?? 0) + item.quantity;
        if (quantity > product.stock) throw conflict('STOCK_CONFLICT', 'Some bags from this order are no longer in stock.');
        quantities.set(item.product_id, quantity);
      }
      await clearCart(tx, user.id);
      for (const item of items) await saveCartLine(tx, user.id, item.product_id, item.monogram, item.quantity);
      return { restored: items.length };
    });
  }

  async recordWebhook(payload) {
    const status = paymentStatus(payload);
    if (!finalStatus.has(status) || !uuidPattern.test(payload.id || '')) return { accepted: true, ignored: true };
    const eventId = payload.id + ':' + status;
    const reference = uuidPattern.test(payload.requestReferenceNumber || '') ? payload.requestReferenceNumber : null;
    const event = await one(this.db, `INSERT INTO webhook_events (id,payment_id,order_id,gateway_status) VALUES ($1,$2,$3,$4)
      ON CONFLICT DO NOTHING RETURNING id`, [eventId, payload.id, reference, status]);
    return { accepted: true, duplicate: !event };
  }

  async processQueue() {
    const events = await all(this.db, "SELECT * FROM webhook_events WHERE state='queued' AND next_attempt<=now() ORDER BY received_at LIMIT 12");
    for (const event of events) {
      try {
        const order = await one(this.db, 'SELECT * FROM orders WHERE gateway_id=$1 OR (id=$2 AND gateway_id IS NULL) ORDER BY (gateway_id IS NOT NULL) DESC LIMIT 1', [event.payment_id, event.order_id]);
        const updated = order && await this.reconcile(order, event.payment_id);
        if (order && updated.status === 'pending_payment' && !updated.payment_flag) throw new Error('Maya has yet to confirm the status.');
        await this.db.query("UPDATE webhook_events SET state=$2 WHERE id=$1 AND state='queued'", [event.id, order ? 'processed' : 'ignored']);
      } catch {
        await this.db.query(`UPDATE webhook_events SET attempts=attempts+1,
          state=CASE WHEN attempts>=8 THEN 'needs_review' ELSE state END,
          next_attempt=now()+interval '1 minute' WHERE id=$1 AND state='queued'`, [event.id]);
      }
    }
  }

  async expireReservations() {
    const orders = await all(this.db, "SELECT * FROM orders WHERE status='pending_payment' AND payment_flag IS NULL AND expires_at<=now() ORDER BY updated_at LIMIT 10");
    for (const order of orders) {
      try {
        if (order.session_state === 'new') {
          await this.db.transaction(async (tx) => {
            const current = await orderById(tx, order.id, true);
            if (current.status === 'pending_payment' && current.session_state === 'new') await release(tx, current, 'expired', 'system');
          });
          continue;
        }
        const current = await this.reconcile(order);
        if (current.status !== 'pending_payment' || current.payment_flag) continue;
        if (current.gateway_id) await this.cancel(current.id, { id: current.user_id, role: 'customer' });
        else {
          const candidates = await this.gateway.find(current.id);
          if (Array.isArray(candidates) && !candidates.length) await this.db.transaction(async (tx) => {
            const pending = await orderById(tx, current.id, true);
            if (pending.status === 'pending_payment' && !pending.gateway_id && !pending.payment_flag) await release(tx, pending, 'expired', 'system');
          });
        }
      } catch {
        await this.db.query("UPDATE orders SET updated_at=now() WHERE id=$1 AND status='pending_payment'", [order.id]);
      }
    }
  }
}

export async function dashboard(db) {
  const summary = await one(db, `SELECT count(*) FILTER (WHERE status IN ('paid','processing','shipped','delivered'))::int AS paid,
    COALESCE(sum(total_cents) FILTER (WHERE status IN ('paid','processing','shipped','delivered')),0)::text AS gross,
    count(*) FILTER (WHERE status='pending_payment')::int AS pending FROM orders`);
  const lowStock = await all(db, 'SELECT id,name,stock FROM products WHERE active AND deleted_at IS NULL AND stock<=4 ORDER BY stock,name LIMIT 20');
  const webhookReview = await one(db, "SELECT count(*)::int AS total FROM webhook_events WHERE state='needs_review'");
  const flagged = await one(db, 'SELECT count(*)::int AS total FROM orders WHERE payment_flag IS NOT NULL');
  return { ...summary, gross: Number(summary.gross), lowStock, flagged: flagged.total, webhookReview: webhookReview.total };
}
