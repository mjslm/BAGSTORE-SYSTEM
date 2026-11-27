# Carry & Co. — API and application test plan

**Updated:** November 27, 2026 — features through PR #9

This plan covers the REST API, business rules, Maya Sandbox, all four Gemini tools, admin dashboard, notification inbox, activity logs and mobile PWA. Use the [demo checklist](demo-checklist.md) to present the system and the [integration notes](integration-notes.md) to explain the implementation.

## 1. Test safely

| Environment | Postman `baseUrl` | What to run |
| --- | --- | --- |
| Local disposable test database | `http://localhost:4000/api/v1` | Full collection, automated tests and state-changing demonstration |
| Live Render/Supabase deployment | `https://carry-and-co-api.onrender.com/api/v1` | Individual read-only health/catalog checks; dedicated authorized sandbox demo orders only |

The full collection creates users and orders, changes stock and removes temporary products. Do not point it at the shared live store database. Use a disposable seeded database with demo data, never actual customer shipping or payment information.

Start the local backend and frontend as documented in the [README](../README.md#run-in-vs-code). Confirm [local API health](http://localhost:4000/api/v1/health) before opening the storefront. The [Swagger UI](https://carry-and-co-api.onrender.com/api-docs) describes the API contract; [routes](../backend/src/routes/api.js) and [the app entry point](../backend/src/app.js) register the endpoints.

## 2. Run the Postman collection

1. Configure a disposable test database, seed demo data and start the local API. Keep the backend `.env` private.
2. Import [collection.json](../postman/collection.json) and [environment.example.json](../postman/environment.example.json). Select **Carry & Co. Local Sandbox**, and verify `baseUrl` ends in `/api/v1`.
3. Fill `customerPassword` and `adminPassword` with the seeded test passwords. Set `sandboxConfigured` and `aiConfigured` to match the API under test. These flags select expected responses; they do not enable provider access.
4. Run **Carry & Co. API** with one iteration and the original request order. Login requests store customer/admin tokens; checkout stores an order ID and idempotency key for later requests.
5. Review request results and assertions. An expected `401`, `403` or `422` is a passing result when the test explicitly checks rejection.
6. Reset or recreate the disposable database before repeating the full run. Do not export populated token/password variables.

## 3. Selected Postman cases to present

All method/path entries below are relative to `baseUrl`. Request names match the supplied Postman collection.

### Core store, access control and checkout

| Postman request | Method and path | Expected result |
| --- | --- | --- |
| System › API health | `GET /health` | 200; `data.status: "ok"` |
| Auth › Register a customer | `POST /auth/register` | 201; customer account |
| Auth › Reject duplicate email | `POST /auth/register` | 409; duplicate email rejected |
| Auth › Sign in as customer | `POST /auth/login` | 200; token saved |
| Catalog › Filter by laptop fit and budget | `GET /products?laptop=15.6&maxPrice=200000&limit=3` | 200; up to three matching in-budget bags |
| Cart › Require a token | `GET /cart` | 401; unauthenticated |
| Cart › Reject unavailable quantity | `PATCH /cart` | 409; unavailable stock rejected |
| Cart › Reject invalid initials | `PATCH /cart` | 422; invalid monogram |
| Cart › Set one monogrammed bag | `PATCH /cart` | 200; eligible bag and monogram fee |
| Checkout › Apply percentage coupon | `POST /checkout/quote` | 200; server-calculated discount |
| Checkout › Reject expired coupon | `POST /checkout/quote` | 422; expired coupon rejected |
| Checkout › Create a sandbox checkout | `POST /checkout` | 201; pending payment when Sandbox is configured |
| Checkout › Replay the same checkout key | `POST /checkout` | 200; same order ID, no duplicate |
| Orders › List customer orders | `GET /orders` | 200; signed-in customer's orders |
| Maya webhooks › Reject absent signature | `POST /webhooks/maya` | 401; signature required |
| Admin › Reject customer access | `GET /admin/dashboard` | 403; customer lacks admin role |
| Admin › Read store dashboard | `GET /admin/dashboard` | 200; server-derived dashboard values |
| Admin › Adjust and audit stock | `PATCH /admin/products/metro-daypack/stock` | 200; changed stock recorded |
| Admin › Review recorded stock changes | `GET /admin/products/metro-daypack/stock` | 200; matching adjustment history |

### Gemini AI

| Postman request | Method and path | Expected result |
| --- | --- | --- |
| Discovery › Check AI or service fallback | `POST /ai/discover` | 200 with AI or catalog picks when configured; 503 if service is unavailable |
| Discovery › Ask the Shopping Assistant | `POST /ai/assistant` | 200; answer, validated product references and `aiAssisted` |
| Discovery › Reject invalid bag photo | `POST /ai/visual-search` | 422; invalid image data |
| Discovery › Find similar bags by photo | `POST /ai/visual-search` | 200; image analysis and real product matches, or 503 if provider unavailable |
| Admin › Require a token for Inventory Advisor | `POST /admin/ai/inventory` | 401; login required |
| Admin › Reject customer access to Inventory Advisor | `POST /admin/ai/inventory` | 403; admin role required |
| Admin › Analyze inventory as admin | `POST /admin/ai/inventory` | 200; verified sales, stock, policy and recommendations |

### Notifications and activity

| Postman request | Method and path | Expected result |
| --- | --- | --- |
| Reject anonymous notifications | `GET /notifications` | 401; login required |
| Customer notification inbox | `GET /notifications?limit=5` | 200; private paginated inbox |
| Customer unread count | `GET /notifications/unread-count` | 200; nonnegative unread count |
| Read all customer notifications | `PATCH /notifications/read-all` | 200; updated count for own inbox |
| Admin notification inbox | `GET /notifications?unread=true` | 200; unread admin notifications only |
| Reject customer activity access | `GET /admin/activity` | 403; admin role required |
| Read admin activity log | `GET /admin/activity?category=inventory&limit=5` | 200; filtered inventory events |

The full collection has 53 requests, including the prerequisites and additional validation/CRUD cases. The OpenAPI document describes 41 API operations; the collection also tests multiple outcomes against individual operations.

## 4. Automated backend integration tests

Set `TEST_DATABASE_URL` to a disposable PostgreSQL database that permits creating a schema. From the backend terminal:

```powershell
npm.cmd ci
npm.cmd test
```

If dependencies are installed, skip `npm.cmd ci`. The suite creates a temporary test schema, seeds it and removes it after testing. It substitutes controlled Maya and Gemini responses; it does not need live provider calls. See [store.test.js](../backend/tests/store.test.js).

| Coverage | What the automated tests verify |
| --- | --- |
| Auth and catalog | Password hashing, normalization, duplicate and bad credentials, protected routes, role checks, laptop/budget filtering and pagination |
| Cart and pricing | Valid personalization, server-derived prices, coupon validation, checkout replay |
| Inventory and concurrency | Only one checkout reserves the last unit; cancellation releases reservations; stock audit and soft deletion preserve references |
| Maya | Lost checkout link recovery, signature/timestamp validation, payment event deduplication, reference/amount/currency checks, failed/expired payment rollback |
| Admin CRUD | Product, category and coupon changes |
| AI | Catalog-grounded Bag Finder and timeout fallback; Shopping Assistant references and bounded history; verified-sales Inventory Advisor and no stock mutation; Visual Bag Search image validation and in-stock matches |
| Notifications and activity | Own-recipient isolation, unread/single/all read actions, order and stock alerts, duplicate prevention, unauthorized activity rejection, filtered histories, dashboard values and idempotent schema startup |

## 5. Manual UI acceptance checks

Run the following on a disposable environment. Use separate customer/admin sessions when testing access and notifications.

| Area | Steps | Expected behavior |
| --- | --- | --- |
| Storefront and category input | Browse products, filter by laptop/budget, add an eligible monogram; create category with slug `test-bag` | Real data, correct fees and readable messages; uppercase/spaced slugs rejected |
| Maya success | Create a checkout and use an official [Sandbox success card](https://developers.maya.ph/reference/testing-and-validating-your-maya-checkout-integration) | Order becomes Paid after backend verification; customer/admin receive payment updates; sale is reflected once |
| Maya failure | Use a Sandbox decline test case; return and verify, then restore cart | No fake Paid status; eligible retryable order can return items to bag |
| Bag Finder | Ask for a 16-inch laptop under ₱2,000 and open results | Actual eligible product links; distinguish AI picks from catalog matches |
| Shopping Assistant | Ask a question, then a follow-up | Context-aware answer or safe fallback; truthful product links |
| Visual Bag Search | Select a supported photo; search, replace/remove; try invalid type or oversized image | Preview, validated matches or recoverable unavailable error; invalid photo rejected |
| Inventory Advisor | Analyze as admin, check quantities and explanatory labels, refresh report | Recent paid sales and available stock; rules fallback works; no automatic stock change |
| Dashboard | Compare cards with the selected test database and latest orders | Gross sales/paid/pending counts, low-stock watchlist and latest activity; no placeholder metrics |
| Notifications | Change an eligible visible product from 5+ to ≤4 and advance a demo order; open separate inboxes | Admin receives inventory/store alerts; customer sees only own order; read and mark-all update badge |
| Activity logs | Edit demo product/category/coupon, adjust stock, change order status, filter entries | Actual committed actions with actor, reference and time; customer cannot access |
| PWA offline | Visit catalog/cart online, simulate offline, reconnect | Cached public catalog; offline banner; protected actions and checkout need internet |
| Responsive UI | Check mobile, tablet and desktop widths | Clear navigation, cards, recommendations and notification rows; no horizontal overflow |

## 6. Latest recorded verification

These results refer to the latest merged application source, GitHub main revision `9e3de18` (PR #9), tested November 27, 2026 on a disposable PostgreSQL 17.12 database with simulated provider responses.

| Check | Result |
| --- | --- |
| Frontend production build | Passed; manifest and service worker generated |
| Backend integration tests | 18 passed, 0 failed, 0 skipped |
| Complete Postman collection | 53 requests, 0 failed |
| Postman assertions | 118 passed, 0 failed |
| API reference | OpenAPI parsed; 41 operations |
| Admin/customer browser checks | Dashboard, activity, private notification inbox, unread count, read actions, role protection and customer order link passed |
| Responsive browser checks | Dashboard, activity log and both inboxes passed at 360, 390, 412, 800, 1050, 1100, 1260, 1440 and 1920 CSS-pixel widths |
| Source archives | Submission and private backup ZIPs passed integrity and source-content verification |

Earlier local runs also verified core catalog/offline PWA, Shopping Assistant, Bag Finder, Visual Bag Search and Inventory Advisor. Historical progression:

| Run | Requests | Assertions | Integration tests |
| --- | --- | --- | --- |
| Original recorded baseline | 40 | 84 | 14 |
| Shopping Assistant + Inventory Advisor | 44 | 94 | 16 |
| Visual Bag Search | 46 | 99 | 17 |
| Dashboard + notifications + activity (PR #9) | 53 | 118 | 18 |

## 7. Live deployment checkpoints

Local controlled-provider results do **not** certify production keys or external availability. Before the finals presentation:

- [ ] Verify deployed frontend and API health, Swagger, account access and admin dashboard.
- [ ] Obtain `aiAssisted: true` for live Gemini demonstrations; record fallback separately.
- [ ] Complete a live Maya **Sandbox** test order and confirm the verified Paid status. Separately verify delivery and processing of an authentic sandbox webhook event.
- [ ] Check notifications and activity on that demo transaction. Do not expose customer data or provider tokens.
- [ ] Confirm PWA installability in Chrome and all four required viewports (360×800, 390×844, 412×915, 800×600).
- [ ] Capture fresh mobile Lighthouse scores from the deployed homepage. The recorded targets are Performance ≥75, Accessibility ≥85, Best Practices ≥85 and SEO ≥80. Previous local homepage scores (94/100/100/100) were obtained before the latest changes and are not fresh production measurements.

Log future results with the date, Git revision, environment, test case, expected result, observed result and pass/fail status. The recorded requirements are from the project handoff, not a replacement for the original instructor rubric.
