# Carry & Co. Bags Store

Mobile React PWA and Express REST API. Customers can check laptop fit, add monograms on eligible bags, apply coupons, and track Maya Sandbox orders.

## Live deployment

| Service | URL |
| --- | --- |
| Storefront on Vercel | [carry-and-co.vercel.app](https://carry-and-co.vercel.app/) |
| Backend on Render | [**carry-and-co-api**](https://carry-and-co-api.onrender.com/) |
| API reference on Render | [carry-and-co-api.onrender.com/api-docs](https://carry-and-co-api.onrender.com/api-docs) |

The deployed API base URL is `https://carry-and-co-api.onrender.com/api/v1`. [Check API health](https://carry-and-co-api.onrender.com/api/v1/health).

## Project structure

| Folder | What's inside |
| --- | --- |
| `frontend/src/` | React pages and components, auth and cart context, and the shared API client in `api/` |
| `backend/src/` | Express routes and controllers, middleware and validators, business services, and payment and discount patterns |
| `backend/src/repositories/` and `backend/src/config/schema.sql` | PostgreSQL queries and table definitions |
| `backend/tests/` and `backend/openapi.yaml` | Integration tests and the OpenAPI specification |
| `postman/` | API test collection and a shareable environment template |

The Vercel storefront calls the Render API over HTTPS with JSON and uses a bearer token for signed-in requests. Express connects to Supabase PostgreSQL, calls Gemini for Bag Finder, Shopping Assistant, Visual Bag Search, and Inventory Advisor, and creates Maya Sandbox checkouts. Maya sends signed payment events back to the Render webhook at `/api/v1/webhooks/maya`. Express verifies the events before updating order records.

## Run in VS Code

Use Node.js 22.12 or later. Open the folder containing `backend` and `frontend` in VS Code.

### First-time backend setup

From the project root, install the backend dependencies, create the local `.env` if needed, and generate a JWT secret.

```powershell
cd backend
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
node -p "require('node:crypto').randomBytes(48).toString('hex')"
```

1. Paste the random value into `JWT_SECRET` in `backend/.env`. Keep `FRONTEND_URL=http://localhost:5173` for local development.
2. In Supabase, open **Connect** and copy the **Session pooler** connection string. Put it in `DATABASE_URL` with your URL-encoded database password. Add `?sslmode=verify-full&sslrootcert=supabase-ca.crt` after `/postgres`. If the connection string already has an `sslmode` parameter, replace it. The public certificate is in the `backend` folder. [Supabase connection guide](https://supabase.com/docs/guides/database/psql)
3. For a **new demo database**, set `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD` to private passwords of 12–72 bytes. Run `npm.cmd run seed` once from `backend`. Repeat runs add missing demo records. Existing accounts keep their current passwords.

Keep `backend/.env` private and use `.env.example` as the template shared with the project.

### Start the app

Open two PowerShell terminals at the project root. In the first, start the API.

```powershell
cd backend
npm.cmd run dev
```

In the second, start the storefront. Run `npm.cmd ci` on the first setup or after the lockfile changes.

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the [storefront](http://localhost:5173), [API health check](http://localhost:4000/api/v1/health), or [Swagger UI](http://localhost:4000/api-docs).

To test the production service worker locally, keep the API running and run `npm.cmd run build` followed by `npm.cmd run preview` from `frontend`. Open the [production preview](http://localhost:4173).

### Demo accounts

| Account | Email | Password |
| --- | --- | --- |
| Customer | jamie@carry.test | `SEED_CUSTOMER_PASSWORD` |
| Customer | alex@carry.test | `SEED_CUSTOMER_PASSWORD` |
| Administrator | admin@carry.test | `SEED_ADMIN_PASSWORD` |

Try `CARRY10` for 10% off qualifying orders, `PACK100` for ₱100 off qualifying orders, and `OLDDEAL` to see an expired coupon. Shipping is ₱120. Amounts use integer centavos, and percentage discounts round down to the nearest centavo.

## Maya Sandbox and AI features

- Set `MAYA_PUBLIC_KEY` and `MAYA_SECRET_KEY` using your Maya Sandbox credentials. Register your API's public HTTPS URL ending in `/api/v1/webhooks/maya` for `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_CANCELLED`, and `PAYMENT_EXPIRED`. Set `MAYA_WEBHOOK_PUBLIC_KEY_1` and `MAYA_WEBHOOK_PUBLIC_KEY_2` to the Sandbox signing keys. The app accepts each key as a single line of Base64 or as a PEM with literal `\n` between its lines. [Maya Checkout webhook guide](https://developers.maya.ph/reference/configuring-your-webhook-for-maya-checkout)
- Set `GEMINI_API_KEY` in the backend environment. `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`. Without credentials, Bag Finder returns a controlled 503, while Shopping Assistant and Inventory Advisor show their fallback results and Visual Bag Search offers a catalog alternative.

### AI Shopping Assistant, Visual Bag Search, and Inventory Advisor

- Open **AI tools → Shopping Assistant** to ask about current bag prices, features, laptop fit, monograms, and shipping. Follow-up questions use recent conversation context. The assistant uses public catalog data and returns product links. Its API is `POST /api/v1/ai/assistant`.
- Open **AI tools → Visual Bag Search**, choose a JPG, PNG or WebP photo (up to 10 MB), and select Find similar bags. The browser resizes the photo to a JPEG before sending it. Gemini identifies visible bag features and matches them to available catalog descriptions. The API (`POST /api/v1/ai/visual-search`) accepts up to 1 MiB of decoded image data and verifies returned product IDs.
- Sign in as an admin and open **Admin → Inventory Advisor → Analyze inventory**. The API (`POST /api/v1/admin/ai/inventory`) uses available stock and confirmed payments from the last 30 days. It estimates a 14-day stock target, with a minimum of five units for products with recent sales. Low stock without sales is flagged for manual review.
- All AI features use the existing server-side Gemini configuration. During provider failure, the Shopping Assistant shows a catalog help message and the Inventory Advisor returns its calculated inventory recommendations. Generating an advisor report does not change stock.

## Tests

See the [test plan](docs/test-plan.md) for the Postman demo cases, expected results, and previous test runs.

For backend integration tests, set `TEST_DATABASE_URL` in your terminal to a test PostgreSQL database with permission to create a schema. Run `npm.cmd test` from `backend`. The suite creates and removes its own test schema and uses controlled provider responses.

For manual API tests, import `postman/collection.json` and `postman/environment.example.json`. Point `baseUrl` to your test API and set `customerPassword` and `adminPassword` to the passwords used to seed that test database. Run the full collection against a disposable, seeded database because it creates orders and changes inventory.

## Deploy on Vercel and Render

Use this GitHub repository for both deployments and your existing Supabase project for the database. If you use a new database for the demo, point your local backend at that database and run `npm.cmd run seed` from `backend` before deploying.

| Setting | Vercel storefront | Render API |
| --- | --- | --- |
| Root directory | `frontend` | `backend` |
| Framework or runtime | Vite | Node |
| Build command | `npm run build` | `npm ci` |
| Output directory | `dist` | |
| Start command | | `npm start` |
| Health check path | | `/api/v1/health` |

1. Deploy the frontend on Vercel first to get its production HTTPS URL. [Vercel root directory setup](https://vercel.com/docs/monorepos)
2. Create a Render **Web Service**. Set `NODE_ENV=production`, set `FRONTEND_URL` to the Vercel HTTPS origin, and add `DATABASE_URL` with the same certificate options used locally. Set `JWT_SECRET` and the Maya and Gemini settings in Render's environment. Render supplies `PORT`. If the database already has the demo accounts and catalog, skip seeding. Open the Render URL with `/api/v1/health` appended and check for `"status":"ok"`. [Render Express setup](https://render.com/docs/deploy-node-express-app)
3. In Vercel, set `VITE_API_BASE_URL` to the Render HTTPS URL followed by `/api/v1`. Redeploy the storefront to apply the value. [Vercel environment variables](https://vercel.com/docs/environment-variables)
4. Open the Vercel URL and check the catalog, sign-in, and Bag Finder. Register the Maya Sandbox webhook and verify that a test order reaches **Paid**.

## Submission and defense

- Use the [demo checklist](docs/demo-checklist.md) for the presentation order and the [integration notes](docs/integration-notes.md) when explaining Gemini and Maya Sandbox.
- Name the archive `ITPE101_FINAL_<SECTION>_CARRYANDCO.zip` using your actual section or the name your instructor assigns. Include both `package-lock.json` files and both `.env.example` templates. Exclude `node_modules`, `dist`, `.env` files with real values, and local database data.
- Extract the archive to a fresh folder and follow the setup steps above with a demo database. Check the storefront, Swagger, and Postman before presenting.
- Keep a backup screen recording in case the internet or a hosting service is unavailable. Use demo accounts and Maya Sandbox test cards, and keep personal data and credentials out of the recording.

### Admin workspace and notifications

- **Admin → Dashboard** shows all-time paid sales, paid and unpaid order counts, current low stock, five recent orders and four recent activity events. Existing payments and inventory rules are unchanged.
- The bell in the header opens a private, read/unread notification inbox for the signed-in account. Customers receive their own order/payment updates. Admins receive store order/payment updates and alerts when available stock crosses the low-stock threshold (4 units) or reaches zero. The unread badge refreshes on navigation and every 30 seconds while the tab is visible.
- **Admin → Activity logs** lists order status, inventory adjustments, product changes, category changes and coupon changes with event type, reference, actor and time. Only administrators may access the feed. Existing order/stock histories are reused; catalog/coupon activity and notifications are recorded from this release onward.
- Restart the backend to create the two new tables automatically. No database reset, seed rerun or new environment variables are needed. Notifications are in-app, not email, SMS or browser push.
