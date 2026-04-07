<!--
SYNC IMPACT REPORT
==================
Version change: 1.3.1 → 1.4.0 (MINOR — MCP-First restored as Principle I; Spec-First → II;
  Git SSOT → III; Test-First → IV; Simplicity → V; Observability → VI)
Modified principles: I Spec-First → split/reorder (new I MCP-First; former I → II Spec-First)
Added sections: none (MCP guidance under Technology Stack expanded)
Removed sections: none
Templates checked:
  - .specify/templates/plan-template.md        ✅ Constitution Check updated
  - .specify/templates/spec-template.md        ✅ no change required
  - .specify/templates/tasks-template.md       ✅ no change required
  - .specify/templates/agent-file-template.md  ✅ no change required
Deferred TODOs: none
-->

# bilbo-s-riddles Constitution

## Core Principles

### I. MCP-First (NON-NEGOTIABLE)

Every **new capability** that an AI agent or automation could reasonably use MUST be
exposed as at least one **named, schema-validated MCP tool** registered with the
**Model Context Protocol** using `@modelcontextprotocol/sdk` (or a documented successor
maintained in-tree).

- Each tool MUST map to a clear user-facing or operator-facing capability (e.g. publish
  quiz, list open rounds, health check)—not only internal helpers unreachable through the
  protocol.
- Tool **input schemas** MUST be defined with **Zod** (or equivalent schema layer agreed
  in `plan.md`) and attached at MCP registration—no untyped `any` at the tool boundary.
- Tool **descriptions** MUST state preconditions, side-effects (Telegram writes, Cloudflare
  calls), and failure modes.
- The **MCP server** is the **canonical agent interface** for those capabilities. Core
  runtime code (e.g. Cloudflare Worker webhooks) MAY implement behavior, but agents MUST
  not depend on undocumented side channels as the only way to perform the same action—if
  agents need it, it MUST also exist as a tool (or the spec/plan MUST record a deliberate
  exception in Complexity Tracking).

**Rationale**: The project values AI-accessible, inspectable interfaces. Capabilities hidden
from MCP are invisible to agents and bypass schema, safety, and review expectations.

### II. Spec-First (NON-NEGOTIABLE)

Non-trivial behavior MUST be driven by an explicit feature specification before
implementation. Specs live under `specs/` and are produced or updated through the Speckit
workflow (`/speckit.specify`, `/speckit.plan`, `/speckit.tasks` as appropriate).

- Every merge that changes user-visible bot behavior MUST trace to acceptance criteria in
  the active feature `spec.md` (or a follow-up spec amendment in the same PR).
- New MCP tools MUST trace to `spec.md` / `plan.md` (inputs, errors, side-effects).
- The spec is the arbiter when code and informal chat disagree; update the spec instead
  of “secret” behavior.
- Clarifications and constitution changes MUST be written into the tracked documents, not
  left as chat-only lore.

**Rationale**: Spec-Kit prevents untestable intent; MCP without specs invites ad-hoc tools.

### III. Git as Single Source of Truth

Authoritative project state MUST live in this Git repository. Requirements, plans, tasks,
and constitution under `specs/` and `.specify/` MUST be committed with the code they
govern.

- No “shadow” requirements: if it matters for correctness or review, it belongs in a
  tracked file.
- Feature branches carry their `specs/[###-feature]/` artifacts through to merge.
- Abandoned features MUST move to `specs/_abandoned/` and be committed—not silently deleted.

**Rationale**: History and review depend on a single auditable source.

### IV. Test-First (NON-NEGOTIABLE)

Tests MUST be written before implementation for any new user-visible behavior: handlers,
parsers, normalization, MCP tool handlers, or integration points where wrong behavior
would confuse players, operators, or agents.

- The project’s automated test suite MUST pass with zero failures before a branch is
  merged. The exact runner and commands are defined in `plan.md` / README once the stack
  is chosen.
- Coverage targets are advisory unless raised to MUST in a future amendment.
- Tests MUST exercise the public boundary (inputs → outputs) and at least one error path
  per meaningful unit—including **MCP tool** input validation and error paths.
- **Test mocks MUST reflect the actual shape of production data sources.** When a test
  mocks data produced by an external system (e.g. Telegram update payloads, HTTP APIs),
  the mock MUST match what that system actually emits—not an idealized or augmented
  version. A test that asserts a failure (4xx / rejected update) for input that the real
  system produces is testing broken behavior, not correct behavior. Before adding a guard
  or validation that causes a failure path, verify that the production system actually
  produces the input shape that triggers it.

**Rationale**: External APIs and MCP boundaries need contracts enforced by realistic tests.

### V. Simplicity & YAGNI

The codebase MUST stay small and direct: one primary application layout under `src/`
unless `plan.md` justifies more (Worker + MCP server MAY coexist as two entrypoints if
documented).

- No new abstraction layers (services, repositories, factories) unless they remove real
  duplication across ≥ 3 call sites or isolate a stable boundary.
