import * as schemas from '../validators/input.js';
import { session, validate } from '../middleware/http.js';
import { registerUser, signIn } from '../services/identity.js';
import * as stock from '../services/catalog.js';
import { cartRows } from '../repositories/catalog.js';
import { listCoupons, quoteCart, saveCoupon } from '../services/pricing.js';
import { advanceOrder, dashboard, getOrder, listOrders } from '../services/orders.js';

const send = (res, data, status = 200, meta = {}) => res.status(status).json({ success: true, data, meta });
const pagination = (res, result) => send(res, result.data, 200, result.meta);
const id = (req) => validate(schemas.uuid, req.params.id);
const slug = (req) => validate(schemas.slug, req.params.id);
const body = (req, schema) => validate(schema, req.body);
const query = (req, schema) => validate(schema, req.query);

export function controllers({ db, secret, checkout, gateway, discover, shoppingAssistant, inventoryAdvisor }) {
  return {
    health: async (req, res) => { await db.query('SELECT 1'); send(res, { status: 'ok' }); },
    register: async (req, res) => send(res, session(await registerUser(db, body(req, schemas.register)), secret), 201),
    login: async (req, res) => send(res, session(await signIn(db, body(req, schemas.login)), secret)),
    me: (req, res) => send(res, req.user),
    products: async (req, res) => pagination(res, await stock.listProducts(db, query(req, schemas.catalog))),
    product: async (req, res) => send(res, await stock.getProduct(db, slug(req))),
    categories: async (req, res) => send(res, await stock.listCategories(db, false)),
    cart: async (req, res) => send(res, await stock.getCart(db, req.user.id)),
    editCart: async (req, res) => send(res, await stock.updateCart(db, req.user.id, body(req, schemas.cartItem))),
    quote: async (req, res) => {
      const { couponCode } = body(req, schemas.quote);
      send(res, await quoteCart(db, await cartRows(db, req.user.id), couponCode, req.user.id));
    },
    place: async (req, res) => {
      const result = await checkout.place(req.user, validate(schemas.uuid, req.get('Idempotency-Key')), body(req, schemas.checkout));
      send(res, result.order, result.created ? 201 : 200);
    },
    orders: async (req, res) => pagination(res, await listOrders(db, req.user, query(req, schemas.orders))),
    order: async (req, res) => send(res, await getOrder(db, id(req), req.user)),
    verify: async (req, res) => send(res, await checkout.verifyOrder(id(req), req.user)),
    cancel: async (req, res) => send(res, await checkout.cancel(id(req), req.user)),
    restore: async (req, res) => send(res, await checkout.restore(id(req), req.user)),
    webhook: async (req, res) => {
      const payload = gateway.verifyWebhook(req.body, req.get('X-Maya-Webhook-Signature'), req.get('X-Maya-Webhook-Timestamp'));
      send(res, await checkout.recordWebhook(payload));
    },
    discover: async (req, res) => send(res, await discover(body(req, schemas.ai).prompt)),
    shoppingAssistant: async (req, res) => send(res, await shoppingAssistant(body(req, schemas.shopping))),
    dashboard: async (req, res) => send(res, await dashboard(db)),
    inventoryAdvisor: async (req, res) => send(res, await inventoryAdvisor()),
    adminProducts: async (req, res) => pagination(res, await stock.listProducts(db, query(req, schemas.catalog), true)),
    createProduct: async (req, res) => {
      const input = body(req, schemas.product.extend({ id: schemas.slug }));
      send(res, await stock.saveProduct(db, input.id, input, req.user.id, true), 201);
    },
    saveProduct: async (req, res) => send(res, await stock.saveProduct(db, slug(req), body(req, schemas.editProduct), req.user.id, false)),
    deleteProduct: async (req, res) => { await stock.deleteProduct(db, slug(req)); res.sendStatus(204); },
    adjustStock: async (req, res) => send(res, await stock.adjustStock(db, slug(req), body(req, schemas.stockChange), req.user.id)),
    stockHistory: async (req, res) => pagination(res, await stock.stockHistory(db, slug(req), query(req, schemas.paging))),
    adminCategories: async (req, res) => send(res, await stock.listCategories(db, true)),
    createCategory: async (req, res) => {
      const input = body(req, schemas.category.extend({ id: schemas.slug }));
      send(res, await stock.saveCategory(db, input.id, input, true), 201);
    },
    saveCategory: async (req, res) => send(res, await stock.saveCategory(db, slug(req), body(req, schemas.category), false)),
    coupons: async (req, res) => pagination(res, await listCoupons(db, query(req, schemas.paging))),
    createCoupon: async (req, res) => {
      const input = body(req, schemas.createCoupon);
      send(res, await saveCoupon(db, input.couponCode, input, true), 201);
    },
    saveCoupon: async (req, res) => send(res, await saveCoupon(db, validate(schemas.couponCode, req.params.code), body(req, schemas.coupon), false)),
    adminOrders: async (req, res) => pagination(res, await listOrders(db, req.user, query(req, schemas.orders), true)),
    advance: async (req, res) => send(res, await advanceOrder(db, id(req), body(req, schemas.transition).status, req.user.id)),
  };
}
