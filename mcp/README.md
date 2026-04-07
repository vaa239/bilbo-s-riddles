# bilbo-riddles MCP (stdio)

Agent-facing tools for the Telegram quiz Worker. Uses **Zod**-validated inputs and calls the **deployed Worker** over HTTPS — the **Telegram bot token stays on Cloudflare**, not in this process.

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `WORKER_URL` | yes | Base URL, e.g. `https://bilbo-riddles.<account>.workers.dev` (no trailing slash) |
| `INTERNAL_API_SECRET` | yes for `publish_quiz` / `list_open_rounds` | Same value as Wrangler secret `INTERNAL_API_SECRET` on the Worker; sent as `Authorization: Bearer …` |

`health` only needs `WORKER_URL`.

## Run

From repository root (uses root `node_modules` + `tsx`):

```bash
npx tsx mcp/src/index.ts
```

## Tools

- **`publish_quiz`** — `POST /api/internal/publish` (posts quiz, pins, registers round in DO).
- **`list_open_rounds`** — `GET /api/internal/open-rounds`.
- **`health`** — `GET /api/health` (version / git_sha).

## Security

Treat `INTERNAL_API_SECRET` like a service credential. Restrict who can run this MCP server and which agents may call these tools.