- Helpers MUST live next to their first consumer until a second consumer exists.
- New runtime dependencies require a one-line rationale in the PR: why built-ins or
  existing deps are insufficient.
- No caching, pooling, or batching “for scale” until measurement shows need.

**Rationale**: A quiz bot and MCP surface fail on complexity, not on missing enterprise
patterns.

### VI. Observability by Default

Operator actions, quiz lifecycle events, MCP tool invocations (metadata only), and errors
MUST be logged in a consistent, grep-friendly form suitable for diagnosing mispins,
wrong-thread replies, Telegram API failures, or tool failures.

- Logs MUST NOT include bot tokens, secrets, or private message bodies beyond what is
  necessary for debugging (prefer IDs and short summaries).
- User-visible error replies MUST be safe and non-leaky; internal details stay in logs.
- When the stack supports it, correlate logs with a round or message identifier.

**Rationale**: Telegram and agent integrations fail in production for permission and
payload reasons; without logs, fixes are guesswork.

## Technology Stack & Constraints

**Scope**: Telegram quiz bot plus **MCP server** (see `specs/001-telegram-quiz-bot/` and
`plan.md`). Primary runtime per plan: **Cloudflare Workers** (webhooks) + **Durable
Objects**; **MCP server** typically **TypeScript / Node** with `@modelcontextprotocol/sdk`
and **Zod**—exact layout in `plan.md`.

**MCP**: Tools MUST register on the project’s `McpServer` instance; schema and
descriptions MUST meet Principle I.

**Secrets**: Bot token, chat IDs, MCP-related secrets MUST come from environment or secret
management—never committed.

**Telegram**: Behavior MUST respect platform limits (pins, threads, permissions) as
documented in the feature spec; workarounds belong in `plan.md` with a Constitution Check
note if they add complexity.

**Constraints**:

- Dependencies SHOULD stay minimal; each addition needs the Principle V rationale.
- The bot MUST fail safely when misconfigured (missing token, missing chat) with a clear
  operator-facing message or log line.

## Development Workflow

1. **Spec before code**: Non-trivial work starts with `/speckit.specify` (or an amended
   spec) before large code changes.
2. **MCP with features**: When adding behavior agents should use, add or extend MCP tools
   in the same change set (or document exception in plan Complexity Tracking).
3. **Lint / format**: Run the repo’s formatter and linter (defined when the stack lands)
   before merge; if none exist yet, skip until `plan.md` adds them.
4. **Tests before merge**: Automated tests MUST exit 0 before merge (see Principle IV).
5. **Commit granularity**: Use **Conventional Commits** (`feat:`, `fix:`, `docs:`,
   `refactor:`, `chore:`, `ci:`). Scoped forms (`feat(bot):`, `feat(mcp):`) are welcome.
6. **Changelog / README**: When the repo has `CHANGELOG.md` or a version section in
   `README.md`, update it for user-visible releases as part of the same change set.
7. **No direct pushes to `main`**: Changes SHOULD land via branch + review (or PR). Same
   idea as the baseline: protect `main` if the host supports it.
8. **CI/CD**: When pipelines exist, a feature is “done” only when CI is green and any
   configured deploy/smoke step succeeds; if there is no deploy yet, CI + tests suffice.
9. **WIP limit — one active feature branch**: Do not start a new `/speckit.specify`
   feature until the current feature branch is merged or abandoned per Speckit rules.
   `create-new-feature.ps1` enforces this; use documented override only for hotfixes.
10. **Clean working tree before new work**: `git status` SHOULD be clean when starting a
    new feature; spec artifacts belong committed on their branch, not left untracked.
11. **Version-controlled specs**: Everything under `specs/` and `.specify/memory/` that
    is not machine-generated scratch MUST be committed.
12. **Incremental task check-off**: In `tasks.md`, mark tasks `[x]` as soon as each
    completes so interrupted sessions can resume accurately.

## Governance

This constitution supersedes ad-hoc chat decisions. If code or a PR description conflicts
with this file, update this file in the same PR or follow the amendment procedure.

**Amendment procedure**:

1. Propose changes in a dedicated PR with motivation and any migration notes.
2. Bump `CONSTITUTION_VERSION` (MAJOR / MINOR / PATCH): MAJOR for breaking governance or
   removed principles; MINOR for new sections or material new rules; PATCH for wording.
3. Propagate updates to `.specify/templates/` when template gates or examples reference
   the constitution.
4. Set `LAST_AMENDED_DATE` to the merge date.

**Compliance review**: PRs that change application source SHOULD include a one-line
**Constitution Check** stating which principles were considered, or which rule is
knowingly relaxed and why (with a Complexity Tracking row in `plan.md` if Principle V is
bent).

**Complexity justification**: Violations of Principle V MUST be recorded in the plan’s
Complexity Tracking table before implementation.

---

**Version**: 1.4.0 | **Ratified**: 2026-04-07 | **Last Amended**: 2026-04-08
