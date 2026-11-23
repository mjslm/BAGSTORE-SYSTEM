import { verify } from 'node:crypto';
import { HttpError } from '../utils/http.js';

const apiOrigin = 'https://pg-sandbox.paymaya.com';
const hostedOrigins = new Set([
  'https://payments-web-sandbox.maya.ph',
  'https://payments-web-sandbox.paymaya.com',
]);

export class MayaCheckout {
  constructor({ publicKey, secretKey, webhookKeys, frontendUrl, request = fetch }) {
    Object.assign(this, { publicKey, secretKey, webhookKeys, frontendUrl, request });
  }

  get configured() {
    return this.publicKey?.startsWith('pk-') && this.secretKey?.startsWith('sk-');
  }

  async call(path, key, body, method = body ? 'POST' : 'GET') {
    if (!this.configured) throw new HttpError(503, 'PAYMENT_UNAVAILABLE', 'Maya Sandbox has not been configured.');
    const unavailable = () => new HttpError(503, 'PAYMENT_UNAVAILABLE', 'Maya could not complete the request. Check your order before trying again.');
    let response;
    try {
      response = await this.request(apiOrigin + path, {
        method,
        headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'), 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
      });
    } catch { throw unavailable(); }
    if (!response.ok) {
      const error = unavailable();
      error.providerStatus = response.status;
      throw error;
    }
    if (response.status === 204) return null;
    try { return await response.json(); } catch { throw unavailable(); }
  }

  async create(order) {
    const returnUrl = (route) => new URL(route + '?orderId=' + order.id, this.frontendUrl).href;
    const result = await this.call('/checkout/v1/checkouts', this.publicKey, {
      totalAmount: { value: order.total_cents / 100, currency: order.currency },
      requestReferenceNumber: order.id,
      redirectUrl: { success: returnUrl('/payment/success'), failure: returnUrl('/payment/failed'), cancel: returnUrl('/payment/cancelled') },
    });
    if (!uuidPattern.test(result?.checkoutId || '') || !URL.canParse(result.redirectUrl) || !hostedOrigins.has(new URL(result.redirectUrl).origin)) {
      throw new HttpError(503, 'PAYMENT_UNAVAILABLE', 'Maya did not return a valid sandbox checkout link.');
    }
    return { id: result.checkoutId, url: result.redirectUrl };
  }

  async retrieve(id) {
    try {
      return await this.call('/payments/v1/payments/' + encodeURIComponent(id), this.secretKey);
    } catch (error) {
      if (error.providerStatus === 404) return null;
      throw error;
    }
  }

  async find(reference) {
    try {
      return await this.call('/payments/v1/payment-rrns/' + encodeURIComponent(reference), this.secretKey);
    } catch (error) {
      if (error.providerStatus === 404) return [];
      throw error;
    }
  }

  cancel(id) {
    return this.call('/payments/v1/payments/' + encodeURIComponent(id) + '/cancel', this.secretKey, undefined, 'POST');
  }

  verifyWebhook(raw, signatureHeader, timestamp) {
    return verifyMayaWebhook(raw, signatureHeader, timestamp, this.webhookKeys);
  }
}

export const uuidPattern = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

function flatten(value, path, leaves) {
  if (value === null || value === '') return;
  if (typeof value !== 'object') {
    leaves.push(path + '=' + String(value));
    return;
  }
  for (const [key, child] of Object.entries(value)) flatten(child, path ? path + '.' + key : key, leaves);
}

export function webhookSigningInput(payload, nonce) {
  const leaves = [];
  flatten(payload, '', leaves);
  return leaves.sort().join('&') + '&nonce=' + nonce;
}

function verifyMayaWebhook(raw, signatureHeader, timestamp, keys) {
  const rejected = () => new HttpError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Maya webhook verification failed.');
  if (!Buffer.isBuffer(raw) || !/^\d{13}$/.test(timestamp || '') || Math.abs(Date.now() - Number(timestamp)) > 300000) throw rejected();
  const fields = new Map();
  for (const part of (signatureHeader || '').split(',')) {
    const index = part.indexOf('=');
    const key = part.slice(0, index).trim();
    if (index < 1 || fields.has(key)) throw rejected();
    fields.set(key, part.slice(index + 1).trim());
  }
  const nonce = fields.get('nonce');
  const signature = fields.get('v1');
  if (!/^[a-z0-9-]{8,128}$/i.test(nonce || '') || !/^(?:[\da-f]{2}){128,512}$/i.test(signature || '')) throw rejected();
  let payload;
  try { payload = JSON.parse(raw.toString('utf8')); } catch { throw rejected(); }
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw rejected();
  const message = Buffer.from(webhookSigningInput(payload, nonce));
  const valid = (keys || []).some((key) => {
    const publicKey = typeof key === 'string' && !key.trimStart().startsWith('-----BEGIN ')
      ? { key: Buffer.from(key, 'base64'), format: 'der', type: 'spki' }
      : key;
    try { return verify('RSA-SHA256', message, publicKey, Buffer.from(signature, 'hex')); } catch { return false; }
  });
  if (!valid) throw rejected();
  return payload;
}
