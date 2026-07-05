# Ledger backend

This is the server the mobile app talks to. It holds your Anthropic API key
(never shipped inside the app itself), extracts text from uploaded annual
report PDFs, calls Claude to produce the analysis, and generates the
downloadable PDF report.

## Run it locally

```bash
cd backend
npm install
cp .env.example .env
# open .env and paste in your real Anthropic API key
npm start
```

You should see:
```
Ledger backend running on http://localhost:3000
```

Check it's alive:
```bash
curl http://localhost:3000/api/health
```

## Connecting the mobile app to it

- **Testing on your phone via Expo Go**: your phone and laptop need to be on
  the same Wi-Fi. Find your laptop's LAN IP (Windows: `ipconfig`, look for
  IPv4 Address, something like `192.168.1.24`) and put
  `http://192.168.1.24:3000` into `mobile/src/api.js` as `API_BASE`.
  `localhost` will NOT work from a phone — it means "the phone itself."
- **Once deployed** (see below), use the public HTTPS URL there instead.

## Deploying it so the app works outside your Wi-Fi

Any Node-friendly host works. Two easy, cheap/free options:

**Render.com**
1. Push this `backend/` folder to a GitHub repo.
2. New → Web Service → connect the repo.
3. Build command: `npm install`, start command: `npm start`.
4. Add an environment variable `ANTHROPIC_API_KEY` with your real key.
5. Deploy — you'll get a URL like `https://ledger-backend.onrender.com`.

**Railway.app** — similar flow: connect repo, set `ANTHROPIC_API_KEY`, deploy.

Either way, once deployed, put that HTTPS URL into `mobile/src/api.js`.

## Endpoints

- `POST /api/analyze` — multipart form with a `report` PDF field, or JSON
  `{ "text": "..." }`. Returns `{ reportId, analysis, summary }`.
- `POST /api/chat` — JSON `{ reportId, question, history }`. Returns
  `{ answer }`.
- `GET /api/export-pdf?reportId=...` — streams back a generated PDF report.

## What's intentionally left out of this MVP

- **Auth & subscriptions** — there's no user login or payment gating yet.
  For real subscriptions sold *through* the iOS/Android apps, Apple and
  Google both require you to use their own in-app purchase systems (not
  Stripe directly) for unlocking digital features — the standard way people
  handle this is a service like **RevenueCat**, which wraps both platforms'
  billing behind one API. Worth wiring in before you charge real users.
- **Live news / live market data** — would need your own API keys for a
  news provider and a market-data provider (e.g. Zerodha Kite Connect,
  Upstox), added the same way `ANTHROPIC_API_KEY` is here.
- **Persistence** — analyzed reports live in server memory and are cleared
  after 6 hours or a server restart. Fine for testing; swap `reportStore.js`
  for a real database (Postgres, SQLite, etc.) before shipping.
- **Rate limiting / abuse protection** — add before making the URL public,
  since each analysis costs you real Claude API credits.
