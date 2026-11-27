# Carry & Co. — Finals demonstration checklist

**Project:** ITPE101 Backend Integration and ITE101 Mobile Application Development
**Updated:** November 27, 2026 — features through PR #9

Use this checklist as a presentation guide. [Integration notes](integration-notes.md) explain the implementation; the [test plan](test-plan.md) contains the expected API responses and verification results. The original instructor documents remain the authority for the submission rubric.

## 1. Prepare before the defense

- [ ] Use Node.js 22.12 or newer. Extract the project and open its root folder (the folder containing `backend` and `frontend`) in VS Code.
- [ ] Check that `backend/.env` exists locally and contains the private configuration for Supabase, JWT, Maya Sandbox and Gemini. Use the private backup, not the submission archive, to recover existing values. Do not show the file on-screen or include it in the submission.
- [ ] Open a separate integrated terminal in each folder. Run `npm.cmd ci` once if dependencies are not installed, then `npm.cmd run dev` in both terminals. Leave both terminals running. If you are already inside the folder, do not run `cd backend` or `cd frontend` again.
- [ ] Wait for **Carry & Co. API listening on port 4000** and Vite's local URL. Confirm the health endpoint returns `200 OK` and `data.status: "ok"`.
- [ ] Sign in using demo customer and admin accounts in separate browser profiles or an incognito window. Use a disposable seeded database for any demonstration that creates accounts, orders, coupons or stock changes.
- [ ] Prepare a clear bag photo (JPG, PNG or WebP, up to 10 MB) for Visual Bag Search. Use a product photo without personal information.
- [ ] Keep the live deployment, a local backup and a redacted screen recording ready.

