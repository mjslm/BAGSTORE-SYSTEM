import { notifyLowStock } from './activity.js';
import { all, one, page, productFields, productFrom, publicProduct } from './store.js';

export function listProducts(db, filters, admin = false) {
  const conditions = [admin ? 'p.deleted_at IS NULL' : publicProduct];
  const params = [];
  function add(operator, value) {
    params.push(value);
    conditions.push(operator.replace('?', '$' + params.length));
  }
  if (filters.q) add("strpos(lower(concat_ws(' ', p.name, p.color, p.description, c.name)), lower(?)) > 0", filters.q);
  if (filters.category) add('p.category_id = ?', filters.category);
  if (filters.minPrice !== undefined) add('p.price_cents >= ?', filters.minPrice);
  if (filters.maxPrice !== undefined) add('p.price_cents <= ?', filters.maxPrice);
  if (filters.laptop !== undefined) add('p.laptop_inches >= ?', filters.laptop);
  const sorting = {
    featured: "CASE WHEN p.id = 'everyday-tote' THEN 0 ELSE 1 END, p.name, p.id",
    newest: 'p.created_at DESC, p.id', 'price-asc': 'p.price_cents, p.id', 'price-desc': 'p.price_cents DESC, p.id',
  };
  return page(db, productFields, productFrom, conditions, sorting[filters.sort], params, filters);
}

export function listCategories(db, admin) {
  return all(db, 'SELECT id, name, active FROM categories' + (admin ? '' : ' WHERE active') + ' ORDER BY name');
}

export function stockHistory(db, id, filters) {
  return page(db, '*', 'FROM stock_history', ['product_id=$1'], 'id DESC', [id], filters);
}

export function lockCustomer(tx, id) {
  return one(tx, 'SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE', [id]);
}

export async function cartRows(db, userId, lock = false) {
  return all(db, `SELECT ci.quantity, ci.monogram, ${productFields},
    (${publicProduct}) AS available
    FROM cart_items ci JOIN products p ON ci.product_id=p.id JOIN categories c ON c.id=p.category_id
    WHERE ci.user_id=$1 ORDER BY p.id, ci.monogram ${lock ? 'FOR UPDATE OF p FOR SHARE OF c' : ''}`, [userId]);
}

export function saveCategoryRow(db, id, input, create) {
  const write = create
    ? 'INSERT INTO categories (id,name,active) VALUES ($1,$2,$3) RETURNING *'
    : 'UPDATE categories SET name=$2,active=$3 WHERE id=$1 RETURNING *';
  return one(db, write, [id, input.name, input.active]);
}

export function lookupCategory(db, id) {
  return one(db, 'SELECT id FROM categories WHERE id=$1', [id]);
}

const fields = ['category_id','name','description','color','image','background','price_cents','laptop_inches','monogram_cents','active'];

export function insertProduct(db, id, input) {
  const values = [id, ...fields.map((field) => input[field]), input.stock];
  return db.query(`INSERT INTO products (id,${fields.join(',')},stock)
    VALUES (${values.map((_, index) => '$' + (index + 1)).join(',')})`, values);
}

export function lockProduct(db, id) {
  return one(db, 'SELECT id,stock FROM products WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [id]);
}

export async function updateProduct(db, id, input) {
  const changed = fields.filter((field) => input[field] !== undefined);
  if (!changed.length) return;
  const columns = changed.map((field, index) => field + '=$' + (index + 2)).join(',');
  await db.query(`UPDATE products SET ${columns} WHERE id=$1`, [id, ...changed.map((field) => input[field])]);
}

export function hideProduct(db, id) {
  return one(db, 'UPDATE products SET active=false, deleted_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [id]);
}

export function setStock(db, id, stock) {
  return db.query('UPDATE products SET stock=$2 WHERE id=$1', [id, stock]);
}

export async function logStock(tx, id, oldStock, newStock, reason, actor = null) {
  await tx.query('INSERT INTO stock_history (product_id,old_stock,new_stock,reason,actor) VALUES ($1,$2,$3,$4,$5)',
    [id, oldStock, newStock, reason, actor]);
  if ((oldStock > 4 && newStock <= 4) || (oldStock > 0 && newStock === 0)) await notifyLowStock(tx, id);
}

export function lockCartProduct(db, id) {
  return one(db, `SELECT p.stock,p.monogram_cents,(${publicProduct}) AS available ${productFrom} WHERE p.id=$1 FOR SHARE OF p,c`, [id]);
}

export function cartLines(db, userId, productId) {
  return all(db, 'SELECT monogram,quantity FROM cart_items WHERE user_id=$1 AND product_id=$2', [userId, productId]);
}

export function removeCartLine(db, userId, productId, monogram) {
  return db.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2 AND monogram=$3', [userId, productId, monogram]);
}

export function saveCartLine(db, userId, productId, monogram, quantity) {
  return db.query(`INSERT INTO cart_items VALUES ($1,$2,$3,$4)
    ON CONFLICT (user_id,product_id,monogram) DO UPDATE SET quantity=excluded.quantity`, [userId, productId, monogram, quantity]);
}

export function clearCart(db, userId) {
  return db.query('DELETE FROM cart_items WHERE user_id=$1', [userId]);
}
