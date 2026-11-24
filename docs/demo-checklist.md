# Carry & Co. demo checklist

Keep this page open during the defense. Use the [test plan](test-plan.md) for expected results and the [integration notes](integration-notes.md) when showing the code.

## Open before presenting

| Screen | Local | Deployed |
| --- | --- | --- |
| Storefront | [localhost:5173](http://localhost:5173/) | [Vercel storefront](https://carry-and-co.vercel.app/) |
| Swagger UI | [localhost:4000/api-docs](http://localhost:4000/api-docs) | [Render Swagger](https://carry-and-co-api.onrender.com/api-docs) |
| Postman `baseUrl` | `http://localhost:4000/api/v1` | `https://carry-and-co-api.onrender.com/api/v1` |

## Presentation order

- [ ] **Show the storefront.** Browse the catalog, open a bag, and show the laptop-fit details or monogram option on an eligible bag.
- [ ] **Show the API in Swagger.** Open `GET /products` and point out the query parameters and response schema.
- [ ] **Send a request in Postman.** Select the Local or Render environment and open **System › API health**. Show `200 OK` and `data.status: "ok"`. In **Catalog › Filter by laptop fit and budget**, point out how `{{baseUrl}}` selects the API. The [Express routes](../backend/src/routes/api.js) show what handles each request.
- [ ] **Show an expected rejection.** On your test API, sign in as a customer in Postman, then send **Admin › Reject customer access**. Explain that `403 Forbidden` is the expected result. The [test plan](test-plan.md#run-the-postman-collection) explains how to run the full collection with a disposable database.
- [ ] **Show Bag Finder.** Ask “A bag for my 16-inch laptop under ₱2,000.” Check that the results fit the request and explain the difference between the **AI-Assisted picks** and **Catalog matches** labels.
- [ ] **Show Maya Sandbox checkout.** Use a demo account and a sandbox test card. Return to Carry & Co. and show the order status. If the order is pending, click **Check payment status**. A confirmed payment appears as **Paid**.
