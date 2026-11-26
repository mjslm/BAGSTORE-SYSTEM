# Carry & Co. integration notes

## Gemini Bag Finder

**Endpoint:** `POST /api/v1/ai/discover`.

The backend selects in-stock bags from PostgreSQL and filters them using the budget and laptop size it recognizes in the shopper's prompt. Gemini ranks candidate IDs. The backend checks those IDs against the candidate list and reads current product details from PostgreSQL before replying.

If Gemini times out or returns an unusable response, Bag Finder can show up to four matching catalog products with `aiAssisted: false`. If the Gemini key is missing, the API returns `503 AI_UNAVAILABLE`. The storefront uses `aiAssisted` to label the results **AI-Assisted picks** or **Catalog matches**.

**Where to look:** [Discovery service](../backend/src/services/discovery.js) and [Bag Finder page](../frontend/src/pages/Discovery.jsx).

## Gemini Shopping Assistant

**Endpoint:** `POST /api/v1/ai/assistant`. The customer sends a question and up to six recent conversation messages. Express retrieves relevant public catalog records and store facts, asks Gemini for an answer and product IDs, and verifies the IDs and product details before sending the response. If Gemini is unavailable, the storefront links to the catalog.

**Where to look:** [Shopping service](../backend/src/services/shopping.js), [shared Gemini client](../backend/src/services/gemini.js), and [Shopping Assistant page](../frontend/src/pages/ShoppingAssistant.jsx).

## Gemini Visual Bag Search

**Endpoint:** `POST /api/v1/ai/visual-search`. The browser prepares a resized JPEG from the selected photo. Express validates the image type and size, sends the image and available catalog descriptions to Gemini, then rechecks selected IDs against PostgreSQL. Results describe similarity in style, color, and design. The app does not store uploaded photos. Photo analysis allows a longer first request and one bounded retry for temporary Gemini failures. If the provider is still unavailable, the shopper can retry with the selected photo, use Bag Finder, or browse the catalog.

**Where to look:** [Visual Search page](../frontend/src/pages/VisualSearch.jsx), [photo preparation](../frontend/src/utils/prepareBagPhoto.js), and [Visual Search service](../backend/src/services/visualSearch.js).

## Gemini Inventory Advisor

**Endpoint:** `POST /api/v1/admin/ai/inventory`. The server requires an authenticated admin. PostgreSQL aggregates verified payments from the past 30 days and their order quantities by product. Express calculates the target stock using 14 days of recent sales, with a five-unit minimum for products that have sold. It subtracts available stock from the target and suggests reviewing low stock without recent sales. Gemini explains and prioritizes the calculated recommendations using product-level totals. The report is read-only and has an inventory-rules fallback.

**Where to look:** [Inventory query](../backend/src/repositories/inventory.js), [Inventory Advisor service](../backend/src/services/inventoryAdvisor.js), and [Inventory Advisor page](../frontend/src/pages/admin/InventoryAdvisor.jsx).

## Maya Sandbox checkout

| Endpoint | Role in checkout |
| --- | --- |
| `POST /api/v1/checkout` | Prices the order on the server and opens a Maya Sandbox checkout. Resending the same request with the same `Idempotency-Key` returns the existing order. |
| `POST /api/v1/webhooks/maya` | Receives the payment event, checks its signature and timestamp, and queues it for processing. |
| `POST /api/v1/orders/:id/verify` | Checks the current payment state with Maya when the order is still awaiting confirmation. |

The checkout service retrieves payment details from Maya and compares the reference, amount, and currency with the stored order before marking it **Paid**. The return page displays the backend's confirmed status. A repeated payment event does not create a second paid transition.

**Where to look:** [Maya adapter](../backend/src/patterns/maya.js), [webhook route](../backend/src/app.js), [checkout service](../backend/src/services/orders.js), and [order status page](../frontend/src/pages/Order.jsx).

Use the [demo checklist](demo-checklist.md) for the live walkthrough and the [test plan](test-plan.md) for the matching Postman and integration test cases.
