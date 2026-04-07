---
description: "Task list for derive quiz test cases from Telegram chat export"
---

# Tasks: Derive quiz test cases from chat export

**Input**: Design documents from `/specs/002-derive-tests-from-questions/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Tests**: Included — constitution **Test-First** (IV): tests exercise parser/extractor/MCP boundaries before or alongside implementation; fixtures use realistic Telegram HTML shapes.

**Organization**: Phases follow user story priorities from [spec.md](./spec.md) (US1 → US2 → US3), then MCP and polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story label [US1], [US2], [US3] for story phases only
- Paths: repository root = `bilbo-s-riddles/`

## Phase 1: Setup (shared infrastructure)

**Purpose**: Dependencies and type scaffolding

- [ ] T001 Add `node-html-parser` and `fflate` to root `package.json` dependencies; run `npm install` and ensure lockfile updates
- [ ] T002 [P] Create `src/chat-export/types.ts` with `ParsedSourceMessage`, `QuizTestCase`, `ExtractionSummary`, `ExtractionResult` aligned to `specs/002-derive-tests-from-questions/data-model.md`

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: HTML parse and zip load — **required before any user story implementation**

**⚠️ CRITICAL**: No user story work until parse + zip pipeline exists

- [ ] T003 Implement `parseMessagesHtml` in `src/chat-export/parse-messages-html.ts` — walk `div.message`, skip `div.message.service`, return `ParsedSourceMessage[]` with `sourceMessageId`, `sourceOrder`, `rawHtml`, `isService`
- [ ] T004 Implement zip helper in `src/chat-export/load-zip.ts` — given absolute path to `.zip`, locate nested `messages.html` (e.g. `ChatExport_*/messages.html`), return UTF-8 string via `fflate`
- [ ] T005 Export public entrypoints and types from `src/chat-export/index.ts` (`parseMessagesHtml`, `loadMessagesHtmlFromZip`, types)

**Checkpoint**: Foundation ready — user story phases can start

---

## Phase 3: User Story 1 — Produce test cases from export (Priority: P1) 🎯 MVP

**Goal**: Zip → parsed messages → quiz rows only; one `QuizTestCase` per `Вопрос N` (or agreed pattern); `ExtractionSummary` with counts and warnings per FR-007.

**Independent Test**: Run extractor on `tests/fixtures/chat-export/sample-messages.html` and on full `ChatExport_2026-04-07.zip` — `testCaseCount` matches manual `Вопрос` count; obvious non-question messages do not produce cases.

### Tests for User Story 1 (write before / alongside implementation)

- [ ] T006 [P] [US1] Add `tests/fixtures/chat-export/sample-messages.html` containing service rows, a non-question text message, and at least two `Вопрос N:` blocks with spoiler markup consistent with real Telegram HTML
- [ ] T007 [US1] Add `tests/chat-export/us1-extract.test.ts` — assert excluded service/non-question messages, included question count, and `summary.testCaseCount` / `skippedMessageCount` semantics per [spec.md](./spec.md) User Story 1

### Implementation for User Story 1

- [ ] T008 [US1] Implement `extractQuizCases` in `src/chat-export/extract-quiz-cases.ts` — detect quiz messages via `Вопрос\s*\d+:` (and document pattern in file comment); build `QuizTestCase` with `id`, `sourceMessageId`, `sourceOrder`, `questionText`, `expectedAnswers` from spoiler `Ответ:` lines where present; populate `ExtractionSummary`
- [ ] T009 [US1] Add `extractFromTelegramExportZip(exportZipPath: string): ExtractionResult` in `src/chat-export/index.ts` composing `loadMessagesHtmlFromZip` → `parseMessagesHtml` → `extractQuizCases`

**Checkpoint**: US1 complete — MVP delivers usable case list + summary from a zip path

---

## Phase 4: User Story 2 — Omit commentary from question field (Priority: P2)

**Goal**: `questionText` excludes post-answer commentary and host-only noise; FR-008 `needs_review` when split unreliable.

**Independent Test**: Fixture with spoiler containing `Ответ:`, `Комментарий:`, `Зачёт:` — `questionText` has no commentary lines; alternates captured per research.

### Tests for User Story 2

- [ ] T010 [P] [US2] Add `tests/fixtures/chat-export/with-commentary-spoiler.html` (or extend sample) with комментарий/зачёт lines inside spoiler
- [ ] T011 [US2] Add `tests/chat-export/us2-commentary.test.ts` — assert no `Комментарий:` leakage in `questionText`; `alternateAccept` populated when `Зачёт:` parsed; `flags` includes `needs_review` when heuristic cannot split (mocked edge case)

### Implementation for User Story 2

- [ ] T012 [US2] Extend `src/chat-export/extract-quiz-cases.ts` — strip spoiler bodies from visible question HTML; map `Комментарий` to non-player fields or omit; isolate host-only lead-ins to `hostNotes` or omit per [spec.md](./spec.md) assumptions; set `flags` per FR-008

**Checkpoint**: US2 complete — SC-002 sample review viable

---

## Phase 5: User Story 3 — Stable ordering and traceability (Priority: P3)

**Goal**: `sourceOrder` monotonic; `questionNumber` and `roundLabel` when parseable; sort stability per FR-006.

**Independent Test**: Multi-message fixture — cases sort by `sourceOrder`; `questionNumber` matches `Вопрос N`.

### Tests for User Story 3

- [ ] T013 [P] [US3] Add `tests/chat-export/us3-ordering.test.ts` — assert ordering, `sourceMessageId` traceability, `questionNumber` extraction

### Implementation for User Story 3

- [ ] T014 [US3] Extend `src/chat-export/extract-quiz-cases.ts` — extract `questionNumber` from label; best-effort `roundLabel` from preceding “Тур” lines or same-block prefix; document limits for split questions in `summary.warnings` if not merged

**Checkpoint**: US3 complete — full spec user stories covered

---

## Phase 6: MCP tool (constitution I)

**Purpose**: Expose `extract_quiz_cases_from_telegram_export` with Zod schema per `specs/002-derive-tests-from-questions/contracts/mcp-extract-tool.md`

- [ ] T015 Implement tool registration in `mcp/src/index.ts` — `inputSchema`: exactly one of `export_zip_path` | `messages_html_path` (absolute paths); call `extractFromTelegramExportZip` or parse-only path; return pretty-printed JSON text matching `specs/002-derive-tests-from-questions/contracts/quiz-cases-output.schema.json`
- [ ] T016 [P] Add `mcp/tests/extract-tool.test.ts` — Zod validation (mutually exclusive paths); tool handler returns parseable JSON with `summary` + `cases` keys; use temp copy of `tests/fixtures/chat-export/sample-messages.html` or zip fixture if added

---

## Phase 7: Polish and cross-cutting

**Purpose**: Quality gates and operator docs

- [ ] T017 [P] Run `npm run lint` and `npm test` from repo root; fix any issues in `src/chat-export/`, `tests/`, `mcp/`
- [ ] T018 [P] Update `mcp/README.md` with the new tool name, required args, and link to `specs/002-derive-tests-from-questions/quickstart.md`
- [ ] T019 Walk through `specs/002-derive-tests-from-questions/quickstart.md` with a real zip path; adjust quickstart only if steps are wrong

---

## Dependencies and execution order

### Phase dependencies

- **Phase 1 (Setup)**: No prerequisites
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phases 3–5 (US1–US3)**: Depend on Phase 2; sequential by priority recommended (US2/US3 can start after US1 if staffed in parallel but share `extract-quiz-cases.ts` — avoid merge conflicts)
- **Phase 6 (MCP)**: Depends on Phase 3 minimum (US1 API); ideally after US2–US3 so tool returns final shape
- **Phase 7 (Polish)**: Depends on Phase 6 for full green CI

### User story dependencies

- **US1**: After Phase 2 only
- **US2**: After US1 (extends same extractor) or parallel branch with careful merging — **sequential T008→T012 recommended**
- **US3**: After US1; may proceed after or in parallel with US2 if `extract-quiz-cases.ts` coordination is clear

### Within each user story

- Fixtures (T006, T010) can precede tests (T007, T011)
- Tests should fail or be narrow before T008/T012/T014 expand behavior
- Implementation tasks T008–T014 are serial on the same file where noted

---

## Parallel opportunities

| When | Tasks |
|------|--------|
| After Phase 1 | T003 and T004 are different files — can pair-program in parallel until T005 barrel ties them |
| Phase 3 | T006 [P] fixture authoring while T005 completes |
| Phase 4 | T010 [P] fixture while T011 test file is drafted |
| Phase 5 | T013 [P] tests while US2 code stabilizes |
| Phase 6 | T016 [P] after T015 signature is stable |
| Phase 7 | T017, T018 [P] in parallel |

---

## Parallel example: User Story 1

```text
# Fixture + test file (different paths):
T006 [P] [US1] tests/fixtures/chat-export/sample-messages.html
T007 [US1] tests/chat-export/us1-extract.test.ts  (depends on T006 for content)

