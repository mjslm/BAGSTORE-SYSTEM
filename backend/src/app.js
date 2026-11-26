import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-dist';
import { fileURLToPath } from 'node:url';
import { controllers } from './controllers/api.js';
import { apiRoutes } from './routes/api.js';
import { authMiddleware, errorHandler, requestId } from './middleware/http.js';
import { HttpError } from './utils/http.js';
import { createGemini } from './services/gemini.js';
import { createShoppingAssistant } from './services/shopping.js';
import { createInventoryAdvisor } from './services/inventoryAdvisor.js';
import { createVisualSearch } from './services/visualSearch.js';

const referencePage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Carry &amp; Co. API</title><link rel="stylesheet" href="/api-docs/assets/swagger-ui.css"></head><body>
<div id="swagger-ui"></div><script src="/api-docs/assets/swagger-ui-bundle.js"></script><script src="/api-docs/init.js"></script></body></html>`;
const referenceSpec = fileURLToPath(new URL('../openapi.yaml', import.meta.url));

export function createApp({ db, gateway, checkout, discover, aiOptions = {}, secret, origins, trustProxy }) {
  const app = express();
  if (trustProxy) app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');
  app.use(requestId, helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, Boolean(origin));
      callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed.'));
    },
  }));
  const gemini = createGemini(aiOptions);
  const shoppingAssistant = createShoppingAssistant(db, gemini);
  const inventoryAdvisor = createInventoryAdvisor(db, gemini);
  const visualSearch = createVisualSearch(db, gemini);
  const api = controllers({ db, gateway, checkout, discover, shoppingAssistant, inventoryAdvisor, visualSearch, secret });
  app.use('/api/v1', (req, res, next) => {
    const catalog = req.method === 'GET' && /^\/(?:products(?:\/[^/]+)?|categories)\/?$/.test(req.path);
    res.setHeader('Cache-Control', catalog ? 'public, max-age=0, must-revalidate' : 'no-store');
    next();
  });
  app.post('/api/v1/webhooks/maya', express.raw({ type: 'application/json', limit: '64kb' }), api.webhook);
  app.use('/api/v1/ai/visual-search', express.json({ limit: '1400kb' }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/v1', apiRoutes(api, authMiddleware(db, secret)));
  app.get('/openapi.yaml', (req, res) => res.type('yaml').sendFile(referenceSpec));
  app.get('/api-docs', (req, res) => res.send(referencePage));
  app.get('/api-docs/init.js', (req, res) => res.type('js').send("SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#swagger-ui', validatorUrl: null, supportedSubmitMethods: ['get','post','put','patch','delete'] });"));
  app.use('/api-docs/assets', express.static(swaggerUi.getAbsoluteFSPath(), { index: false }));
  app.use((req, res, next) => next(new HttpError(404, 'NOT_FOUND', 'That API route does not exist.')));
  app.use(errorHandler);
  return app;
}
