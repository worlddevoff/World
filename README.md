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

| Variable | Where to set |
|---|---|
| `VITE_TOKEN_MINT` | Local `.env` or Vercel → Environment Variables |
| `VITE_PUMPPORTAL_API_KEY` | Local `.env` or Vercel only |
| `VITE_SOL_USD` | Optional (default `150`) |

- `.env` is gitignored. Only `.env.example` (empty placeholders) is tracked.
- On Vercel, set Production env vars in the dashboard, then redeploy.
- Do not paste keys into the repo, PRs, or client-visible copy.

## Live Pump.fun trades

Set the mint + PumpPortal key in env (above). The app connects to [PumpPortal](https://pumpportal.fun/), subscribes with `subscribeTokenTrade`, and maps each buy/sell into the world engine. Dev tools: `?dev=1`.

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
