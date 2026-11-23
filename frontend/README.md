# Carry & Co. PWA

Use Node.js 22.12 or later. Start the API using the root README, then run these commands from `frontend/`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:5173. The local Vite server proxies the default `/api/v1` to port 4000. To test the service worker, build with `npm.cmd run build`, run `npm.cmd run preview` and open http://localhost:4173. Visit the catalog and a product online before switching offline.

Deploy this directory to Vercel with the Vite preset and set `VITE_API_BASE_URL` to the public HTTPS API URL followed by `/api/v1`. Set the backend `FRONTEND_URL` to the Vercel HTTPS origin. The production build includes SPA rewrites for product and payment return routes.

Local browser verification uses 360 × 800, 390 × 844, 412 × 915, and 800 × 600. Record the Chrome Lighthouse mobile results against the deployed HTTPS URL.
