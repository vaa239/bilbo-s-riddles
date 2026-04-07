# Implementation Plan: Telegram quiz bot

**Branch**: `001-telegram-quiz-bot` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-telegram-quiz-bot/spec.md`

## Summary

Build a **Telegram bot** on **Cloudflare Workers** using **webhooks**. A **trusted operator** publishes quizzes to **play** or **optional test** supergroups via **DM** flows; the bot **pins** posts, scores **only threaded replies**, **normalizes** answers, and on first correct answer **reacts**, **replies with the explanation**, and **unpins** that quiz. **Round state** lives in a **Durable Object**. Per **constitution v1.4.0**, agent-facing capabilities MUST ship as **MCP tools** (`@modelcontextprotocol/sdk` + **Zod**), typically a **stdio MCP server** alongside the Worker.

**Repo status**: Worker implements **`POST /webhook`** (grammY + secret header), **`QuizCoordinator` Durable Object**, operator DM FSM, group scoring, **`GET /api/health`**, and **`/api/internal/*`** (Bearer `INTERNAL_API_SECRET`) for MCP. **stdio MCP** lives under **`mcp/`** (npm workspace). **CI** lints `src/`, `tests/`, `mcp/` and runs Vitest.

## Technical Context

**Language/Version**: TypeScript (ES modules), Node 20 (local + CI)  
**Primary Dependencies**: **wrangler**, **grammY** (or thin `fetch` to Bot API); **@modelcontextprotocol/sdk** + **zod** for MCP; **@biomejs/biome** + **vitest** for quality gates  
**Storage**: **Cloudflare Durable Objects** — coordinator DO with in-memory map of open `QuizRound`s; no D1 for v1  
**Testing**: **Vitest** (`tests/`); add **@cloudflare/vitest-pool-workers** when DO/handler integration tests land; Telegram JSON mocks must match real `Update` shapes  
**Target Platform**: **Cloudflare Workers**; public HTTPS URL for `setWebhook`  
**Project Type**: HTTP Worker + Durable Object + **stdio MCP server** (second package under `mcp/` or npm workspace)  
**CI/CD**: **GitHub Actions** (`.github/workflows/`): lint/test on branch & PR; auto-merge to `main` after green CI; deploy with `CLOUDFLARE_API_TOKEN`, semver tags from merge commit prefix, smoke **`GET $WORKER_URL/api/health`** (`version`, `git_sha`)  
**Performance Goals**: Small groups; stay within Worker CPU/subrequest limits; DO serializes bot state  
**Constraints**: Wrangler **secrets** for `BOT_TOKEN`, `WEBHOOK_SECRET`, etc.; verify webhook **secret_token** header; backoff on Telegram **429**  
**Scale/Scope**: Single bot; parallel rounds per spec; one DO instance id for global round map  

## Constitution Check

*GATE: Re-check after Phase 1 design. Version **v1.4.0**.*

- [x] **MCP-First**: MCP tools + Zod ship with feature (`mcp/src/index.ts`: `publish_quiz`, `list_open_rounds`, `health`).
- [x] **Spec-First**: Plan maps to `spec.md` FR/US/SC.
- [x] **Git SSOT**: Specs under `specs/001-telegram-quiz-bot/` + constitution committed.
- [x] **Test-First**: Vitest present; expand tests with DO/webhook/MCP handlers.
- [x] **Simplicity**: Worker + DO + MCP entrypoint only; no extra layers without justification.
- [x] **Observability**: Logs without tokens; MCP tool metadata only.
- [x] **Stack**: Wrangler secrets; GitHub secrets for deploy; Telegram constraints from spec.

**Post-design**: DO + MCP second entrypoint recorded in **Complexity Tracking**.

## Project Structure

### Documentation (this feature)

```text
specs/001-telegram-quiz-bot/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md                 # /speckit.tasks
```

### Source code (repository root)

```text
package.json                 # workspaces: ["mcp"]
wrangler.toml                # QuizCoordinator DO + migration v1
src/index.ts                 # /api/health, /webhook, /api/internal/*
src/webhook.ts, internal-api.ts, env.ts
src/durable/quiz-coordinator.ts, round-key.ts, types.ts
src/lib/*                    # config, destinations, normalize, formatters, telegram, do-client, publish-round, …
src/handlers/operator.ts, groups.ts
mcp/package.json, src/index.ts, README.md, tests/
tests/*.test.ts
.github/workflows/*.yml
```

**Structure Decision**: Root Worker package + **`mcp/`** npm workspace; MCP calls Worker HTTPS only (no `BOT_TOKEN` in MCP process).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Durable Object | Cloudflare Workers lack cross-request global memory | In-memory Python VPS rejected |
| MCP stdio server | Constitution **MCP-First** | Worker-only rejected for agent features |

## Phase 0 & 1 Outputs

| Artifact | Status |
|----------|--------|
| [research.md](./research.md) | Refresh with CI/health scaffold notes |
| [data-model.md](./data-model.md) | Current (DO RoundStore) |
| [contracts/](./contracts/) | Existing schemas + health contract |
| [quickstart.md](./quickstart.md) | Wrangler, webhook, **GitHub secrets** |

Phase 2: **`/speckit.tasks`**.

---

**Note**: `setup-plan.ps1` overwrites this file with an empty template—use **`check-prerequisites.ps1 -Json -PathsOnly`** for paths when re-running planning without losing content.
