import { one, page } from './store.js';

export function couponByCode(db, code, lock = false) {
  return one(db, 'SELECT * FROM coupons WHERE code=$1' + (lock ? ' FOR UPDATE' : ''), [code]);
}

export function couponUses(db, code, userId) {
  return one(db, `SELECT count(*)::int AS total, count(*) FILTER (WHERE user_id=$2)::int AS customer
    FROM orders WHERE coupon_code=$1 AND status NOT IN ('cancelled','expired','failed')`, [code, userId]);
}

export function listCoupons(db, filters) {
  return page(db, '*', 'FROM coupons', [], 'code', [], filters);
}

export function writeCoupon(db, code, input, create) {
  const { kind, value, minimum_cents, expires_at, max_uses, max_per_user, active } = input;
  const values = [code, kind, value, minimum_cents, expires_at, max_uses, max_per_user, active];
  return one(db, create
    ? 'INSERT INTO coupons VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *'
    : 'UPDATE coupons SET kind=$2,value=$3,minimum_cents=$4,expires_at=$5,max_uses=$6,max_per_user=$7,active=$8 WHERE code=$1 RETURNING *', values);
}
