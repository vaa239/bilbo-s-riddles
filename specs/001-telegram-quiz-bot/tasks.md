---
description: "Task list for Telegram quiz bot (Cloudflare Workers + DO + MCP)"
---

# Tasks: Telegram quiz bot

**Input**: `specs/001-telegram-quiz-bot/` — [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Prerequisites**: plan.md, spec.md (required)

**Tests**: Included per constitution (Test-First) and spec success criteria — Vitest.

**Format**: `[P]` = parallelizable (different files, no ordering dependency within phase)

## Dependency graph (user stories)

```text
Phase 1 Setup
    ↓
Phase 2 Foundational (config, normalize, Telegram client, DO, webhook shell)
    ↓
Phase 3 [US1] Publish  ─────────────────┐
    ↓                                     │
Phase 4 [US2] Test-chat isolation         │ (US2 mostly validated by US1+US3)
    ↓                                     │
Phase 5 [US3] Scoring ←───────────────────┘
    ↓
Phase 6 [US4] Normalization test matrix
    ↓
Phase 7 MCP (Principle I)
    ↓
Phase 8 Polish
```

**MVP scope**: Complete through **Phase 3 (US1)** for “post + pin + track round” in play chat; add **Phase 5** for playable quizzes; **Phase 7** required before constitution MCP-First gate clears.

---

## Phase 1: Setup

**Purpose**: Dependencies and Worker/DO wiring in Wrangler.

- [x] T001 Add runtime deps in `package.json`: `grammy`, `zod` (and types as needed)
- [x] T002 [P] Add dev dep `@cloudflare/vitest-pool-workers` in `package.json` and extend `vitest.config.ts` when DO tests are added
- [x] T003 [P] Add `@modelcontextprotocol/sdk` for MCP phase (root or `mcp/package.json` per chosen layout)
- [x] T004 Register **Durable Object** binding in `wrangler.toml` (class name `QuizCoordinator`, migration tag `v1`) per [Cloudflare DO docs](https://developers.cloudflare.com/durable-objects/)
- [x] T005 Refactor `src/index.ts` to export both **default fetch handler** and **QuizCoordinator** (or split exports per Wrangler ES module pattern)

---

## Phase 2: Foundational (blocking)

**Purpose**: Shared libs, Telegram `fetch` wrapper, DO skeleton, webhook verification — **required before US1–US3**.

- [x] T006 Implement typed env bindings in `src/lib/config.ts` (BOT_TOKEN, WEBHOOK_SECRET, PLAY_CHAT_ID, optional TEST_CHAT_ID, OPERATOR_USER_IDS, SUCCESS_REACTION_EMOJI, APP_VERSION, GIT_SHA)
- [x] T007 Implement `resolveTargetChatId(target: 'play' | 'test')` in `src/lib/destinations.ts` using config (throw if test chosen but TEST_CHAT_ID unset)
- [x] T008 Implement `normalizeAnswer(text: string): string` in `src/lib/normalize.ts` per [research.md](./research.md) (document algorithm in file header)
- [x] T009 Add unit tests in `tests/normalize.test.ts` covering casefold, whitespace collapse, punctuation stripping (SC-002 / US4)
- [x] T010 Implement `callTelegramMethod(method, body, token)` in `src/lib/telegram.ts` using `fetch` to `api.telegram.org` with JSON body and error parsing
- [x] T011 [P] Implement `formatQuizMessage(question, options, postedByLine): string` in `src/lib/formatters.ts` (FR-008: no correct answer leaked; FR-008a: `postedByLine` is the **last** line — Telegram operator display name / @username from `User` or `posted_by_line` from payload / MCP)
- [x] T012 Create `src/durable/quiz-coordinator.ts`: Durable Object class with in-memory `Map` key `"${chatId}:${quizMessageId}"` → serialized `QuizRound` (fields per [data-model.md](./data-model.md))
- [x] T013 Add `registerRound`, `getOpenRound`, `tryCloseRound` RPC-style methods on `QuizCoordinator` (HTTP subrequests or internal `fetch` to `self` per Workers DO pattern)
- [x] T014 Wire Worker `fetch` in `src/index.ts`: `POST /webhook` → verify `X-Telegram-Bot-Api-Secret-Token` against `WEBHOOK_SECRET`; `GET /api/health` unchanged for deploy smoke ([contracts/deploy-health.schema.json](./contracts/deploy-health.schema.json))
- [x] T015 Add `src/webhook.ts`: parse `Update` JSON, route to stub handlers (empty) — filled in US1/US3

**Independent test**: `npm test` green; `wrangler dev` serves `/api/health`; DO class deploys without error.

---

## Phase 3: User Story 1 — Publish live quizzes (P1)

**Goal**: Operator can complete a quiz via DM; bot posts to **play** or **test**, pins, registers round in DO.

**Independent test**: Two quizzes posted to play chat, both pinned, both in DO; optional second to test chat only.

- [x] T016 [US1] Implement operator allowlist check in `src/handlers/operator.ts` (parse OPERATOR_USER_IDS; reject non-operators with log)
- [x] T017 [US1] Add grammY bot instance for webhook processing in `src/webhook.ts` (or `src/bot.ts`) with secret token validation adapter
- [x] T018 [US1] Implement FSM or multi-step command flow in `src/handlers/operator.ts`: `/newquiz` → target (play|test) → question → options (≥2) → correct index → explanation → confirm (align with [contracts/quiz-publish-payload.schema.json](./contracts/quiz-publish-payload.schema.json))
- [x] T019 [US1] On confirm: build `posted_by_line` from Telegram `User` (e.g. `@username` or display name fallback), call `formatQuizMessage` with it, then `sendMessage` to resolved `chat_id`, `pinChatMessage`, then `registerRound` on DO with `status: OPEN` and `posted_by_line` per [data-model.md](./data-model.md)
- [x] T020 [US1] Handle Telegram pin API errors: log + optional operator DM with failure text (spec edge case)
- [x] T021 [P] [US1] Add Vitest test with **realistic** Telegram `Update` JSON for a private message command (constitution III)

---

## Phase 4: User Story 2 — Rehearse in test chat (P2)

**Goal**: Quizzes targeted at test chat never duplicate to play; DO keys include `chat_id` so no cross-chat matching.

**Independent test**: Publish to test only; play chat has no new quiz message; with rounds in both chats, replies stay isolated.

- [x] T022 [US2] Verify `T019` uses `resolveTargetChatId` only — add integration-style test or manual checklist in `tests/destinations.test.ts` for test-unset throws
- [x] T023 [US2] Add Vitest test: two rounds registered with different `chat_id` in DO stub/map; `getOpenRound` never returns cross-chat (SC-006 / FR-010)

---

## Phase 5: User Story 3 — Correct answer closes the right round (P2)

**Goal**: Threaded reply to quiz post → normalize → match → reaction + explanation reply + unpin; non-threaded ignored; wrong answer no unpin.

**Independent test**: Two open quizzes; correct reply to A closes only A; non-threaded message no-op.

- [x] T024 [US3] Implement `src/handlers/groups.ts`: on `message` in play/test supergroups, require `reply_to_message`; lookup round by `(chat_id, reply_to_message.message_id)` via DO
- [x] T025 [US3] If no round or not `OPEN`, return without side effects (FR-004, SC-005)
- [x] T026 [US3] Compare `normalizeAnswer(message.text)` to stored correct answer; on mismatch, no explanation, no unpin (FR-007)
- [x] T027 [US3] On first match: `setMessageReaction`, `sendMessage` reply to participant with explanation, `unpinChatMessage` for quiz post, mark `WON` in DO (FR-006); second correct reply idempotent handling (edge case)
- [x] T028 [P] [US3] Vitest tests with Telegram `Update` shapes for **supergroup message** + `reply_to_message` (realistic fields)

---

## Phase 6: User Story 4 — Messy typing (P3)

**Goal**: Document normalization limits; expand tests for ≥10 variants (SC-002).

- [x] T029 [US4] Extend `tests/normalize.test.ts` with table-driven cases: punctuation variants, unicode case, doubled spaces (reference SC-002)
- [x] T030 [P] [US4] Document normalization limits in `src/lib/normalize.ts` comment if any characters are intentionally not folded

---

## Phase 7: MCP (Principle I — constitution)

**Goal**: `@modelcontextprotocol/sdk` + Zod; tools callable by agents; descriptions include side-effects.

**Independent test**: Run MCP server locally; invoke each tool with valid/invalid Zod input.

- [x] T031 Add `mcp/package.json` (or npm `workspaces` in root `package.json`) with `tsx`/`node` entry for stdio server
- [x] T032 Implement `mcp/src/index.ts`: bootstrap `McpServer`, register tools
- [x] T033 Define Zod schema + tool **`publish_quiz`** (inputs mirror [quiz-publish-payload.schema.json](./contracts/quiz-publish-payload.schema.json), including required **`posted_by_line`** for MCP since there is no Telegram `User`); handler calls Worker **internal HTTP route** or shared module — **document choice** in `mcp/README.md` (avoid duplicating Telegram token in two processes if possible)
- [x] T034 [P] Define Zod + tool **`list_open_rounds`** (returns summary of OPEN rounds from DO — may require new Worker `GET` or DO RPC; document security: operator-only)
- [x] T035 [P] Define Zod + tool **`health`** returning deploy health shape ([deploy-health.schema.json](./contracts/deploy-health.schema.json)) via `fetch` to `WORKER_URL`
- [x] T036 Add Vitest or integration script in `mcp/` for tool input validation errors
- [x] T037 Update root `plan.md` Constitution Check: mark **MCP-First** `[x]` when T033–T035 done

---

## Phase 8: Polish & cross-cutting

**Purpose**: Resilience, observability, docs, CI.

- [x] T038 Implement Telegram **429** retry with backoff in `src/lib/telegram.ts`
- [x] T039 Structured JSON logs (no token) for round_id, chat_id, message_id in handlers
- [x] T040 Update `docs/architecture.md` if MCP ↔ Worker wiring differs from plan
- [x] T041 Update `specs/001-telegram-quiz-bot/quickstart.md` with MCP server run instructions (`npx tsx mcp/src/index.ts` or equivalent)
- [x] T042 Run `npm test` + `npx biome check src/` and fix; ensure `.github/workflows/ci.yml` passes

---

## Parallel execution examples

- After **T012**: **T009** and **T011** can proceed in parallel with **T010** if different owners.
- **T021**, **T028**, **T036** marked `[P]` can run in parallel once their handler deps exist.
- **Phase 7**: **T034** and **T035** parallel after **T032**.

---

## Implementation strategy

1. **MVP**: Phases **1–3** — publish + pin + DO register for **play** chat.
2. **Playable**: Add **Phase 5** — scoring path.
3. **Spec-complete**: **Phase 4**, **6**, **8**.
4. **Constitution-complete**: **Phase 7** MCP before calling feature “done” for agent workflows.

---

## Task summary

| Phase | Task IDs | Count |
|-------|----------|-------|
| Setup | T001–T005 | 5 |
| Foundational | T006–T015 | 10 |
| US1 | T016–T021 | 6 |
| US2 | T022–T023 | 2 |
| US3 | T024–T028 | 5 |
| US4 | T029–T030 | 2 |
| MCP | T031–T037 | 7 |
| Polish | T038–T042 | 5 |
| **Total** | | **42** |
