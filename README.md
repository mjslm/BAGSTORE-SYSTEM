# Carry & Co. Bags Store

A mobile-first e-commerce Progressive Web App for bags, built with React, Express and PostgreSQL. Carry & Co. combines laptop-fit shopping, personalized monograms, secure server-side checkout, Gemini-assisted discovery and an integrated administrator workspace.

## Live deployment

| Service | URL |
| --- | --- |
| Storefront (Vercel) | [carry-and-co.vercel.app](https://carry-and-co.vercel.app/) |
| Backend (Render) | [carry-and-co-api.onrender.com](https://carry-and-co-api.onrender.com/) |
| API health | [GET /api/v1/health](https://carry-and-co-api.onrender.com/api/v1/health) |
| API documentation | [Swagger UI](https://carry-and-co-api.onrender.com/api-docs) |

API base URL: `https://carry-and-co-api.onrender.com/api/v1`

## Features

| Customer experience | Store administration |
| --- | --- |
| Account registration and sign-in | Role-protected store dashboard |
| Product catalog, budget and laptop-fit filters | Product, category, coupon and inventory management |
| Monogram personalization on eligible bags | Order management and fulfillment status |
| Cart, discounts and Maya Sandbox checkout | Gross sales, pending payments and low-stock watchlist |
| Order tracking and private notification inbox | Notifications and filterable activity logs |
| Bag Finder, Shopping Assistant and Visual Bag Search | AI Inventory Advisor |
| Responsive, installable PWA with cached public catalog | Responsive administrative interface |

### AI tools

All four tools use server-side Gemini configuration and current catalog or inventory data. Product IDs are validated against the database before being presented to shoppers.

| Feature | API endpoint | Purpose |
| --- | --- | --- |
| Bag Finder | `POST /api/v1/ai/discover` | Match a natural-language prompt to in-stock bags using budget, laptop fit and other preferences. |
| Shopping Assistant | `POST /api/v1/ai/assistant` | Answer catalog, shipping and monogram questions, including follow-ups. |
| Visual Bag Search | `POST /api/v1/ai/visual-search` | Identify visible bag features in a photo and find similar available products. |
| Inventory Advisor (admin) | `POST /api/v1/admin/ai/inventory` | Explain replenishment recommendations based on current stock and recent verified sales. |

Visual Bag Search supports JPG, PNG and WebP uploads up to 10 MB. The browser resizes the photo before sending it; the API accepts up to 1 MiB of decoded image data. The app does not persist uploaded photos.

Inventory Advisor calculates recommendations from the past 30 days of verified sales, targeting 14 days of demand with a minimum target of five units for products with sales. Low-stock products without recent sales require manual review. The report is read-only and does not automatically change inventory. Catalog/rules fallbacks are distinguished from actual AI-assisted responses.

### Admin workspace and notifications

- **Dashboard:** all-time gross sales, paid orders, awaiting payment, current low stock, the five most recent orders, inventory watchlist and recent activity.
- **Notification inbox:** customers receive their own order and payment updates. Admins receive store order/payment updates and eligible low-stock alerts (4 or fewer units) and out-of-stock alerts. Individual and bulk mark-as-read actions are recipient-scoped. The unread badge refreshes on navigation and approximately every 30 seconds while the signed-in online tab is visible.
- **Activity logs:** administrator-only history of orders, stock, product, category and coupon changes, including event, actor, reference and timestamp. Existing order/stock history is preserved; new notifications and catalog/coupon audit events are recorded after deployment.
- Notifications are in-app updates, not email, SMS or browser push.

## Technology and architecture

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, React Router, reusable components, context, hooks and responsive CSS |
| Mobile PWA | Vite PWA and Workbox service worker |
| Backend | Node.js, Express REST API, Zod validation, JWT authentication and bcrypt |
| Database | Supabase PostgreSQL |
| Payment | Maya Sandbox |
| Artificial intelligence | Google Gemini |
| API documentation and tests | OpenAPI/Swagger, Postman and Node.js integration tests |
| Deployment | Vercel frontend, Render backend and Supabase database |

The React frontend communicates with Express over a versioned JSON REST API. Express enforces authorization and owns pricing, coupon rules, stock reservations and payment confirmation. It connects to PostgreSQL, calls Gemini and manages Maya Sandbox checkout sessions. Signed Maya webhooks are verified before order updates.

Core design patterns include MVC-style separation, the discount factory and strategies, and dependency composition in the checkout service.

## Project structure

| Path | Responsibility |
| --- | --- |
| `frontend/src/` | React pages, UI components, routing, contexts, hooks and API client |
| `frontend/public/` | Product images, fonts and app icons |
| `frontend/vite.config.js` | Local API proxy, PWA manifest and service worker configuration |
| `backend/src/routes/` and `controllers/` | REST routing and HTTP request handling |
| `backend/src/services/` and `patterns/` | Business logic, checkout, AI and discount strategies |
| `backend/src/repositories/` and `config/schema.sql` | PostgreSQL queries and schema |
| `backend/tests/` and `backend/openapi.yaml` | Integration tests and API specification |
| `postman/` | Postman collection and shareable environment template |
| `docs/` | Application walkthrough, integration notes and test plan |

## Run in VS Code

Use Node.js 22.12 or newer. Open the project root containing both `backend` and `frontend`.

### 1. Backend configuration

Right-click the **backend** folder and select **Open in Integrated Terminal**.

```powershell
npm.cmd ci
Test-Path .env
```

If recovering an existing installation, copy the saved private `backend/.env` into this folder. Do not overwrite existing valid credentials or change the JWT secret unnecessarily. A source-only archive includes `.env.example`, not private values.

For a fresh configuration only:

```powershell
Copy-Item .env.example .env
node -p "require('node:crypto').randomBytes(48).toString('hex')"
```

Set the generated value as `JWT_SECRET` and configure the environment using the table below.

| Backend variable | Purpose |
| --- | --- |
| `PORT` | Local API port (4000) |
| `FRONTEND_URL` | Local storefront origin: `http://localhost:5173` |
| `JWT_SECRET` | Private JWT signing secret, at least 32 characters |
| `DATABASE_URL` | Private Supabase PostgreSQL connection string |
| `MAYA_PUBLIC_KEY`, `MAYA_SECRET_KEY` | Maya Sandbox checkout configuration |
| `MAYA_WEBHOOK_PUBLIC_KEY_1`, `MAYA_WEBHOOK_PUBLIC_KEY_2` | Maya Sandbox webhook signing verification keys |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Server-side Gemini configuration (default model: `gemini-3.1-flash-lite`) |
| `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_PASSWORD` | Private seed-account passwords for a new database |

In Supabase, use **Connect → Session pooler**. Set `DATABASE_URL` with the URL-encoded database password and `sslmode=verify-full&sslrootcert=supabase-ca.crt`. Do not duplicate an existing sslmode parameter. The public CA certificate is included in `backend/`. See the [Supabase connection guide](https://supabase.com/docs/guides/database/psql).

For a **new demo database only**, set seed passwords of 12–72 bytes, then run `npm.cmd run seed` from the backend folder. Repeat runs add missing demo records; existing accounts keep their passwords. Do not reset or reseed an established database for routine startup. Backend startup creates new schema tables idempotently.

Keep `.env` and private keys out of GitHub and the public frontend.

### 2. Start the backend

In the backend terminal:

```powershell
npm.cmd run dev
```

Wait for `Carry & Co. API listening on port 4000`. Open [local API health](http://localhost:4000/api/v1/health) to verify `data.status: "ok"`.

### 3. Start the frontend

Open a separate integrated terminal in the **frontend** folder.

```powershell
npm.cmd ci
npm.cmd run dev
```

If dependencies are already installed and the lockfile is unchanged, skip `npm.cmd ci`. Do not run `cd frontend` again when the terminal is already in that folder.

Keep both terminals running. Open [localhost:5173](http://localhost:5173/) and [local Swagger UI](http://localhost:4000/api-docs).

The default local frontend API URL is `/api/v1` (also in `frontend/.env.example`). Vite proxies this path to `http://localhost:4000`.

### Demo accounts and coupons

| Account | Email | Password configuration |
| --- | --- | --- |
| Customer | jamie@carry.test | `SEED_CUSTOMER_PASSWORD` |
| Customer | alex@carry.test | `SEED_CUSTOMER_PASSWORD` |
| Administrator | admin@carry.test | `SEED_ADMIN_PASSWORD` |

Use the passwords configured when these accounts were seeded. Try `CARRY10` for 10% off qualifying orders, `PACK100` for ₱100 off qualifying orders and `OLDDEAL` for an expired-coupon case. Shipping is ₱120. Server amounts are integer centavos; percentage discounts round down to the nearest centavo.

### Local troubleshooting

| Symptom | Resolution |
| --- | --- |
| Cannot find `frontend/frontend` | The terminal is already inside the frontend folder. |
| Vite `ECONNREFUSED` | Check that the backend is running on port 4000 and its health endpoint responds. |
| `.env not found` or missing JWT secret | Restore the correct private backend `.env` and verify with `Test-Path .env`. |
| Maya payment failed | Verify the order status before retrying; restore eligible failed order items to the cart. Use official Sandbox test cards only. |
| AI unavailable or fallback | Check the server configuration and connectivity; distinguish catalog/rules fallback from live Gemini output. |

## Payment integration

Configure the server with Maya Sandbox credentials and register the publicly reachable HTTPS webhook endpoint `/api/v1/webhooks/maya` for the success, failure, cancellation and expiry events. Set the provider verification public keys as Base64 or PEM with literal escaped newlines. See the [Maya Checkout webhook guide](https://developers.maya.ph/reference/configuring-your-webhook-for-maya-checkout).

The server reserves inventory, creates a checkout session and verifies the order reference, status, amount and currency before marking an order paid. Repeated checkout keys and webhook events are handled without double counting. Confirmed terminal failures release reserved stock. Return verification can work locally even if a webhook cannot reach localhost directly.

Use [official Maya Sandbox test instruments](https://developers.maya.ph/reference/testing-and-validating-your-maya-checkout-integration); never enter a real card. A successful browser redirect alone is not proof of payment.

## Progressive Web App

The storefront supports installation, responsive navigation, cached public catalog data and images, and an offline indicator. Online services such as checkout, account verification, admin changes, notifications and Gemini require network access.

To test the production service worker, keep the API running, open a frontend terminal and run:

```powershell
npm.cmd run build
npm.cmd run preview
```

Open [localhost:4173](http://localhost:4173/), visit the catalog online, then test offline browsing. For live quality checks, use the deployed HTTPS storefront and Chrome Lighthouse.

## API documentation and testing

- Swagger UI: [local](http://localhost:4000/api-docs) · [deployed](https://carry-and-co-api.onrender.com/api-docs)
- OpenAPI specification: [backend/openapi.yaml](backend/openapi.yaml)
- Postman: [collection](postman/collection.json) · [environment template](postman/environment.example.json)

For backend integration tests, set `TEST_DATABASE_URL` to a disposable PostgreSQL database with permission to create a schema. Run `npm.cmd test` from the backend terminal. The suite creates and removes its own test schema and uses controlled provider responses.

For Postman, import both JSON files, choose the test API base URL, use the seeded test passwords and set provider expectation flags to match the test environment. Run the full collection against a disposable database only; it creates records and changes stock.

### Latest recorded verification

November 27, 2026 — merged application revision `9e3de18` (PR #9). Verified on an isolated PostgreSQL database with controlled Maya/Gemini responses.

| Check | Result |
| --- | --- |
| Frontend production build | Passed |
| Backend integration tests | 18/18 passed |
| Postman requests | 53/53 completed |
| Postman assertions | 118/118 passed |
| OpenAPI operations | 41 documented |
| Dashboard, activity and both notification inboxes | Passed responsive checks at nine widths |

These are local verification results, not a claim that live provider credentials or current deployed Lighthouse scores were retested. See [test plan](docs/test-plan.md) for scope and live verification checkpoints.

## Deploy on Vercel and Render

Use the repository for both deployments with Supabase PostgreSQL for persistence.

| Setting | Vercel storefront | Render API |
| --- | --- | --- |
| Root directory | `frontend` | `backend` |
| Framework/runtime | Vite | Node |
| Build command | `npm run build` | `npm ci` |
| Output directory | `dist` | — |
| Start command | — | `npm start` |
| Health check path | — | `/api/v1/health` |

1. Deploy the frontend on Vercel to obtain the production HTTPS origin. [Vercel root directory setup](https://vercel.com/docs/monorepos)
2. Create a Render web service. Set `NODE_ENV=production`, `FRONTEND_URL` to the Vercel HTTPS origin, and configure the private database, JWT, Maya and Gemini variables on Render. Render provides `PORT`. Existing databases do not require a fresh seed. Check `/api/v1/health`. [Render Express setup](https://render.com/docs/deploy-node-express-app)
3. Set Vercel's `VITE_API_BASE_URL` to the Render HTTPS API URL followed by `/api/v1`, and redeploy. [Vercel environment variables](https://vercel.com/docs/environment-variables)
4. Verify storefront, sign-in, four AI tools, admin dashboard, notification inbox and activity logs. Register the Maya Sandbox webhook and confirm a test order reaches Paid through verified payment details.

## Documentation

- [Application walkthrough](docs/demo-checklist.md)
- [Architecture and integration notes](docs/integration-notes.md)
- [Testing and verification](docs/test-plan.md)
- [Frontend PWA setup](frontend/README.md)
