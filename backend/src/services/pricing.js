import { couponByCode, couponUses, writeCoupon } from '../repositories/coupons.js';
import { createDiscount } from '../patterns/discounts.js';
import { conflict, invalid, requireValue } from '../utils/http.js';
import { pricedCart, validateItem } from './catalog.js';

export { listCoupons } from '../repositories/coupons.js';

export async function quoteCart(db, rows, code, userId, lock = false) {
  if (!rows.length) throw conflict('CART_EMPTY', 'Add a bag before checkout.');
  const required = new Map();
  for (const item of rows) {
    validateItem(item, item.monogram);
    const quantity = (required.get(item.id) ?? 0) + item.quantity;
    if (quantity > item.stock) throw conflict('STOCK_CONFLICT', 'There is not enough stock for ' + item.name + '.', { productId: item.id });
    required.set(item.id, quantity);
  }
  const { items, subtotal_cents, currency } = pricedCart(rows);
  let discount_cents = 0;
  if (code) {
    const coupon = await couponByCode(db, code, lock);
    if (!coupon?.active) throw invalid('COUPON_INVALID', 'This coupon is unavailable.');
    if (new Date(coupon.expires_at).getTime() <= Date.now()) throw invalid('COUPON_EXPIRED', 'This coupon has expired.');
    if (subtotal_cents < coupon.minimum_cents) throw invalid('COUPON_MINIMUM', 'The cart subtotal is below this coupon’s minimum.', { minimum_cents: coupon.minimum_cents });
    const uses = await couponUses(db, code, userId);
    if (uses.total >= coupon.max_uses || uses.customer >= coupon.max_per_user) throw invalid('COUPON_LIMIT', 'This coupon has reached its usage limit.');
    discount_cents = createDiscount(coupon.kind).calculate(subtotal_cents, coupon.value);
  }
  const shipping_cents = 12000;
  return { items, subtotal_cents, discount_cents, shipping_cents, total_cents: subtotal_cents - discount_cents + shipping_cents, currency };
}

export async function saveCoupon(db, code, input, create) {
  if (!createDiscount(input.kind).validate(input.value)) {
    throw invalid('VALIDATION', 'The coupon discount is invalid.', { value: 'Enter a valid discount.' });
  }
  return requireValue(await writeCoupon(db, code, input, create));
}
