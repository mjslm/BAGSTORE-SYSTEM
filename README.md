# Carry & Co. Bags Store

Mobile React PWA and Express REST API. Customers can check laptop fit, add monograms on eligible bags, apply coupons, and track Maya Sandbox orders.

## Run in VS Code

Use Node.js 22.12 or later. Extract the ZIP and open the folder containing `backend` and `frontend`.

In a PowerShell terminal at the project root:

```powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy that random value into `JWT_SECRET` in `backend/.env`. In your Supabase project, open **Connect → Direct → Session pooler**. Set `DATABASE_URL` in `backend/.env` to the connection string with your database password. Set `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD` to private passwords of 12–72 bytes. Then run:

```powershell
npm.cmd run seed
npm.cmd run dev
```

Open a second terminal at the project root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:5173. Swagger is at http://localhost:4000/api-docs. For a service-worker test, run `npm.cmd run build` and `npm.cmd run preview` inside `frontend/`, then visit http://localhost:4173.

The API stores data in your configured Supabase database. Run `npm.cmd run seed` once to create the demo accounts. Repeat runs add missing demo records, and existing accounts retain their passwords.

| Account | Email | Password |
| --- | --- | --- |
| Customer | jamie@carry.test | `SEED_CUSTOMER_PASSWORD` |
| Customer | alex@carry.test | `SEED_CUSTOMER_PASSWORD` |
| Administrator | admin@carry.test | `SEED_ADMIN_PASSWORD` |

Try `CARRY10` for 10% off qualifying orders, `PACK100` for ₱100 off qualifying orders, and `OLDDEAL` to see an expired coupon. Shipping is ₱120. Amounts use integer centavos, and percentage discounts round down to the nearest centavo.

## Maya Sandbox and Bag Finder

- Set `MAYA_PUBLIC_KEY` and `MAYA_SECRET_KEY` using your Maya Sandbox credentials. Register the public HTTPS API endpoint `/api/v1/webhooks/maya` for `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_CANCELLED`, and `PAYMENT_EXPIRED`. Configure at least one Maya Sandbox webhook signing public key using `MAYA_WEBHOOK_PUBLIC_KEY_1`. Use `MAYA_WEBHOOK_PUBLIC_KEY_2` if Maya supplies a second key for rotation. A PEM can be entered on one line using literal \n between its lines. See [Maya Checkout](https://developers.maya.ph/reference/accept-one-time-payment-using-maya-checkout) and [Maya webhook security](https://developers.maya.ph/reference/webhook-security).
- Set `GEMINI_API_KEY` in the backend environment. `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`. Without credentials, the corresponding service returns a controlled 503, and the catalog remains usable.

## Tests and deployment

For backend integration tests, set `TEST_DATABASE_URL` in your terminal to a PostgreSQL connection with permission to create a schema, then run `npm.cmd test` from `backend/`. Tests create and clean up a unique schema and exercise Express over HTTP with controlled provider responses. Import the JSON files in `postman/` for interactive API tests. Fill the two password variables with the passwords you used to seed the accounts. A future breaking change would use a separate `/api/v2` router while maintaining the existing v1 contract.

For deployment, use a PostgreSQL connection string in `DATABASE_URL` and set `NODE_ENV=production`. Set individual test-only `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD`, then run `npm run seed` on the backend host. Start the backend with `npm start`. Set `FRONTEND_URL` to the Vercel HTTPS origin and set `TRUST_PROXY_HOPS` to the correct proxy count for your host if needed. Deploy `frontend/` from the same repository as a Vite project and set its `VITE_API_BASE_URL` to the hosted HTTPS backend URL plus `/api/v1`.
