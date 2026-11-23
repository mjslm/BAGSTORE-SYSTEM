import { z } from 'zod';
export const uuid = z.uuid();
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64);
export const label = z.string().trim().min(2).max(100);
const email = z.email().max(254).transform((value) => value.toLowerCase());
export const login = z.object({ email, password: z.string().min(1).max(128) });
export const register = login.extend({
  name: label,
  password: z.string().min(8).max(72).refine((value) => Buffer.byteLength(value) <= 72, 'Use at most 72 bytes.'),
});
const amount = z.number().int().min(0).max(10000000);
const stock = z.number().int().min(0).max(100000);
const image = z.string().trim().max(400).refine((value) => {
  if (/^\/images\/[a-z0-9-]+\.(svg|png|webp|jpg)$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}, 'Use a catalog image path or an HTTPS image URL.');
export const product = z.object({
  name: label, description: z.string().trim().min(5).max(600),
  color: z.string().trim().min(1).max(40), image,
  background: z.string().regex(/^#[0-9a-f]{6}$/i),
  category_id: slug, price_cents: amount.min(100), stock,
  active: z.boolean(), laptop_inches: z.number().min(10).max(20).multipleOf(0.1).nullable(),
  monogram_cents: amount.min(100).nullable(),
});
export const editProduct = product.omit({ stock: true }).partial();
export const category = z.object({ name: label, active: z.boolean().default(true) });
export const stockChange = z.object({ stock, reason: z.string().trim().min(5).max(200) });
export const couponCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/);
export const coupon = z.object({
  kind: z.enum(['percent','fixed']), value: amount.min(1),
  minimum_cents: amount, expires_at: z.iso.datetime(),
  max_uses: z.number().int().min(1).max(100000),
  max_per_user: z.number().int().min(1).max(100000),
  active: z.boolean().default(true),
}).refine((value) => value.kind !== 'percent' || value.value <= 100, { path: ['value'], message: 'Enter a percentage from 1 to 100.' })
  .refine((value) => value.max_per_user <= value.max_uses, { path: ['max_per_user'], message: 'Must be within the total usage limit.' });
export const createCoupon = coupon.safeExtend({ couponCode });
export const monogram = z.string().trim().toUpperCase().regex(/^[A-Z]{0,3}$/);
export const cartItem = z.object({
  productId: slug, monogram: monogram.default(''), quantity: z.number().int().min(0).max(20), add: z.boolean().default(false),
});
export const shipping = z.object({
  name: label, phone: z.string().trim().regex(/^(?:\+63|0)9\d{9}$/, 'Enter a Philippine mobile number.'),
  address: z.string().trim().min(8).max(180), city: label,
  postalCode: z.string().trim().regex(/^\d{4}$/, 'Enter a four-digit postal code.'),
});
export const quote = z.object({ couponCode: z.union([couponCode, z.literal('')]).default('') });
export const checkout = quote.extend({ shipping });
export const statuses = ['pending_payment','paid','processing','shipped','delivered','cancelled','expired','failed'];
export const transition = z.object({ status: z.enum(statuses) });
export const paging = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export const catalog = paging.extend({
  q: z.string().trim().max(100).default(''), category: slug.optional(),
  minPrice: z.coerce.number().int().min(0).max(10000000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(10000000).optional(),
  laptop: z.coerce.number().min(10).max(20).optional(),
  sort: z.enum(['featured','newest','price-asc','price-desc']).default('featured'),
}).refine((value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
  { path: ['maxPrice'], message: 'Maximum price must be at least the minimum.' });
const date = z.iso.date();
export const orders = paging.extend({ status: z.enum(statuses).optional(), from: date.optional(), to: date.optional() })
  .refine((value) => !value.from || !value.to || value.from <= value.to, { path: ['to'], message: 'End date must be after the start date.' });
export const ai = z.object({ prompt: z.string().trim().min(5).max(280) });
