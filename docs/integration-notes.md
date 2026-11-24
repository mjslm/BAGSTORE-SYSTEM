# Carry & Co. integration notes

## Gemini Bag Finder

**Endpoint:** `POST /api/v1/ai/discover`.

The backend selects in-stock bags from PostgreSQL and filters them using the budget and laptop size it recognizes in the shopper's prompt. Gemini ranks candidate IDs. The backend checks those IDs against the candidate list and reads current product details from PostgreSQL before replying.

If Gemini times out or returns an unusable response, Bag Finder can show up to four matching catalog products with `aiAssisted: false`. If the Gemini key is missing, the API returns `503 AI_UNAVAILABLE`. The storefront uses `aiAssisted` to label the results **AI-Assisted picks** or **Catalog matches**.

**Where to look:** [Discovery service](../backend/src/services/discovery.js) and [Bag Finder page](../frontend/src/pages/Discovery.jsx).

## Maya Sandbox checkout

| Endpoint | Role in checkout |
| --- | --- |
| `POST /api/v1/checkout` | Prices the order on the server and opens a Maya Sandbox checkout. Resending the same request with the same `Idempotency-Key` returns the existing order. |
| `POST /api/v1/webhooks/maya` | Receives the payment event, checks its signature and timestamp, and queues it for processing. |
| `POST /api/v1/orders/:id/verify` | Checks the current payment state with Maya when the order is still awaiting confirmation. |

The checkout service retrieves payment details from Maya and compares the reference, amount, and currency with the stored order before marking it **Paid**. The return page displays the backend's confirmed status. A repeated payment event does not create a second paid transition.

**Where to look:** [Maya adapter](../backend/src/patterns/maya.js), [webhook route](../backend/src/app.js), [checkout service](../backend/src/services/orders.js), and [order status page](../frontend/src/pages/Order.jsx).

Use the [demo checklist](demo-checklist.md) for the live walkthrough and the [test plan](test-plan.md) for the matching Postman and integration test cases.
