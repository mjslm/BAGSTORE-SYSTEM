import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from './config/database.js';
import { one } from './repositories/store.js';

const categories = [
  ['totes', 'Totes'], ['backpacks', 'Backpacks'], ['crossbody', 'Crossbody'],
  ['shoulder-bags', 'Shoulder bags'], ['travel', 'Travel'],
];
const activityFits = [['everyday-tote', 14, 15000], ['city-backpack', 15.6, 15000], ['canvas-tote', 13, 12000], ['weekender', 16, 18000]];
const original = JSON.parse(await readFile(new URL('./config/activity-bags.json', import.meta.url), 'utf8')).products;
const additions = [
  ['studio-tote', 'Studio Tote', 'totes', 149900, 'Caramel', 'tote', 'An organizer pocket and a padded sleeve for studio days.', 15.6, 15000],
  ['market-tote', 'Saturday Market Tote', 'totes', 58900, 'Natural', 'canvas', 'A light canvas tote with a wide opening for errands.', null, 12000],
  ['desk-tote', 'Desk to Dinner Tote', 'totes', 179900, 'Caramel', 'tote', 'Structured carry with room for a laptop, notebook and bottle.', 16, 15000],
  ['campus-pack', 'Campus Daypack', 'backpacks', 139900, 'Forest', 'backpack', 'A padded laptop pocket and space for two class binders.', 14, 15000],
  ['commuter-pack', 'Rainy Commute Pack', 'backpacks', 189900, 'Forest', 'backpack', 'Water-resistant fabric with a travel pass pocket and padded laptop sleeve.', 16, null],
  ['trail-pack', 'Sunday Trail Pack', 'backpacks', 159900, 'Forest', 'backpack', 'Lightweight daypack with two bottle pockets for short hikes.', null, null],
  ['phone-sling', 'Pocket Phone Sling', 'crossbody', 54900, 'Oat', 'crossbody', 'Fits a phone, keys and cards for quick trips.', null, null],
  ['camera-sling', 'Camera Day Sling', 'crossbody', 109900, 'Oat', 'crossbody', 'A compact crossbody with a padded compartment for a small camera.', null, 12000],
  ['zip-crossbody', 'Zip Around Crossbody', 'crossbody', 99900, 'Oat', 'crossbody', 'A secure zip pocket and adjustable strap for everyday outings.', null, null],
  ['soft-shoulder', 'Soft Fold Shoulder Bag', 'shoulder-bags', 109900, 'Merlot', 'crescent', 'Soft shoulder carry for a wallet, a small bottle and daily essentials.', null, 15000],
  ['gallery-shoulder', 'Gallery Shoulder Bag', 'shoulder-bags', 149900, 'Merlot', 'crescent', 'A neat shape with a short strap and interior zipper pocket.', null, null],
  ['city-shoulder', 'City Loop Shoulder Bag', 'shoulder-bags', 119900, 'Merlot', 'crescent', 'An easy shoulder bag sized for a small tablet and an umbrella.', null, 12000],
  ['overnight-duffel', 'Overnight Duffel', 'travel', 219900, 'Cocoa', 'weekender', 'A roomy overnight bag with a separate shoe pocket and sleeve.', 17, 18000],
  ['light-duffel', 'Light Trip Duffel', 'travel', 174900, 'Cocoa', 'weekender', 'Light and simple for a gym day or a one-night trip.', null, 18000],
];

async function insertProduct(tx, row) {
  await tx.query(`INSERT INTO products (id,name,category_id,price_cents,color,image,description,laptop_inches,monogram_cents,stock,background)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`, row);
}

export async function seed(db, { adminPassword = 'CarryAdmin!2026', customerPassword = 'CarryShopper!2026' } = {}) {
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const customerHash = await bcrypt.hash(customerPassword, 12);
  await db.transaction(async (tx) => {
    for (const [id, name] of categories) await tx.query('INSERT INTO categories(id,name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING', [id, name]);
    for (const bag of original) {
      const [categoryId] = categories.find((item) => item[1] === bag.category);
      const [, fit = null, monogram = null] = activityFits.find(([id]) => bag.id === id) || [];
      await insertProduct(tx, [bag.id, bag.name, categoryId, bag.price * 100, bag.color, bag.image, bag.description, fit, monogram, bag.id === 'mini-crossbody' ? 1 : 8, bag.background]);
    }
    const backgrounds = { tote: '#e9e2d7', canvas: '#e9e8dc', backpack: '#e6e9de', crossbody: '#ece8df', crescent: '#eee2df', weekender: '#e6ded6' };
    for (const [index, bag] of additions.entries()) {
      const [id,name,category,price,color,image,description,fit,monogram] = bag;
      await insertProduct(tx, [id,name,category,price,color,`/images/${image}.svg`,description,fit,monogram,3 + index % 9,backgrounds[image]]);
    }
    for (const account of [
      ['Store Admin','admin@carry.test',adminHash,'admin'],
      ['Jamie Cruz','jamie@carry.test',customerHash,'customer'],
      ['Alex Reyes','alex@carry.test',customerHash,'customer'],
    ]) await tx.query('INSERT INTO users (id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING', [randomUUID(), ...account]);
    const expires = new Date(Date.now() + 120 * 86400000).toISOString();
    const expired = new Date(Date.now() - 86400000).toISOString();
    for (const coupon of [
      ['CARRY10','percent',10,50000,expires,100,2,true],
      ['PACK100','fixed',10000,120000,expires,50,1,true],
      ['OLDDEAL','percent',15,0,expired,50,1,true],
    ]) await tx.query('INSERT INTO coupons VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (code) DO NOTHING', coupon);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  if (process.argv.includes('--reset')) throw new Error('The seed command cannot reset a hosted database.');
  if (!env.DATABASE_URL?.trim()) throw new Error('Set DATABASE_URL to your Supabase Session pooler connection string.');
  if ([env.SEED_ADMIN_PASSWORD, env.SEED_CUSTOMER_PASSWORD].some((value) => !value || Buffer.byteLength(value) < 12 || Buffer.byteLength(value) > 72)) {
    throw new Error('Set SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD to private passwords of 12–72 bytes.');
  }
  const db = await getDatabase();
  try {
    await seed(db, { adminPassword: env.SEED_ADMIN_PASSWORD, customerPassword: env.SEED_CUSTOMER_PASSWORD });
    const { total } = await one(db, 'SELECT count(*)::int AS total FROM products');
    console.log('Seed complete. Catalog products:', total);
  } finally { await db.close(); }
}