# Then serial implementation:
T008 [US1] src/chat-export/extract-quiz-cases.ts
T009 [US1] src/chat-export/index.ts
```

---

## Implementation strategy

### MVP first (User Story 1 only)

1. Complete Phase 1 and Phase 2  
2. Complete Phase 3 (US1) — **stop and validate** with `ChatExport_2026-04-07.zip` per [quickstart.md](./quickstart.md)  
3. Optionally demo MCP after T015 if US2–US3 deferred (tool still useful with US1-only behavior)

### Incremental delivery

1. Setup + Foundation → parse/zip proven  
2. US1 → MVP extraction + summary  
3. US2 → clean `questionText` for SC-002  
4. US3 → full traceability fields  
5. MCP → agent-accessible workflow  
6. Polish → CI green + README

### Parallel team strategy

- Developer A: Phase 2 (`parse-messages-html.ts`)  
- Developer B: Phase 2 (`load-zip.ts`) — merge before T005  
- After US1: one developer owns `extract-quiz-cases.ts` linearly for US2+US3 to minimize conflicts  

---

## Notes

- Do not import `src/chat-export/` from `src/index.ts` (Worker entry) — keep edge bundle free of HTML/zip code per [plan.md](./plan.md)  
- Log paths and counts only — not full message bodies (constitution VI)  
- Mark tasks `[x]` in this file as each completes  

---

## Task summary

| Metric | Value |
|--------|--------|
| **Total tasks** | 19 (T001–T019) |
| **US1** | 4 implementation + 2 fixture/test + (tests part of phase) → T006–T009 (impl), T006–T007 tests |
| **US2** | T010–T012 |
| **US3** | T013–T014 |
| **MCP** | T015–T016 |
| **Polish** | T017–T019 |
| **Parallel tasks [P]** | T002, T006, T010, T013, T016, T017, T018 |
| **Suggested MVP** | Phases 1–3 (T001–T009) |

**Independent test criteria**

| Story | How to verify alone |
|-------|---------------------|
| US1 | `npm test` — `us1-extract.test.ts` green; manual spot-check zip |
| US2 | `us2-commentary.test.ts` green; spot-check no commentary in `questionText` |
| US3 | `us3-ordering.test.ts` green; JSON sorted by `sourceOrder` |

**Format validation**: All tasks use `- [ ]`, sequential `T###` IDs, story labels only on US phases, file paths in descriptions.
