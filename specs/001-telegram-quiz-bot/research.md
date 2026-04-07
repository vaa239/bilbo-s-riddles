# Research: Telegram quiz bot

## 0. Hosting platform (decision)

**Decision**: **Cloudflare Workers** + **Telegram webhooks** + **Durable Objects** for state.

**Rationale**: User chose Cloudflare. Workers match the **HTTP webhook** model (each `Update` is a POST). **Durable Objects** provide a **single-threaded** coordinator for round state so “first correct wins” does not require distributed locks. State **survives** Worker isolate restarts (unlike a plain global in a Worker).

**Alternatives considered**: **Long polling** on a VPS with Python (**aiogram**) — simpler code, rejected as deployment target. **KV-only** state — eventual consistency makes race-free `tryCloseRound` harder; **D1** — viable but heavier than needed for a map of open rounds.

## 1. Language & framework

**Decision**: **TypeScript** on Workers with **grammY** (or minimal hand-rolled `fetch` to `https://api.telegram.org/bot<token>/METHOD`).

**Rationale**: First-class Workers runtime; grammY supports webhooks (`webhookCallback` or manual adapter). Pin, unpin, reactions available via Bot API `fetch`.

**Alternatives considered**: **Python on Workers** — separate runtime; would not reuse aiogram as-is. **Rust** — possible via WASM; YAGNI for this project size.

## 2. Operator UX for publishing (FR-001, FR-002a)

**Decision**: Unchanged product-wise: **private DM** to the bot from **allowlisted** Telegram users (`OPERATOR_USER_IDS`), **slash commands + FSM** (`/newquiz` → target → question → options → correct index → explanation → confirm). Webhook delivers DM updates the same as group updates.

**Rationale**: No draft leakage to play chat; single Telegram surface for the operator.

**Alternatives considered**: YAML + separate deploy hook — more moving parts on Cloudflare unless using **Queues** or **Workers CI**; deferred.

## 3. Answer attribution (FR-004, FR-010)

**Decision**: Same as before: `message.reply_to_message` in supergroup updates; map `(chat_id, reply_to_message.message_id)` to round inside the **Durable Object**.

**Rationale**: Spec-aligned; DO ensures atomic read-modify for close.

## 4. Normalization (FR-005, US4)

**Decision**: Implement in **TypeScript**:

1. Unicode NFC (optional).
2. `String.prototype.toLowerCase()` is insufficient for all locales — prefer **casefold** via `toLocaleLowerCase` with `und` or a small **Unicode-aware** approach; for v1 document exact choice and lock with tests (mirror prior Python intent).

3. Trim; collapse whitespace.

4. Strip punctuation per documented Unicode categories or keep alphanumerics + spaces.

**Rationale**: Same behavioral contract as the old Python plan; language-agnostic spec.

## 5. Pins and reactions (FR-003, FR-006)

**Decision**: After `sendMessage`, `pinChatMessage`; on win, `unpinChatMessage` for that message only; `setMessageReaction` for success emoji. All via `fetch` to Bot API.

**Risk**: If Telegram or chat mode rejects multiple pins — log, notify operator via DM, same as before.

## 6. Webhook security

**Decision**: Use Telegram **`secret_token`** in `setWebhook`; Worker verifies header **`X-Telegram-Bot-Api-Secret-Token`** (exact name per current Bot API docs) before parsing body. Reject with **401** on mismatch.

**Rationale**: Prevents random HTTP clients from injecting fake updates.

## 7. Concurrency (same quiz, two correct replies)

**Decision**: **Durable Object** processes requests **sequentially** for a given object id — natural mutex. First `tryCloseRound` that matches wins; second sees `WON` and may send optional “already solved” acknowledgment.

**Rationale**: Replaces `asyncio.Lock` from the Python design.

## 8. Persistence

**Decision**: Open rounds live in **DO storage** (in-memory + optional `state.storage` persistence if using persistent DO patterns). Survives **Worker** cold starts; survives **DO** eviction only if persisted via `state.storage` API — **v1** can use in-memory DO state only; document that **DO migration / deletion** still loses rounds.

**Rationale**: Better than plain Worker globals; good enough for v1 hobby bot.

**Future**: `state.storage.put` snapshot of map if full durability needed.

## 9. Security (operator trust)

**Decision**: Parse `OPERATOR_USER_IDS` from env; reject publish commands from others; log `user.id` only on rejection.

## 10. Testing & mocks (Constitution III)

**Decision**: **Vitest** for pure functions. For handlers, construct **JSON bodies identical to Telegram webhook payloads** (from Bot API docs or captured samples). Do not invent fields.

**Rationale**: Same constitution rule as the former Python plan.

## 11. CI/CD and deploy verification

**Decision**: **GitHub Actions** at repo root: **CI** runs `npm ci`, **Biome** on `src/`, **Vitest**; **Auto-merge** merges the feature branch to `main` after CI success; **Deploy** checks out `main`, bumps **semver tag** from merge commit prefix (`feat` → minor, `fix` → patch), runs **`wrangler deploy`** with vars **`APP_VERSION`** and **`GIT_SHA`**, then smoke-tests **`GET $WORKER_URL/api/health`** expecting JSON `{ "version": "vX.Y.Z", "git_sha": "<sha>" }`.

**Rationale**: Matches team workflow from prior project; proves deployed artifact matches merge commit. Worker must keep `/api/health` stable for the smoke step.

**Repository secrets**: `CLOUDFLARE_API_TOKEN`, `WORKER_URL` (base URL, no trailing slash). Optional: tune workflows if default branch or merge policy differs.

**Alternatives considered**: Manual deploy only — rejected after user added workflows.
