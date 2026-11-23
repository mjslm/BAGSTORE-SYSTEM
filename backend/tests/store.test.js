import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { Client } from 'pg';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/config/database.js';
import { seed } from '../src/seed.js';
import { MayaCheckout, webhookSigningInput } from '../src/patterns/maya.js';
import { CheckoutService } from '../src/services/orders.js';
import { createDiscovery } from '../src/services/discovery.js';

const payments = new Map();
const payloads = [];
const key = generateKeyPairSync('rsa', { modulusLength: 2048 });
const shipping = { name: 'Jamie Cruz', phone: '09171234567', address: '123 Quezon Avenue', city: 'Iligan City', postalCode: '9200' };
let db, checkout, server, origin, jamie, alex, admin;
const schema = 'carry_test_' + randomUUID().replaceAll('-', '');
let schemaOwner;
let schemaCreated = false;

function mayaTransport(url, options) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://pg-sandbox.paymaya.com');
  if (parsed.pathname === '/checkout/v1/checkouts') {
    assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from('pk-test:').toString('base64'));
    const entry = JSON.parse(options.body);
    payloads.push(entry);
    const id = randomUUID();
    payments.set(id, { id, amount: entry.totalAmount.value, currency: entry.totalAmount.currency,
      requestReferenceNumber: entry.requestReferenceNumber, paymentStatus: 'PENDING_PAYMENT' });
    return Response.json({ checkoutId: id, redirectUrl: 'https://payments-web-sandbox.maya.ph/v2/checkout?id=' + id });
  }
  assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from('sk-test:').toString('base64'));
  if (parsed.pathname.includes('/payment-rrns/')) {
    return Response.json([...payments.values()].filter((payment) => parsed.pathname.endsWith(payment.requestReferenceNumber)));
  }
  const id = parsed.pathname.split('/')[4];
  const entry = payments.get(id);
  if (!entry) return Response.json({}, { status: 404 });
  if (parsed.pathname.endsWith('/cancel')) {
    assert.equal(options.method, 'POST');
    entry.paymentStatus = 'PAYMENT_CANCELLED';
  }
  return Response.json(entry);
}

async function call(method, path, { body, token, headers = {}, raw } = {}) {
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(origin + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  return { status: response.status, ...(response.status === 204 ? {} : await response.json()) };
}
const post = (path, body, token) => call('POST', path, { body, token });
const get = (path, token) => call('GET', path, { token });
const cart = (token, productId, quantity = 1, monogram = '') => call('PATCH', '/cart', { token, body: { productId, quantity, monogram } });
const place = (token, idem, body = {}) => call('POST', '/checkout', { token, body: { shipping, ...body }, headers: { 'Idempotency-Key': idem } });

async function signedWebhook(payload, offset = 0) {
  const nonce = randomUUID();
  const signature = sign('RSA-SHA256', Buffer.from(webhookSigningInput(payload, nonce)), key.privateKey).toString('hex');
  const headers = { 'X-Maya-Webhook-Signature': 'nonce=' + nonce + ',v1=' + signature, 'X-Maya-Webhook-Timestamp': String(Date.now() + offset) };
  return call('POST', '/webhooks/maya', { raw: JSON.stringify(payload, null, 2), headers });
}

before(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url?.trim()) throw new Error('Set TEST_DATABASE_URL to a PostgreSQL connection with permission to create a test schema.');
  schemaOwner = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await schemaOwner.connect();
  await schemaOwner.query('CREATE SCHEMA ' + schema);
  schemaCreated = true;
  db = await openDatabase({ url, schema });
  await seed(db);
  const signingKey = key.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const gateway = new MayaCheckout({ publicKey: 'pk-test', secretKey: 'sk-test', webhookKeys: [signingKey],
    frontendUrl: 'http://localhost:5173', request: mayaTransport });
  checkout = new CheckoutService(db, gateway);
  const app = createApp({ db, gateway, checkout, discover: createDiscovery(db, { key: '' }),
    secret: randomUUID() + randomUUID(), origins: ['http://localhost:5173'] });
  server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  origin = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  jamie = (await post('/auth/login', { email: 'jamie@carry.test', password: 'CarryShopper!2026' })).data.token;
  alex = (await post('/auth/login', { email: 'alex@carry.test', password: 'CarryShopper!2026' })).data.token;
  admin = (await post('/auth/login', { email: 'admin@carry.test', password: 'CarryAdmin!2026' })).data.token;
});

