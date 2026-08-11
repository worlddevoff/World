import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  if (chunks.length === 0) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return {}
  }
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-experiment-dev-secret, x-experiment-ingest-secret',
  )
  res.end(body == null ? '' : JSON.stringify(body))
}

/**
 * Serve /api/organism, /api/think, /api/market-event, /api/pump-bridge during `vite`
 * so the shared Neon brain works without `vercel dev`.
 */
export function experimentApiPlugin(): Plugin {
  return {
    name: 'experiment-api',
    configureServer(server) {
      // Start server-side PumpPortal ingest (key never reaches the browser).
      void server
        .ssrLoadModule('/src/server/pumpBridge.ts')
        .then((mod) => {
          mod.ensurePumpBridge()
        })
        .catch(() => {
          /* optional until env is present */
        })

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url.startsWith('/api/')) return next()

        if (req.method === 'OPTIONS') {
          sendJson(res, 204, null)
          return
        }

        try {
          const auth = await server.ssrLoadModule('/src/server/requestAuth.ts')

          if (url === '/api/organism') {
            if (req.method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' })
              return
            }
            const store = await server.ssrLoadModule('/src/server/organismStore.ts')
            if (!store.hasDatabase()) {
              sendJson(res, 503, {
                error: 'DATABASE_URL not configured',
                hint: 'Run: vercel env pull',
              })
              return
            }
            const snap = await store.loadOrganism()
            sendJson(res, 200, snap)
            return
          }

          if (url === '/api/pump-bridge') {
            if (req.method !== 'GET' && req.method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' })
              return
            }
            const bridge = await server.ssrLoadModule('/src/server/pumpBridge.ts')
            const q = new URL(req.url ?? '', 'http://local')
            if (q.searchParams.get('status') === '1') {
              sendJson(res, 200, bridge.getPumpBridgeStatus())
              return
            }
            sendJson(res, 200, bridge.ensurePumpBridge())
            return
          }

          if (url === '/api/think') {
            if (req.method !== 'GET' && req.method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' })
              return
            }
            const cronReject = auth.cronAuthRejection(req) as string | null
            if (cronReject) {
              sendJson(res, 401, { error: cronReject })
              return
            }

            const body =
              req.method === 'POST' ? ((await readBody(req)) as { force?: boolean }) : {}
            const wantsForce =
              body.force === true || (req.url ?? '').includes('force=1')
            const force = wantsForce && (auth.allowForceThink(req) as boolean)
            if (wantsForce && !force) {
              sendJson(res, 403, {
                error: 'force think requires ALLOW_FORCE_THINK=1 and authorization',
              })
              return
            }

            const store = await server.ssrLoadModule('/src/server/organismStore.ts')
            const thoughtAi = await server.ssrLoadModule('/src/server/thoughtAi.ts')

            if (!store.hasDatabase()) {
              sendJson(res, 503, { error: 'DATABASE_URL not configured' })
              return
            }

            const { state, version } = await store.loadOrganism()
            if (!thoughtAi.canThink(state)) {
              sendJson(res, 200, {
                skipped: true,
                reason: 'think_locked',
                state,
                version,
              })
              return
            }

            const cooldown = thoughtAi.thoughtCooldownRemaining(state) as number
            if (cooldown > 0 && !force) {
              sendJson(res, 200, {
                skipped: true,
                reason: 'cooldown',
                retryInMs: cooldown,
                state,
                version,
              })
              return
            }

            const text = await thoughtAi.generateAiThought(state)
            const saved = await store.applyEngineAction({ type: 'THINK', text })
            sendJson(res, 200, {
              skipped: false,
              thought: text,
              applied: true,
              ...saved,
            })
            return
          }

          if (url === '/api/market-event') {
            if (req.method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' })
              return
            }

            const store = await server.ssrLoadModule('/src/server/organismStore.ts')
            const engine = await server.ssrLoadModule('/src/engine/evolutionEngine.ts')
            const format = await server.ssrLoadModule('/src/utils/format.ts')
            const thoughtAi = await server.ssrLoadModule('/src/server/thoughtAi.ts')

            if (!store.hasDatabase()) {
              sendJson(res, 503, {
                error: 'DATABASE_URL not configured',
                hint: 'Run: vercel env pull',
              })
              return
            }

            const body = (await readBody(req)) as {
              action?: string
              kind?: 'buy' | 'sell'
              amount?: number
              wallet?: string
              signature?: string
              seed?: number
            }

            if (!body?.action) {
              sendJson(res, 400, { error: 'Missing action' })
              return
            }

            const isDevWallet = (wallet?: string) => {
              if (!wallet) return false
              const w = wallet.toUpperCase()
              return w.includes('DEV') || w.startsWith('DEV_')
            }

            if (body.action === 'market') {
              const amount = Math.max(1, Math.round(Number(body.amount) || 0))
              if (!amount || (body.kind !== 'buy' && body.kind !== 'sell')) {
                sendJson(res, 400, { error: 'Invalid kind/amount' })
                return
              }

              const signature =
                typeof body.signature === 'string' ? body.signature.trim() : ''
              const isSim = !signature || isDevWallet(body.wallet)

              if (isSim) {
                if (!auth.allowDevTools(req)) {
                  sendJson(res, 403, {
                    error: 'Simulated trades are disabled on the shared organism',
                  })
                  return
                }
              } else if (!auth.hasIngestSecret(req) && !auth.allowDevTools(req)) {
                sendJson(res, 403, {
                  error:
                    'Client market posts are disabled — trades are ingested server-side',
                })
                return
              }

              const event = engine.buildMarketEvent(
                body.kind,
                amount,
                body.wallet ? format.shortWallet(body.wallet) : undefined,
                body.wallet,
              )
              const result = await store.applyMarketEvent(event, signature || undefined)

              void (async () => {
                try {
                  const { state } = await store.loadOrganism()
                  if (!thoughtAi.canThink(state)) return
                  const cooldown = thoughtAi.thoughtCooldownRemaining(state) as number
                  const tier = event.tier as string
                  const urgent = tier === 'mega' || tier === 'large'
                  if (cooldown > 0 && !urgent) return
                  if (cooldown > 25_000 && urgent) return
                  const chance =
                    tier === 'mega'
                      ? 1
                      : tier === 'large'
                        ? 0.85
                        : tier === 'medium'
                          ? 0.55
                          : body.kind === 'sell'
                            ? 0.4
                            : 0.35
                  if (Math.random() > chance) return
                  const text = await thoughtAi.generateAiThought(state)
                  await store.applyEngineAction({ type: 'THINK', text })
                } catch {
                  /* non-fatal */
                }
              })()

              sendJson(res, 200, result)
              return
            }

            if (
              body.action === 'force_mutation' ||
              body.action === 'force_evolution' ||
              body.action === 'force_memory_loss' ||
              body.action === 'reset'
            ) {
              if (!auth.allowDevTools(req)) {
                sendJson(res, 403, {
                  error: 'Dev actions require EXPERIMENT_DEV_SECRET',
                })
                return
              }
            }

            if (body.action === 'force_mutation') {
              const result = await store.applyEngineAction({ type: 'FORCE_MUTATION' })
              sendJson(res, 200, { ...result, applied: true })
              return
            }
            if (body.action === 'force_evolution') {
              const result = await store.applyEngineAction({ type: 'FORCE_EVOLUTION' })
              sendJson(res, 200, { ...result, applied: true })
              return
            }
            if (body.action === 'force_memory_loss') {
              const result = await store.applyEngineAction({
                type: 'FORCE_MEMORY_LOSS',
              })
              sendJson(res, 200, { ...result, applied: true })
              return
            }
            if (body.action === 'reset') {
              const seed =
                body.seed ?? Math.floor(Math.random() * 2_000_000_000)
              const result = await store.applyEngineAction({ type: 'RESET', seed })
              sendJson(res, 200, { ...result, applied: true })
              return
            }

            sendJson(res, 400, { error: 'Unknown action' })
            return
          }

          sendJson(res, 404, { error: 'Not found' })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'API failed'
          sendJson(res, 500, { error: message })
        }
      })
    },
  }
}
