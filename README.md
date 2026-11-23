# Carry & Co. Bags Store

Mobile React PWA and Express REST API. Customers can check laptop fit, add monograms on eligible bags, apply coupons, and track Maya Sandbox orders.

## Live deployment

| Service | URL |
| --- | --- |
| Storefront on Vercel | [carry-and-co.vercel.app](https://carry-and-co.vercel.app/) |
| Backend on Render | [**carry-and-co-api**](https://carry-and-co-api.onrender.com/) |
| API reference on Render | [carry-and-co-api.onrender.com/api-docs](https://carry-and-co-api.onrender.com/api-docs) |

The deployed API base URL is `https://carry-and-co-api.onrender.com/api/v1`. [Check API health](https://carry-and-co-api.onrender.com/api/v1/health).

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

In the second, start the storefront. Run `npm.cmd ci` from `frontend` before its first launch.

```powershell
cd frontend
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

## Maya Sandbox and Bag Finder

- Set `MAYA_PUBLIC_KEY` and `MAYA_SECRET_KEY` using your Maya Sandbox credentials. Register your API's public HTTPS URL ending in `/api/v1/webhooks/maya` for `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_CANCELLED`, and `PAYMENT_EXPIRED`. Set `MAYA_WEBHOOK_PUBLIC_KEY_1` and `MAYA_WEBHOOK_PUBLIC_KEY_2` to the Sandbox signing keys. The app accepts each key as a single line of Base64 or as a PEM with literal `\n` between its lines. [Maya Checkout webhook guide](https://developers.maya.ph/reference/configuring-your-webhook-for-maya-checkout)
- Set `GEMINI_API_KEY` in the backend environment. `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`. Without credentials, the corresponding service returns a controlled 503, and the catalog remains usable.

## Tests

For backend integration tests, set `TEST_DATABASE_URL` in your terminal to a test PostgreSQL database with permission to create a schema. Run `npm.cmd test` from `backend`. The suite creates and removes its own test schema and uses controlled provider responses.

For manual API tests, import `postman/collection.json` and `postman/environment.example.json`. Set `customerPassword` and `adminPassword` to your demo account passwords.

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