after(async () => {
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.close();
    if (schemaCreated) await schemaOwner.query('DROP SCHEMA ' + schema + ' CASCADE');
  } finally {
    await schemaOwner?.end();
  }
});

test('registration hashes the password, normalizes email, and rejects duplicates and bad credentials', async () => {
  const body = { name: 'Taylor Cruz', email: 'Taylor@example.com', password: 'CatchTheBus123!' };
  const registered = await post('/auth/register', body);
  assert.equal(registered.status, 201);
  assert.equal(registered.data.user.email, 'taylor@example.com');
  const { rows } = await db.query('SELECT password_hash FROM users WHERE email=$1', ['taylor@example.com']);
  assert.match(rows[0].password_hash, /^\$2[aby]\$/);
  assert.equal((await post('/auth/register', body)).status, 409);
  assert.equal((await post('/auth/login', { email: body.email, password: 'wrong' })).status, 401);
  assert.equal((await post('/auth/login', { email: { $ne: null }, password: body.password })).status, 422);
});

test('protected routes check tokens and admin roles on the server', async () => {
  assert.equal((await get('/cart')).status, 401);
  assert.equal((await get('/cart', jamie + 'tampered')).status, 401);
  assert.equal((await get('/admin/dashboard', jamie)).status, 403);
  assert.equal((await call('PATCH', '/admin/products/everyday-tote/stock', { token: jamie, body: { stock: 1, reason: 'Counted again' } })).status, 403);
  assert.equal((await get('/admin/dashboard', admin)).status, 200);
});

test('laptop fit, price range, pagination and unavailable products use database data', async () => {
  const result = await get('/products?laptop=15.6&limit=2&sort=price-asc&maxPrice=200000');
  assert.equal(result.status, 200);
  assert.ok(result.meta.total > 2);
  assert.equal(result.data.length, 2);
  assert.ok(result.data.every((item) => item.laptop_inches >= 15.6 && item.price_cents <= 200000));
  assert.ok(result.data[0].price_cents <= result.data[1].price_cents);
  assert.equal((await get('/products/missing')).status, 404);
});

test('monogram eligibility, field validation, and pricing are enforced', async () => {
  assert.equal((await cart(jamie, 'mini-crossbody', 1, 'AB')).error.code, 'MONOGRAM_UNAVAILABLE');
  assert.equal((await cart(jamie, 'everyday-tote', 1, '123')).status, 422);
  const result = await cart(jamie, 'everyday-tote', 1, 'jm');
  assert.equal(result.data.items[0].monogram, 'JM');
  assert.equal(result.data.subtotal_cents, 144900);
});

