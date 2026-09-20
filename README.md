# Masters

A live **all-chain crypto trench desk** plus an automated **live trader** on a Robinhood Agentic brokerage book. Six tape agents read public markets (GeckoTerminal, DexScreener, GoPlus) and return skip / lottery / watch / small-size — not “will profit” calls. The live agent clips BTC / ETH / SOL (and SPY / NVDA in the cash session) in $10 clips with a public kill switch.

Nothing in Robinhood Wallet is a reliable profit play. New launches are lottery tickets. Tokenized NVDA/SPY on Robinhood Chain are not share ownership. This terminal exists so you can see heat, liquidity, clones, and contract risk — and so a gated agent can take small, named clips instead of sniping Pons.

## What it does

- **Live** — automated desk on Robinhood Agentic ••••5205. Universe: BTC, ETH, SOL 24/7; SPY, NVDA only in regular cash hours. $10 clip, one open name, −8% stop, $30/day, 20-minute cooldown. Public **Kill new clips**. Never maps PONS, CASHCAT, or sub-48h launches onto the brokerage account.
- **Daily** — four buckets: chain heat, sub-48h launches, volume leaders, stickier names (PONS, CASHCAT, AI, tokenized NVDA/SPY/SPCX).
- **Scan** — new pools + trending on Robinhood, Solana, Base, Ethereum, BNB, Arbitrum, Hyperliquid, Plasma, Monad, Sui, TON. Filters for age, liquidity, boosted ads, and quote asset.
- **Agents** — Scout, Tape, Depth, Risk, Narrative, Desk chief. Optional LLM tape note via [FreeLLMAPI](https://freellmapi.co/) or a public fallback.
- **60s check** — paste the exact contract. Clone tickers, honeypot/tax/mint/blacklist (GoPlus, including chain `4663`), holder concentration, liquidity vs a $1k clip, paid trending.
- **All chains** — the same desk on every venue that actually prints.
- **Cockpit** — the tight setup: DexScreener, GMGN, Birdeye, Pons, Gecko/RobinSwap, Uniswap/Wallet, Blockscout 4663, X.
- **Journal** — three lines a night (pumped / held volume / died) plus a sticky-name watchlist. Stored in the browser.

The Cloudflare Worker computes intent, stores the book in KV, and accepts fills. It cannot call Robinhood. Live orders are placed by the Cursor Robinhood trading connection against the Agentic account only — never the default margin or IRA books.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43221](http://localhost:43221). The dev server binds `0.0.0.0:43221` so LAN / preview proxies can reach it.

Optional LLM (OpenAI-compatible, including a self-hosted FreeLLMAPI router):

```bash
cp .env.example .env.local
# FREELLM_BASE_URL=http://localhost:3001/v1
# FREELLM_API_KEY=freellmapi-...
# FREELLM_MODEL=auto
# LIVE_KEY=long-random-secret
```

Without an LLM key, the rules desk still runs. Briefings fall back to a public text endpoint, then to deterministic copy.

Live trader (local memory store unless you bind KV):

```bash
# LIVE_KEY in .env.local — required to arm, seed the book, or record a fill.
# Kill is unauthenticated on purpose.
curl -X POST http://127.0.0.1:43221/api/live \
  -H 'content-type: application/json' \
  -H "x-live-key: $LIVE_KEY" \
  -d '{"action":"arm"}'
```

## Daily workflow this encodes

1. Chain heat and volume leaders first — not the +100,000% 16-hour ticker.
2. Scan New Pairs with liquidity ≥ $30–50k, unique makers, WETH/USDG quotes.
3. Paste the **same** contract into Wallet, Blockscout, GMGN. Spam / Warning / Suspicious = default no.
4. Execute in Robinhood Wallet or Uniswap V3/V4. Slippage only as high as needed. Take partials.
5. Journal three lines at night.

## Deploy to Cloudflare

Production Worker: `masters`  
Custom domain: [https://masters.epictechai.app](https://masters.epictechai.app)  
Workers.dev: [https://masters.spyke6009.workers.dev](https://masters.spyke6009.workers.dev)

This is an OpenNext Cloudflare Worker (`@opennextjs/cloudflare`), same path as the other Epic Tech AI Next.js desks. Wrangler attaches the custom domain on deploy — `epictechai.app` must stay on the same Cloudflare account.

```bash
npx wrangler login
npm run deploy
npx wrangler secret put LIVE_KEY
```

`npm run preview` builds the Worker and serves it locally. Optional LLM keys (`FREELLM_*`) and the live trader key (`LIVE_KEY`) are `wrangler secret put` values. `LIVE_KEY` is required to arm the desk or write fills; anyone can POST `{ "action": "kill" }` to halt new clips.

GitHub Actions deploys `main` when `CLOUDFLARE_API_TOKEN` (and optionally `CLOUDFLARE_ACCOUNT_ID`) are set as repository secrets.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui, OpenNext on Cloudflare Workers. Live data from GeckoTerminal, DexScreener, CoinGecko, and GoPlus. Live book in Cloudflare KV (`LIVE`).

Not financial advice. Only money you can lose completely. Verify every contract yourself.
