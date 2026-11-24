# Carry & Co. test plan

Use this plan to choose demo requests, check the expected responses, and record the outcome of a new run. It covers the REST API, customer and admin access, checkout, Maya Sandbox, and Bag Finder.

## Choose a test environment

| Environment | Postman `baseUrl` | What to run |
| --- | --- | --- |
| Local test API | `http://localhost:4000/api/v1` | Full collection with a fresh, disposable seeded PostgreSQL database |
| Live API on Render | `https://carry-and-co-api.onrender.com/api/v1` | Individual read-only checks, such as API health and the catalog |

Postman appends the paths below to `baseUrl`. For example, **System › API health** sends `GET {{baseUrl}}/health`. The [Swagger UI](https://carry-and-co-api.onrender.com/api-docs) shows the full API contract, and the [Express route file](../backend/src/routes/api.js) shows where the main routes are registered. The [Maya webhook route](../backend/src/app.js) is registered in the app entry point.

## Run the Postman collection

1. Point the local backend at a disposable database, seed it, and start the API using the [README setup steps](../README.md#run-in-vs-code). The full collection creates accounts and orders and changes product stock.
2. Import [collection.json](../postman/collection.json) and [environment.example.json](../postman/environment.example.json). Select **Carry & Co. Local Sandbox** and set `baseUrl` to your local test API.
3. Fill `customerPassword` and `adminPassword` with your seeded test account passwords. Match `sandboxConfigured` and `aiConfigured` to the test API. These flags choose which response Postman expects. The backend configuration controls the providers.
4. Select **Carry & Co. API › Run**. Use one iteration and keep the request order. Sign-in requests set the tokens used by later requests, and checkout stores the order ID for replay and cancellation.
5. Review **Test Results**. A request can pass with a `4xx` response when rejection is the expected outcome. A full run passes when all selected requests complete with zero failed assertions.

## Postman cases to demonstrate

| Postman request | Method and path | Expected result |
| --- | --- | --- |
| System › API health | `GET /health` | `200` with `data.status` equal to `ok` |
| Catalog › Filter by laptop fit and budget | `GET /products` | `200` with up to three bags for a 15.6-inch laptop within the ₱2,000 budget |
| Auth › Sign in as customer | `POST /auth/login` | `200`. Postman saves the customer token for later requests |
| Cart › Require a token | `GET /cart` | `401` when no token is supplied |
| Admin › Reject customer access | `GET /admin/dashboard` | `403` when the signed-in customer requests an admin endpoint |
| Checkout › Reject expired coupon | `POST /checkout/quote` | `422` with the expired coupon error |
| Checkout › Create a sandbox checkout | `POST /checkout` | `201` and `pending_payment` when Maya Sandbox is configured |
| Checkout › Replay the same checkout key | `POST /checkout` | `200` with the same order ID for the same `Idempotency-Key` |
| Maya webhooks › Reject absent signature | `POST /webhooks/maya` | `401` when the request has no webhook signature |
| Discovery › Check AI or service fallback | `POST /ai/discover` | `200` when Bag Finder is configured and can return results, or `503` when the integration is unavailable |
| Admin › Adjust and audit stock | `PATCH /admin/products/metro-daypack/stock` | `200`. The matching **Review recorded stock changes** request reads the adjustment log |

## Run backend integration tests

Set `TEST_DATABASE_URL` to a disposable PostgreSQL database where your account can create a schema. From `backend`, run `npm.cmd test` on Windows or `npm test` on macOS or Linux. The suite seeds its own test schema and removes it after the run. See [store.test.js](../backend/tests/store.test.js).

Use these tests to show checks beyond a single Postman response. One of two concurrent checkouts can reserve the last item. A valid Maya event records one paid transition even if it arrives twice. A Gemini timeout returns matching in-stock products from the catalog. The tests control provider responses so these cases can run without contacting Maya or Gemini.

## Results and live verification

| Previous run on `e4367f8` | Recorded result |
| --- | --- |
| Postman CLI against the local Express test API and PostgreSQL, with controlled Maya and Gemini responses | 40 requests completed, 84 assertions passed, 0 failures |
| Backend integration suite on a fresh test schema | 14 tests passed, 0 failures |

Use the [deployed storefront](https://carry-and-co.vercel.app/) to verify the live integrations during your demo. Try **Bag Finder** with “A bag for my 16-inch laptop under ₱2,000” and compare the results with the catalog. Products can come from the catalog fallback during a Gemini timeout, so check `aiAssisted` in the API response when demonstrating a Gemini-assisted result. For the payment check, use a test account and a Maya Sandbox test card, then confirm the order reaches **Paid** in the storefront.

After a new run, record the date, environment, case or suite, expected result, actual result, and pass or fail. Keep screenshots or reports free of credentials and tokens.
