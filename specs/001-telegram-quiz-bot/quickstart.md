# Quickstart: Telegram quiz bot (Cloudflare Workers)

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/) + [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) logged in (`wrangler login`)
- Telegram **bot token** from [@BotFather](https://t.me/BotFather)
- One **supergroup** for play; optional second for **test**
- Bot is member of those groups with **send**, **pin**, **read messages**, and **reactions** (where supported)

## One-time: create Worker + Durable Object

After the repo contains `wrangler.toml` and implementation:

```bash
npm install
npx wrangler deploy
```

Note the deployed URL, e.g. `https://bilbo-riddles.<subdomain>.workers.dev`.

## Secrets and vars (Wrangler)

Set sensitive values as **secrets** (not committed):

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET   # random string; also passed to setWebhook
npx wrangler secret put INTERNAL_API_SECRET   # shared with MCP: Bearer for /api/internal/*
```

Non-secret configuration can live in `wrangler.toml` `[vars]` or use `wrangler secret` for simplicity:

| Name | Purpose |
|------|---------|
| `PLAY_CHAT_ID` | Supergroup id (see `src/lib/config.ts`) |
| `TEST_CHAT_ID` | Optional test supergroup |
| `OPERATOR_USER_IDS` | Comma-separated Telegram user ids |
| `SUCCESS_REACTION_EMOJI` | Optional, default `🎉` |
| `INTERNAL_API_SECRET` | **Secret** — if unset, `/api/internal/*` returns 503; MCP tools need the same value locally |

Optional CI/deploy vars: `APP_VERSION`, `GIT_SHA` (see `deploy.yml`).

## Register Telegram webhook

After first deploy, call Bot API (replace placeholders):

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://bilbo-riddles.<subdomain>.workers.dev/webhook" \
  -d "secret_token=<same as WEBHOOK_SECRET>"
```

Optional: `drop_pending_updates=true` on first cutover.

Verify:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

## Operator flow

1. Open **private chat** with the bot.
2. `/newquiz` (or equivalent implemented command).
3. Choose **play** or **test** (if test chat configured).
4. Send question, then each option (or `/doneoptions` after ≥2), correct option number, explanation.
5. Send **`/publish`** to post (or `/cancel` to abort). Bot posts to the selected group and pins.

## Local development

```bash
npx wrangler dev
```

Use a tunnel (e.g. **Cloudflare Tunnel** or **ngrok**) to expose HTTPS for Telegram to reach your machine, or test with `curl` POSTing sample `Update` JSON to `/webhook` with the secret header.

## Tests

```bash
npm test
```

(Constitution: mocks must match real Telegram JSON shapes.)

## MCP server (agents / Cursor)

The **stdio** MCP package calls the **deployed Worker** only (`WORKER_URL` + `INTERNAL_API_SECRET`). The Telegram bot token stays on Cloudflare.

```bash
# Windows PowerShell example
$env:WORKER_URL="https://bilbo-riddles.<account>.workers.dev"
$env:INTERNAL_API_SECRET="<same as wrangler secret>"
npm run mcp
```

Details: [`mcp/README.md`](../../mcp/README.md). Tools: **`publish_quiz`**, **`list_open_rounds`**, **`health`**.

## Limitations (v1)

- **Durable Object** holds state; destroying the DO or wiping namespace loses rounds—document ops procedures before doing so.
- **Pins**: Some clients/groups may still behave oddly with multiple pins—see spec assumptions.

## GitHub Actions (CI → merge → deploy)

Repository **Secrets** (Settings → Secrets and variables → Actions):

| Secret | Required for | Purpose |
|--------|----------------|---------|
| `CLOUDFLARE_API_TOKEN` | Deploy | `wrangler deploy` |
| `WORKER_URL` | Deploy smoke test | e.g. `https://bilbo-riddles.<account>.workers.dev` — **no trailing slash** |

Workflows live under `.github/workflows/`:

1. **CI** — on push to non-`main` branches and PRs to `main`.
2. **Auto-merge to main** — after CI success on a feature branch.
3. **Deploy** — after auto-merge; tags semver; deploys; hits `/api/health`.

Ensure the Worker implements **`GET /api/health`** returning `version` (semver string, not literal `dev` in production) and `git_sha` matching the deployed commit when `GIT_SHA` / `APP_VERSION` vars are injected (see `deploy.yml`).

## Related docs

- [Architecture (Cloudflare primary)](../../docs/architecture.md)
- [plan.md](./plan.md) · [research.md](./research.md)