| Screen | Local | Deployed |
| --- | --- | --- |
| Storefront | [localhost:5173](http://localhost:5173/) | [Vercel storefront](https://carry-and-co.vercel.app/) |
| API health | [localhost:4000/api/v1/health](http://localhost:4000/api/v1/health) | [Render health](https://carry-and-co-api.onrender.com/api/v1/health) |
| Swagger UI | [localhost:4000/api-docs](http://localhost:4000/api-docs) | [Render Swagger](https://carry-and-co-api.onrender.com/api-docs) |
| Postman `baseUrl` | `http://localhost:4000/api/v1` | `https://carry-and-co-api.onrender.com/api/v1` |

See the [README](../README.md#run-in-vs-code) for initial setup and deployment instructions.

## 2. Present the core store first

| Step | What to demonstrate | What to explain |
| --- | --- | --- |
| 1 | Home, Shop, product details and the responsive C&C interface | React components, navigation and real catalog data from PostgreSQL. |
| 2 | Filter for a 16-inch laptop, open Desk to Dinner Tote | Laptop compatibility and budget filtering are bag-specific business features. |
| 3 | Add eligible monogram initials such as `ABC` to a bag | Personalization is validated on the server; its fee is included in the cart price. |
| 4 | Show cart and checkout quote; try `CARRY10`, `PACK100`, then `OLDDEAL` on a suitable demo cart | Percentage and fixed coupons, expired-coupon rejection, server-calculated totals and ₱120 shipping. Use a clean test cart and observe eligibility. |
| 5 | Sign in as a customer, then show Admin access in a separate admin session | JWT authentication and role-based authorization are enforced by Express, not just hidden UI controls. |

**Defense emphasis:** laptop-fit compatibility and monogram personalization are the two original business-specific features. The additional AI and admin features enhance them rather than replace them.

## 3. Demonstrate Maya Sandbox and order tracking

- [ ] Start checkout using a demo customer and confirm the total. The API creates an order awaiting payment, reserves available inventory and redirects to Maya Sandbox.
- [ ] Use an official **success test card** from [Maya's sandbox testing guide](https://developers.maya.ph/reference/testing-and-validating-your-maya-checkout-integration). Never use a real card or show personal payment details.
- [ ] Return to Carry & Co. The order should display the server-confirmed status. If it is still awaiting payment, click **Check payment status**. A confirmed payment appears as **Paid**.
- [ ] Show the customer's order history and notification inbox. In the admin session, show the paid order and advance it through **Processing → Shipped → Delivered** as appropriate for the demo.
- [ ] Explain that the server verifies Maya's payment reference, amount, currency and status. The redirect alone does not prove payment. Reusing the same checkout idempotency key does not create a duplicate order.
- [ ] Optional failure case: use an official decline test card. Confirm the failed/expired/cancelled order state, then choose **Put items back in bag** to retry; never mark a failed payment as paid manually.
- [ ] For the deployed webhook demonstration, check the actual processed Maya Sandbox event separately. A successful browser return alone is not proof that the webhook was delivered.

## 4. Demonstrate the four Gemini AI functions

| Tool | Demonstration | Explain |
| --- | --- | --- |
| Bag Finder | Ask “A bag for my 16-inch laptop under ₱2,000.” | Gemini ranks real, in-stock catalog candidates; budget/laptop constraints and catalog IDs are checked by the API. |
| Shopping Assistant | Ask which bags fit a 16-inch laptop, followed by a question about monograms or shipping | Uses public catalog facts and recent conversation context; related product links resolve to real products. |
| Visual Bag Search | Upload the prepared bag photo and select Find similar bags | The browser resizes the image, Gemini identifies visible bag features, and the backend validates catalog matches. Uploaded images are not persisted by the app. |
| Inventory Advisor (admin) | Open **Admin → Inventory Advisor → Analyze inventory**. Show metric cards, recommendation table and inventory criteria | The server calculates reorder recommendations from current available stock and the past 30 days of verified sales. Gemini provides explanatory advice; only the admin can manually change stock. |

- [ ] Distinguish a real AI-assisted response (`aiAssisted: true`) from the catalog or rules fallback. If Gemini is unavailable, demonstrate the safe fallback or retry rather than claiming an AI response succeeded.

## 5. Demonstrate the professional admin workspace

- [ ] **Dashboard:** show gross sales, paid orders, awaiting payment, low stock, the five latest orders, inventory watchlist and recent activity. These values come from the API; recent lists are summaries, not the entire history.
- [ ] **Products, Categories, Coupons:** create or edit a demo record, then confirm the resulting change. A category/product URL slug must use lowercase letters, digits and single hyphens between words (for example, `test-bag`).
- [ ] **Low-stock alert:** on the disposable database, change an active, visible bag's available stock from at least 5 to 4 or fewer. The admin inbox receives a notification; reaching zero can generate a separate out-of-stock alert.
- [ ] **Notifications:** show the bell, unread count, inbox, unread filter, individual **Mark read**, and **Mark all as read**. Customers see only their own order/payment updates. Admins receive store order/payment and inventory alerts. The badge refreshes on navigation or about every 30 seconds while the signed-in tab is visible.
- [ ] **Activity logs:** filter by Orders, Inventory, Products, Categories or Coupons. Explain event, reference, actor and timestamp. The feed includes existing order/stock histories and product/category/coupon changes recorded from this release onward.
- [ ] Explain the difference: notifications inform the recipient; activity logs provide an admin-only operational history; Inventory Advisor recommends action but never automatically restocks.

## 6. Demonstrate backend architecture and API evidence

- [ ] Open Swagger `GET /products`, set `laptop=16` and `limit=5`, and explain query parameters, response schema and real catalog records.
- [ ] Import the Postman collection and example environment. Select the matching base URL and run **System › API health**, **Catalog › Filter by laptop fit and budget**, and **Admin › Reject customer access** after customer sign-in.
- [ ] Show an expected rejection: `401` for missing authentication, `403` for customer access to admin resources, or `422` for expired coupons/invalid input. Run state-changing requests only on a disposable test database.
- [ ] Trace a request through [routes](../backend/src/routes/api.js), [controllers](../backend/src/controllers/api.js), [services](../backend/src/services/), and [repositories](../backend/src/repositories/).
- [ ] Show [discount patterns](../backend/src/patterns/discounts.js): a factory chooses fixed/percentage strategies implementing the same operations. [CheckoutService](../backend/src/services/orders.js) composes database, payment and pricing dependencies.
- [ ] Show the [test plan](test-plan.md#latest-recorded-verification) results: 18 integration tests and 53 Postman requests / 118 assertions passed against a disposable database with controlled provider responses.

## 7. Demonstrate the mobile PWA

- [ ] In Chrome DevTools, check the recorded required viewports: 360×800, 390×844, 412×915 and 800×600.
- [ ] Install the deployed PWA in Chrome and open its standalone window with the C&C icon.
- [ ] Visit the catalog and cart while online, then simulate offline mode. Show the cached catalog, offline indicator and the limitation on checkout/account operations. Restore the network.
- [ ] Run mobile Lighthouse on the current deployed homepage and record scores. Recorded targets: Performance ≥75, Accessibility ≥85, Best Practices ≥85, SEO ≥80. Do not present old local scores as fresh deployment measurements.

## 8. Quick troubleshooting

| Symptom | First check |
| --- | --- |
| PowerShell cannot find `frontend/frontend` | You are already in the frontend folder. Open the appropriate folder's integrated terminal instead. |
| Vite reports `ECONNREFUSED` for `/api/v1/...` | Start the backend on port 4000 and confirm the health endpoint. |
| Backend says `.env not found` or missing `JWT_SECRET` | Copy the existing `backend/.env` from the private backup; `Test-Path .env` in the backend terminal should return True. Do not regenerate credentials unnecessarily. |
| Maya displays Payment failed | Return to the merchant, verify the order status, restore the cart if eligible and retry with an official Sandbox success card. |
| Gemini gives fallback or unavailable message | Check internet and provider configuration privately. A catalog/rules fallback is not a successful Gemini response. |

## 9. Submission check

- [ ] Follow the exact instructor filename and rubric. Include backend, frontend, source assets, schema, both lockfiles, both `.env.example` files, Postman collection/environment and these docs.
- [ ] Exclude private `.env` files, keys, passwords, `node_modules`, builds, local database dumps and personal data.
- [ ] Verify the final source archive opens and keep the private backup separately.
