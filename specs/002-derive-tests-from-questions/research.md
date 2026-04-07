# Research: Derive quiz test cases from Telegram chat export

**Feature**: `002-derive-tests-from-questions` | **Date**: 2026-04-08

## 1. HTML parsing strategy

**Decision**: Parse Telegram Desktop HTML exports with a **DOM-style HTML parser** (`node-html-parser`), walking `div.message` nodes and reading `div.text` inner HTML.

**Rationale**: Real exports (see project sample) nest links, `<br>`, `<strong>`, spoiler spans, and reactions. Regex-only extraction breaks on nested tags and entity encoding; a tree walk matches the spec’s need to separate spoiler blocks from the visible question.

**Alternatives considered**:

- **Cheerio** (jQuery API): Familiar but heavier; same capability as `node-html-parser`.
- **Regex / line split**: Rejected — fails on multi-line questions and nested markup.

## 2. Archive input

**Decision**: Accept the **`.zip`** bundle as produced by Telegram (“Export chat history”). Implementation locates `messages.html` inside (including nested folder `ChatExport_*/messages.html`) via `fflate` unzip to string in Node.

**Rationale**: Matches FR-001 and user workflow; single file path for operators and MCP.

**Alternatives considered**:

- **Pre-unzipped folder only**: Extra manual step; zip path kept as primary with optional `messages_html_path` for tests.

## 3. Question detection heuristics

**Decision**: Treat a message as a quiz question when its text matches a **primary pattern** (e.g. `Вопрос\s*\d+:` or `Question\s+\d+:`) after normalizing HTML to text; exclude `div.message.service` and messages without a matching pattern unless flagged for manual review.

**Rationale**: Sample channel uses `**Вопрос N:**` in HTML as `<strong>Вопрос N:</strong>`. Heuristic is testable against fixtures; ambiguous rows get `flags: ["needs_review"]` per FR-008.

**Alternatives considered**:

- **ML classification**: Rejected for v1 (YAGNI).
- **Channel-specific config file**: Deferred; add only if a second export style breaks tests.

## 4. Separating question / answer / commentary

**Decision**: Within each question message, strip or relocate content inside **spoiler** elements (`span.spoiler` / hidden answer blocks) from `questionText`; parse “Ответ:”, “Комментарий:”, “Зачёт:” lines inside spoilers into `expectedAnswers` and optional `answerNotes` (not shown as player prompt). Host-only lead-in (e.g. “Ведущему: …”) → `hostNotes` or omitted per spec assumptions.

**Rationale**: Matches observed HTML structure in the sample export.

## 5. Output shape and interchange

**Decision**: Canonical output is **JSON** documented by `contracts/quiz-cases-output.schema.json`, with a **stable ordering** field (`sourceOrder` monotonic in chat order). Optional **NDJSON** or pretty-print for CLI; MCP returns JSON as tool result text.

**Rationale**: FR-005 requires structured review + downstream import; JSON is universal for the existing TypeScript stack.

## 6. MCP surface (constitution)

**Decision**: Expose **`extract_quiz_cases_from_telegram_export`** on the existing stdio MCP server with **Zod** `inputSchema` (`export_zip_path` **or** `messages_html_path`, absolute paths). Tool description documents: **read-only** filesystem access, no Telegram calls, large files may take seconds, failures (missing file, unreadable zip, no messages.html).

**Rationale**: Principle I (MCP-First) — agents must not rely on undocumented-only scripts for this capability.

## 7. Test fixtures

**Decision**: Commit **minimal HTML snippets** under `tests/fixtures/chat-export/` cut from real exports (questions + spoilers), not full 30k-line files.

**Rationale**: Principle IV — mocks match real shapes; keeps CI fast.

## 8. Dependencies (new)

| Package            | Role                          | Rationale |
|--------------------|-------------------------------|-----------|
| `node-html-parser` | Parse `messages.html`         | Small, fast, selector-friendly |
| `fflate`           | Unzip in Node (no native dep) | Lightweight, sync unzip API |

**PR note** (Principle V): Both justified; Node has no built-in HTML/zip for this use case.
