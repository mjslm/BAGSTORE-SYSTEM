import { all, one, page } from './store.js';

export async function recordActivity(tx, actor, category, action, reference, description) {
  if (!actor) return;
  await tx.query(`INSERT INTO admin_activity (actor,category,action,reference,description)
    VALUES ($1,$2,$3,$4,$5)`, [actor, category, action, reference, description]);
}

// Existing order and stock histories remain the source of truth; don't duplicate them.
const activityFrom = `FROM (
  SELECT 'catalog-' || a.id AS id, a.category, a.action, a.reference, a.description,
    COALESCE(u.name,'Administrator') AS actor, a.created_at
  FROM admin_activity a JOIN users u ON u.id=a.actor
  UNION ALL
  SELECT 'order-' || h.id, 'orders',
    CASE h.status WHEN 'pending_payment' THEN 'Order placed' WHEN 'paid' THEN 'Payment verified'
      WHEN 'processing' THEN 'Order processing' WHEN 'shipped' THEN 'Order shipped'
      WHEN 'delivered' THEN 'Order delivered' WHEN 'cancelled' THEN 'Order cancelled'
      WHEN 'expired' THEN 'Order expired' WHEN 'failed' THEN 'Payment failed' ELSE 'Order updated' END,
    '#' || upper(left(h.order_id::text,8)), 'Order status changed to ' || replace(h.status,'_',' ') || '.',
    CASE WHEN u.role='admin' THEN u.name WHEN u.role='customer' THEN 'Customer'
      WHEN h.actor='maya' THEN 'Maya' ELSE 'System' END, h.created_at
  FROM order_history h LEFT JOIN users u ON u.id::text=h.actor
  UNION ALL
  SELECT 'stock-' || h.id, 'inventory', 'Stock updated', p.name,
    h.old_stock || ' → ' || h.new_stock || ' available units.',
    CASE WHEN u.role='admin' THEN u.name WHEN u.role='customer' THEN 'Customer' ELSE 'System' END, h.created_at
  FROM stock_history h JOIN products p ON p.id=h.product_id LEFT JOIN users u ON u.id=h.actor
) AS activity`;

export function listActivity(db, filters) {
  const params = filters.category ? [filters.category] : [];
  return page(db, '*', activityFrom, filters.category ? ['category=$1'] : [],
    'created_at DESC, id DESC', params, filters);
}

export function recentActivity(db) {
  return all(db, `SELECT * ${activityFrom} ORDER BY created_at DESC,id DESC LIMIT 4`);
}

export async function notifications(db, userId, filters) {
  const conditions = ['user_id=$1'];
  if (filters.unread === 'true') conditions.push('read_at IS NULL');
  const result = await page(db, 'id,kind,title,message,href,created_at,read_at', 'FROM notifications',
    conditions, 'created_at DESC,id DESC', [userId], filters);
  const count = await one(db, 'SELECT count(*)::int AS total FROM notifications WHERE user_id=$1 AND read_at IS NULL', [userId]);
  return { ...result, meta: { ...result.meta, unread: count.total } };
}

export async function unreadCount(db, userId) {
  return one(db, 'SELECT count(*)::int AS unread FROM notifications WHERE user_id=$1 AND read_at IS NULL', [userId]);
}

export function markNotificationRead(db, userId, id) {
  return one(db, `UPDATE notifications SET read_at=COALESCE(read_at,now())
    WHERE user_id=$1 AND id=$2 RETURNING id,read_at`, [userId, id]);
}

export async function markAllRead(db, userId) {
  const result = await db.query('UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL', [userId]);
  return { updated: result.rowCount };
}

async function notifyAdmins(tx, kind, title, message, href) {
  await tx.query(`INSERT INTO notifications (user_id,kind,title,message,href)
    SELECT id,$1,$2,$3,$4 FROM users WHERE role='admin'`, [kind,title,message,href]);
}

const orderMessages = {
  pending_payment: ['Order placed', 'Your order is awaiting payment.', 'A new order is awaiting payment.'],
  paid: ['Payment confirmed', 'Your payment has been verified.', 'Payment has been verified.'],
  processing: ['Order processing', 'We are preparing your bags.', 'Order is being prepared.'],
  shipped: ['Order shipped', 'Your bags are on their way.', 'Order has been shipped.'],
  delivered: ['Order delivered', 'Your order has been marked delivered.', 'Order has been marked delivered.'],
  cancelled: ['Order cancelled', 'Your order has been cancelled.', 'Order has been cancelled.'],
  expired: ['Payment expired', 'Your checkout has expired.', 'Checkout has expired.'],
  failed: ['Payment failed', 'Your payment was not completed.', 'Payment was not completed.'],
};

export async function notifyOrder(tx, id, status) {
  const event = orderMessages[status];
  if (!event) return;
  const [title, customerMessage, adminMessage] = event;
  const kind = ['paid','failed','expired'].includes(status) ? 'payment' : 'order';
  const reference = '#' + id.slice(0,8).toUpperCase();
  await tx.query(`INSERT INTO notifications (user_id,kind,title,message,href)
    SELECT u.id,$2,$3,$4,$5 FROM orders o JOIN users u ON u.id=o.user_id
    WHERE o.id=$1 AND u.role='customer'`, [id, kind, title, reference + ' · ' + customerMessage, '/orders/' + id]);
  await notifyAdmins(tx, kind, title, reference + ' · ' + adminMessage, '/orders/' + id);
}

export async function notifyLowStock(tx, id) {
  const product = await one(tx, `SELECT p.name,p.stock FROM products p JOIN categories c ON c.id=p.category_id
    WHERE p.id=$1 AND p.active AND p.deleted_at IS NULL AND c.active AND p.stock<=4`, [id]);
  if (!product) return;
  await notifyAdmins(tx, 'inventory', product.stock === 0 ? 'Out of stock' : 'Low stock alert',
    product.name + ' · ' + product.stock + ' available units. Review replenishment.', '/admin/inventory-advisor');
}
