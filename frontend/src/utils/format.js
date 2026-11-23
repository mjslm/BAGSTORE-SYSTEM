const php = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger' });
const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const mayaSandboxOrigins = new Set([
  'https://payments-web-sandbox.maya.ph',
  'https://payments-web-sandbox.paymaya.com',
]);
export const money = (cents) => php.format(cents / 100);
export const when = (date) => dateTime.format(new Date(date));
export const statusLabel = (status) => ({
  pending_payment: 'Awaiting payment', paid: 'Paid', processing: 'Processing', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled', expired: 'Expired', failed: 'Payment failed',
})[status] || status;
export const orderNumber = (id) => '#' + id.slice(0, 8).toUpperCase();

export function returnPath(value) {
  return typeof value === 'string' && /^\/(?![\/\\])/.test(value) ? value : '/';
}
export function mayaRedirect(value) {
  const url = new URL(value);
  if (!mayaSandboxOrigins.has(url.origin)) throw new Error('The Maya Sandbox checkout URL is invalid.');
  window.location.href = url.href;
}
