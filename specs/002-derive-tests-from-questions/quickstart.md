# Quickstart: Derive quiz cases from a Telegram export

**Feature**: `002-derive-tests-from-questions`

## Prerequisites

- **Node 20+** (matches repo CI)
- Dependencies installed: `npm install` at repo root
- A **Telegram chat export** zip (e.g. `ChatExport_YYYY-MM-DD.zip`) or an extracted `messages.html`

## Validate extraction (after implementation lands)

1. Place the export zip on disk (example: `C:\data\ChatExport_2026-04-07.zip`).
2. Run the MCP server from the repo root:

   ```bash
   npm run mcp
   ```

3. From an MCP-capable client, invoke tool **`extract_quiz_cases_from_telegram_export`** with:

   ```json
   { "export_zip_path": "C:\\data\\ChatExport_2026-04-07.zip" }
   ```

4. Expect JSON output matching `specs/002-derive-tests-from-questions/contracts/quiz-cases-output.schema.json` — check `summary.testCaseCount` and scan `cases[].flags` for `needs_review`.

## Automated tests

```bash
npm test
```

Tests use **fixtures** under `tests/fixtures/chat-export/` (snippets from real exports, not full archives).

## Sample used for SC-001 / SC-002

The project’s **`ChatExport_2026-04-07.zip`** (repo root) is the default **manual validation** sample: establish a human count of `Вопрос N` blocks once, then compare to `testCaseCount` and spot-check `questionText` for commentary leakage.

## Related docs

- [spec.md](./spec.md) — product requirements  
- [plan.md](./plan.md) — implementation plan  
- [data-model.md](./data-model.md) — field definitions  
