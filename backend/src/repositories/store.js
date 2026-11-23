export async function one(db, sql, params = []) {
  return (await db.query(sql, params)).rows[0];
}

export async function all(db, sql, params = []) {
  return (await db.query(sql, params)).rows;
}

export async function page(db, select, from, conditions, sort, params, { page, limit }) {
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const count = await one(db, `SELECT count(*)::int AS total ${from} ${where}`, params);
  const data = await all(db, `SELECT ${select} ${from} ${where} ORDER BY ${sort}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, (page - 1) * limit]);
  return { data, meta: { total: count.total, page, limit } };
}

export const productFields = `p.id, p.name, p.description, p.color, p.image, p.background, p.price_cents,
  p.stock, p.laptop_inches::float AS laptop_inches, p.monogram_cents, p.active, c.name AS category, p.category_id`;
export const productFrom = 'FROM products p JOIN categories c ON c.id = p.category_id';
export const publicProduct = 'p.active AND p.deleted_at IS NULL AND c.active';

export function productById(db, id, admin = false) {
  return one(db, `SELECT ${productFields} ${productFrom} WHERE p.id = $1 AND ${admin ? 'p.deleted_at IS NULL' : publicProduct}`, [id]);
}

export function orderById(db, id, lock = false) {
  return one(db, 'SELECT * FROM orders WHERE id = $1' + (lock ? ' FOR UPDATE' : ''), [id]);
}

export function orderItems(db, id) {
  return all(db, 'SELECT product_id, name, image, monogram, unit_cents, quantity, (unit_cents * quantity) AS line_cents FROM order_items WHERE order_id = $1 ORDER BY product_id, monogram', [id]);
}

export function orderHistory(db, id) {
  return all(db, 'SELECT status, actor, created_at FROM order_history WHERE order_id = $1 ORDER BY id', [id]);
}