test('checkout prices from the database, validates coupons, and replays idempotently', async () => {
  assert.equal((await post('/checkout/quote', { couponCode: 'OLDDEAL' }, jamie)).error.code, 'COUPON_EXPIRED');
  assert.equal((await post('/checkout/quote', { couponCode: 'PACK100' }, jamie)).data.discount_cents, 10000);
  const body = { couponCode: 'CARRY10', total_cents: 1, price_cents: 1 };
  const idem = randomUUID();
  const order = await place(jamie, idem, body);
  assert.equal(order.status, 201);
  assert.equal(order.data.status, 'pending_payment');
  assert.equal(order.data.subtotal_cents, 144900);
  assert.equal(order.data.discount_cents, 14490);
  assert.equal(order.data.total_cents, 142410);
  assert.equal(payloads.at(-1).totalAmount.value, 1424.10);
  assert.ok(payloads.at(-1).redirectUrl.success.endsWith('/payment/success?orderId=' + order.data.id));
  const replay = await place(jamie, idem, body);
  assert.equal(replay.status, 200);
  assert.equal(replay.data.id, order.data.id);
  assert.equal(payloads.filter((entry) => entry.requestReferenceNumber === order.data.id).length, 1);
  assert.equal((await place(jamie, idem, { couponCode: '' })).error.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal((await get('/orders/' + order.data.id, alex)).status, 404);
  assert.equal((await call('PATCH', '/admin/orders/' + order.data.id, { token: admin, body: { status: 'paid' } })).status, 409);
  const cancelled = await post('/orders/' + order.data.id + '/cancel', {}, jamie);
  assert.equal(cancelled.data.status, 'cancelled');
});

test('concurrent last-unit orders yield one reservation and cancellation releases it', async () => {
  assert.equal((await cart(jamie, 'mini-crossbody')).status, 200);
  assert.equal((await cart(alex, 'mini-crossbody')).status, 200);
  const results = await Promise.all([place(jamie, randomUUID()), place(alex, randomUUID())]);
  assert.deepEqual(results.map((entry) => entry.status).sort(), [201, 409]);
  assert.equal(results.find((entry) => entry.status === 409).error.code, 'STOCK_CONFLICT');
  assert.equal((await get('/products/mini-crossbody')).data.stock, 0);
  const winner = results.findIndex((result) => result.status === 201);
  const order = results[winner].data;
  const token = winner === 0 ? jamie : alex;
  assert.equal((await post('/orders/' + order.id + '/cancel', {}, token)).data.status, 'cancelled');
  assert.equal((await get('/products/mini-crossbody')).data.stock, 1);
  assert.equal((await post('/orders/' + order.id + '/restore-cart', {}, token)).status, 200);
  assert.equal((await get('/cart', token)).data.items[0].id, 'mini-crossbody');
  await cart(jamie, 'mini-crossbody', 0);
  await cart(alex, 'mini-crossbody', 0);
});

test('an order whose checkout link was lost can recover its Maya ID and cancel', async () => {
  await cart(alex, 'campus-pack');
  const order = (await place(alex, randomUUID())).data;
  await db.query("UPDATE orders SET gateway_id=NULL, checkout_url=NULL, session_state='uncertain' WHERE id=$1", [order.id]);

  const payment = payments.get(order.gateway_id);
  const originalAmount = payment.amount;
  payment.amount = 0.01;
  const unverified = (await post('/orders/' + order.id + '/verify', {}, alex)).data;
  assert.equal(unverified.gateway_id, null);

  payment.amount = originalAmount;
  const cancelled = (await post('/orders/' + order.id + '/cancel', {}, alex)).data;
  assert.equal(cancelled.gateway_id, order.gateway_id);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.canRetry, true);
});

test('webhooks reject missing, invalid and stale signatures and process a valid payment once', async () => {
  await cart(jamie, 'city-backpack', 1);
  const order = (await place(jamie, randomUUID())).data;
  const gateway = payments.get(order.gateway_id);
  gateway.paymentStatus = 'PAYMENT_SUCCESS';
  assert.equal((await post('/webhooks/maya', gateway)).status, 401);
  const forged = await call('POST', '/webhooks/maya', { body: gateway, headers: {
    'X-Maya-Webhook-Signature': 'nonce=testnonce,v1=' + 'a'.repeat(512), 'X-Maya-Webhook-Timestamp': String(Date.now()),
  } });
  assert.equal(forged.status, 401);
  assert.equal((await signedWebhook(gateway, -600000)).status, 401);
  assert.equal((await signedWebhook(gateway)).status, 200);
  assert.equal((await signedWebhook(gateway)).data.duplicate, true);
  await checkout.processQueue();
  await checkout.processQueue();
  const result = await get('/orders/' + order.id, jamie);
  assert.equal(result.data.status, 'paid');
  assert.equal(result.data.history.filter((entry) => entry.status === 'paid').length, 1);
  assert.equal((await post('/orders/' + order.id + '/cancel', {}, jamie)).status, 409);
  assert.equal((await call('PATCH', '/admin/orders/' + order.id, { token: admin, body: { status: 'processing' } })).data.status, 'processing');
});

test('missed webhook recovery checks both currency and amount before confirming payment', async () => {
  await cart(alex, 'overnight-duffel');
  const order = (await place(alex, randomUUID())).data;
  const payment = payments.get(order.gateway_id);
  payment.paymentStatus = 'PAYMENT_SUCCESS';
  const correct = payment.amount;
  payment.amount = 1;
  payment.currency = 'USD';
  const flagged = await post('/orders/' + order.id + '/verify', {}, alex);
  assert.equal(flagged.data.status, 'pending_payment');
  assert.equal(flagged.data.payment_flag.expectedCents, order.total_cents);
  assert.equal(flagged.data.payment_flag.receivedCurrency, 'USD');
  payment.amount = correct;
  assert.equal((await post('/orders/' + order.id + '/verify', {}, alex)).data.status, 'pending_payment');
  payment.currency = 'PHP';
  payment.totalAmount = { value: String(correct), currency: 'PHP' };
  delete payment.amount;
  delete payment.currency;
  assert.equal((await post('/orders/' + order.id + '/verify', {}, alex)).data.status, 'paid');
});

