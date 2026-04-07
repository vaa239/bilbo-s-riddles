# MCP tool contract: `extract_quiz_cases_from_telegram_export`

**Server**: `bilbo-riddles` stdio MCP (`mcp/src/index.ts`)  
**Constitution**: Zod `inputSchema` at registration; tool description lists preconditions and failures.

## Purpose

Read-only extraction of quiz test cases from a **Telegram Desktop–style** chat export (zip or `messages.html`). No Telegram network calls; no Worker calls.

## Input (Zod)

Exactly one of the following path fields must be set:

| Field                  | Type   | Constraints |
|------------------------|--------|-------------|
| `export_zip_path`      | string | Absolute path to `.zip` chat export |
| `messages_html_path`   | string | Absolute path to `messages.html` inside an extracted folder |

Optional:

| Field              | Type    | Default | Description |
|--------------------|---------|---------|-------------|
| `include_alternate`| boolean | `true`  | Populate `alternateAccept` from “Зачёт” lines when parsed |

**Validation errors**: Neither path set; both set; path empty; path not absolute (recommended constraint — document in implementation).

## Success output

MCP `CallToolResult`: `content[]` with one `text` part containing **pretty-printed JSON** matching [quiz-cases-output.schema.json](./quiz-cases-output.schema.json).

## Failure modes (non-throwing tool response)

Implementation SHOULD return HTTP-style narrative in tool text for:

- File not found / not readable
- Zip missing `messages.html`
- HTML parse errors (with partial summary if safe)

Use **process stderr** for developer logs; **not** for full message bodies (observability: metadata and paths only).

## Traceability

Maps to **FR-001–FR-008** and **User Stories 1–3** in [spec.md](../spec.md).
