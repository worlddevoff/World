# WORLD

A living isometric civilization that grows and breaks with market activity.

Built from the [Magic Patterns design](https://www.magicpatterns.com/c/wseotxwvhgpvgdrunuqncr) as a Vite + React + TypeScript + Tailwind app.

## Run

```bash
npm install
cp .env.example .env   # fill locally — never commit .env
npm run dev
```

## Secrets / env

**Never commit API keys or put them in source files.**  
**Never prefix secrets with `VITE_`** — Vite inlines those into the public JS bundle.

| Variable | Where to set |
|---|---|
| `VITE_TOKEN_MINT` | Public CA — local `.env` or Vercel |
| `PUMPPORTAL_API_KEY` | **Server-only** — Vercel / local `.env` (not `VITE_`) |
| `EXPERIMENT_DEV_SECRET` | Server-only — gates sim / force_* tools |
| `CRON_SECRET` | Server-only — required for Vercel Cron → `/api/think` |
| `VITE_SOL_USD` | Optional public fallback (default `150`) |

- `.env` is gitignored. Only `.env.example` (empty placeholders) is tracked.
- On Vercel, set Production env vars in the dashboard, then redeploy.
- Do not paste keys into the repo, PRs, or client-visible copy.

## Live Pump.fun trades

Set `VITE_TOKEN_MINT` + server-only `PUMPPORTAL_API_KEY`. The **server** connects to [PumpPortal](https://pumpportal.fun/) (`/api/pump-bridge`), subscribes with `subscribeTokenTrade`, and writes buys/sells into Neon. Browsers never see the API key — they poll the shared organism and DexScreener for price.

## Earth map & milestones

The buildable world is an **Earth-shaped land mask**. Civilization starts in Europe and grows across contiguous continents.

| Milestone | Metric |
|---|---|
| Village | $10k buy volume |
| City | 50 unique buyers |
| Metropolis | $250k buy volume |
| Space Age | $1M market cap |
| Civilization | $10M market cap |

## Stack

- React 19 + Vite
- Tailwind CSS v4
- Framer Motion
- Lucide icons
- PumpPortal WebSocket (realtime buys/sells)