test('failed and expired payments release reservations after gateway confirmation', async () => {
  for (const [providerStatus, expected] of [['PAYMENT_FAILED','failed'], ['PAYMENT_EXPIRED','expired']]) {
    await cart(jamie, 'city-backpack', 1);
    const order = (await place(jamie, randomUUID())).data;
    const reserved = (await get('/products/city-backpack')).data.stock;
    payments.get(order.gateway_id).paymentStatus = providerStatus;
    if (expected === 'expired') {
      await db.query("UPDATE orders SET expires_at=now()-interval '1 minute' WHERE id=$1", [order.id]);
      await checkout.expireReservations();
    } else await signedWebhook(payments.get(order.gateway_id)).then(() => checkout.processQueue());
    assert.equal((await get('/orders/' + order.id, jamie)).data.status, expected);
    assert.equal((await get('/products/city-backpack')).data.stock, reserved + 1);
  }
});

test('AI failure falls back cleanly and validated picks only include real database products', async () => {
  assert.equal((await post('/ai/discover', { prompt: 'A bag for my laptop' })).error.code, 'AI_UNAVAILABLE');
  const discover = createDiscovery(db, { key: 'fixture', request: async (url, options) => {
    assert.match(url, /^https:\/\/generativelanguage\.googleapis\.com\//);
    const query = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
    assert.ok(query.candidates.every((bag) => bag.laptop_inches >= 14));
    return Response.json({ candidates: [{ content: { parts: [{ text: '{"ids":["a-made-up-product","city-backpack"]}' }] } }] });
  } });
  const result = await discover('A bag for my 14-inch laptop under PHP 2000');
  assert.equal(result.aiAssisted, true);
  assert.deepEqual(result.products.map((bag) => [bag.id, bag.price_cents]), [['city-backpack',159900]]);
});

test('admin inventory changes are auditable and soft deletion preserves order references', async () => {
  const id = 'city-backpack';
  const change = await call('PATCH', '/admin/products/' + id + '/stock', { token: admin, body: { stock: 14, reason: 'New stock arrived' } });
  assert.equal(change.data.stock, 14);
  const history = await get('/admin/products/' + id + '/stock', admin);
  assert.equal(history.data[0].reason, 'New stock arrived');
  assert.equal(history.data[0].new_stock, 14);
  assert.ok(history.data[0].actor);
  assert.equal((await call('DELETE', '/admin/products/' + id, { token: admin })).status, 204);
  assert.equal((await get('/products/' + id)).status, 404);
  const { rows } = await db.query('SELECT product_id FROM order_items WHERE product_id=$1', [id]);
  assert.ok(rows.length >= 1);
});

test('admin creates and edits a product, category and coupon through the API', async () => {
  const category = await post('/admin/categories', { id: 'belt-bags', name: 'Belt bags' }, admin);
  assert.equal(category.status, 201);
  const body = { id: 'belt-bag', name: 'Transit Belt Bag', description: 'Small day bag', color: 'Oat', image: '/images/crossbody.svg',
    background: '#ece8df', category_id: category.data.id, price_cents: 65000, stock: 7, laptop_inches: null, monogram_cents: 15000, active: true };
  assert.equal((await post('/admin/products', body, admin)).status, 201);
  const changed = await call('PATCH', '/admin/products/belt-bag', { token: admin, body: { name: 'City Belt Bag' } });
  assert.equal(changed.data.name, 'City Belt Bag');
  assert.equal(changed.data.monogram_cents, 15000);
  assert.equal(changed.data.stock, 7);
  const coupon = { couponCode: 'TEST150', kind: 'fixed', value: 15000, minimum_cents: 40000, expires_at: new Date(Date.now() + 604800000).toISOString(), max_uses: 5, max_per_user: 1 };
  assert.equal((await post('/admin/coupons', coupon, admin)).status, 201);
  await cart(alex, 'belt-bag', 1);
  assert.equal((await post('/checkout/quote', { couponCode: 'TEST150' }, alex)).data.discount_cents, 15000);
  assert.equal((await call('PUT', '/admin/coupons/TEST150', { token: admin, body: { ...coupon, active: false } })).status, 200);
  assert.equal((await post('/checkout/quote', { couponCode: 'TEST150' }, alex)).error.code, 'COUPON_INVALID');
  assert.equal((await call('PUT', '/admin/categories/belt-bags', { token: admin, body: { name: 'Belt bags', active: false } })).status, 200);
  assert.equal((await get('/products/belt-bag')).status, 404);
});
