# Masters

A live **all-chain crypto trench desk** with a Robinhood Wallet / Robinhood Chain speciality. Six trading agents read public tape (GeckoTerminal, DexScreener, GoPlus) and return skip / lottery / watch / small-size — not “will profit” calls.

Nothing in Robinhood Wallet is a reliable profit play. New launches are lottery tickets. This terminal exists so you can see heat, liquidity, clones, and contract risk in one place before you size anything.

## What it does

- **Daily** — four buckets: chain heat, sub-48h launches, volume leaders, stickier names (PONS, CASHCAT, AI, tokenized NVDA/SPY/SPCX).
- **Scan** — new pools + trending on Robinhood, Solana, Base, Ethereum, BNB, Arbitrum, Hyperliquid, Plasma, Monad, Sui, TON. Filters for age, liquidity, boosted ads, and quote asset.
- **Agents** — Scout, Tape, Depth, Risk, Narrative, Desk chief. Optional LLM tape note via [FreeLLMAPI](https://freellmapi.co/) or a public fallback.
- **60s check** — paste the exact contract. Clone tickers, honeypot/tax/mint/blacklist (GoPlus, including chain `4663`), holder concentration, liquidity vs a $1k clip, paid trending.
- **All chains** — the same desk on every venue that actually prints.
- **Cockpit** — the tight setup: DexScreener, GMGN, Birdeye, Pons, Gecko/RobinSwap, Uniswap/Wallet, Blockscout 4663, X.
- **Journal** — three lines a night (pumped / held volume / died) plus a sticky-name watchlist. Stored in the browser.

Masters does **not** place orders, run sniper bots, or read your Robinhood login.

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
```

Without a key, the rules desk still runs. Briefings fall back to a public text endpoint, then to deterministic copy.

## Daily workflow this encodes

1. Chain heat and volume leaders first — not the +100,000% 16-hour ticker.
2. Scan New Pairs with liquidity ≥ $30–50k, unique makers, WETH/USDG quotes.
3. Paste the **same** contract into Wallet, Blockscout, GMGN. Spam / Warning / Suspicious = default no.
4. Execute in Robinhood Wallet or Uniswap V3/V4. Slippage only as high as needed. Take partials.
5. Journal three lines at night.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. Live data from GeckoTerminal, DexScreener, CoinGecko, and GoPlus. No database.

Not financial advice. Only money you can lose completely. Verify every contract yourself.
