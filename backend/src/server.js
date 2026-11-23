import { getDatabase } from './config/database.js';
import { MayaCheckout } from './patterns/maya.js';
import { CheckoutService } from './services/orders.js';
import { createDiscovery } from './services/discovery.js';
import { createApp } from './app.js';

const env = process.env;
const secret = env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('Set JWT_SECRET to a random string of at least 32 characters.');
const frontend = new URL(env.FRONTEND_URL || 'http://localhost:5173');
if (env.NODE_ENV === 'production' && frontend.protocol !== 'https:') throw new Error('Set FRONTEND_URL to your HTTPS storefront.');
const db = await getDatabase();
const gateway = new MayaCheckout({
  publicKey: env.MAYA_PUBLIC_KEY, secretKey: env.MAYA_SECRET_KEY, frontendUrl: frontend.origin,
  webhookKeys: [env.MAYA_WEBHOOK_PUBLIC_KEY_1, env.MAYA_WEBHOOK_PUBLIC_KEY_2].filter(Boolean).map((key) => key.replaceAll('\\n', '\n')),
});
const checkout = new CheckoutService(db, gateway);
const discover = createDiscovery(db, { key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL });
const localOrigins = env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'] : [];
const origins = [frontend.origin, ...localOrigins, ...(env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)];
const app = createApp({ db, gateway, checkout, discover, secret, origins, trustProxy: Number(env.TRUST_PROXY_HOPS || 0) });
const server = app.listen(Number(env.PORT || 4000), () => console.log('Carry & Co. API listening on port', server.address().port));
let busy = false;
let lastExpiry = 0;
const worker = setInterval(async () => {
  if (busy) return;
  busy = true;
  try {
    await checkout.processQueue();
    if (Date.now() - lastExpiry > 60_000) {
      lastExpiry = Date.now();
      await checkout.expireReservations();
    }
  } catch (error) { console.error('Payment worker error', error.code || error.name); }
  finally { busy = false; }
}, 3000);
function stop() {
  clearInterval(worker);
  server.close(() => db.close());
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
