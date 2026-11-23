import { productById } from '../repositories/store.js';
import { requireValue, conflict, invalid } from '../utils/http.js';
import * as repo from '../repositories/catalog.js';

export { listCategories, listProducts, stockHistory } from '../repositories/catalog.js';

export async function getProduct(db, id) {
  return requireValue(await productById(db, id), 'This bag is unavailable.');
}

export async function saveCategory(db, id, input, create) {
  return requireValue(await repo.saveCategoryRow(db, id, input, create));
}

export function saveProduct(db, id, input, actor, create) {
  return db.transaction(async (tx) => {
    if (input.category_id && !await repo.lookupCategory(tx, input.category_id)) {
      throw invalid('VALIDATION', 'Choose an existing category.', { category_id: 'Category does not exist.' });
    }
    if (create) {
      await repo.insertProduct(tx, id, input);
      if (input.stock) await repo.logStock(tx, id, 0, input.stock, 'Opening inventory', actor);
    } else {
      requireValue(await repo.lockProduct(tx, id));
      await repo.updateProduct(tx, id, input);
    }
    return productById(tx, id, true);
  });
}

export async function deleteProduct(db, id) {
  requireValue(await repo.hideProduct(db, id));
}

export function adjustStock(db, id, input, actor) {
  return db.transaction(async (tx) => {
    const row = requireValue(await repo.lockProduct(tx, id));
    await repo.setStock(tx, id, input.stock);
    await repo.logStock(tx, id, row.stock, input.stock, input.reason, actor);
    return productById(tx, id, true);
  });
}

export function pricedCart(rows) {
  const items = rows.map((item) => {
    const unit_cents = item.price_cents + (item.monogram ? (item.monogram_cents ?? 0) : 0);
    return { ...item, unit_cents, line_cents: unit_cents * item.quantity };
  });
  return { items, subtotal_cents: items.reduce((sum, item) => sum + item.line_cents, 0), currency: 'PHP' };
}

export async function getCart(db, id) {
  return pricedCart(await repo.cartRows(db, id));
}

export function validateItem(product, monogram) {
  if (!product?.available) throw conflict('PRODUCT_UNAVAILABLE', 'This bag is no longer available.');
  if (monogram && !product.monogram_cents) throw invalid('MONOGRAM_UNAVAILABLE', 'This bag does not support monogramming.');
}

export function updateCart(db, id, input) {
  return db.transaction(async (tx) => {
    await repo.lockCustomer(tx, id);
    const { productId, monogram, quantity, add } = input;
    if (!quantity && !add) {
      await repo.removeCartLine(tx, id, productId, monogram);
    } else {
      const bag = await repo.lockCartProduct(tx, productId);
      validateItem(bag, monogram);
      const lines = await repo.cartLines(tx, id, productId);
      const existing = lines.find((line) => line.monogram === monogram);
      const desired = (add ? existing?.quantity ?? 0 : 0) + quantity;
      const combined = lines.filter((line) => line.monogram !== monogram).reduce((sum, line) => sum + line.quantity, desired);
      if (desired > 20 || combined > bag.stock) throw conflict('STOCK_CONFLICT', 'There is not enough stock for this quantity.', { productId });
      await repo.saveCartLine(tx, id, productId, monogram, desired);
    }
    return getCart(tx, id);
  });
}
