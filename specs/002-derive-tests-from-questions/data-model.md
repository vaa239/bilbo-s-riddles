# Data model: Quiz export extraction

**Feature**: `002-derive-tests-from-questions` | **Spec**: [spec.md](./spec.md)

## ParsedSourceMessage

Raw row produced when scanning the HTML export (before quiz filtering).

| Field            | Type        | Description |
|------------------|-------------|-------------|
| `sourceMessageId`| string      | Stable id from export (`message` div `id`, e.g. `message19`) |
| `sourceOrder`    | number      | 0-based index in document order |
| `isService`      | boolean     | `true` for `div.message.service` |
| `rawHtml`        | string      | Inner HTML of `div.text` (may be empty) |
| `fromName`       | string \| null | `div.from_name` text if present |

## QuizTestCase

One logical quiz item for import or review.

| Field             | Type              | Validation / notes |
|-------------------|-------------------|--------------------|
| `id`              | string            | Unique within run: e.g. `${sourceMessageId}` or `${sourceOrder}-q${questionNumber}` |
| `sourceOrder`     | number            | Sort key; matches chat chronology |
| `sourceMessageId` | string            | Traceability to export |
| `questionNumber`  | number \| null    | Parsed from `Вопрос N` when present |
| `roundLabel`      | string \| null    | e.g. “Тур 1” if detected in same block or preceding context |
| `questionText`    | string            | Player-facing prompt; **no** spoiler body, **no** post-answer commentary |
| `hostNotes`       | string \| null    | Host-only instructions stripped from default prompt if captured |
| `expectedAnswers` | string[]          | Official answer lines; empty if unparseable |
| `alternateAccept` | string[]          | Optional “Зачёт” / acceptable variants when parsed |
| `flags`           | string[]          | e.g. `needs_review`, `no_text`, `ambiguous_split` |

**Relationships**: Many `QuizTestCase` rows derive from one export run; each ties to exactly one `sourceMessageId` in v1 (multi-message questions documented as out-of-scope default unless `flags` indicate merge).

## ExtractionSummary

| Field                 | Type     | Description |
|-----------------------|----------|-------------|
| `exportLabel`         | string \| null | Chat title from export header if available |
| `testCaseCount`       | number   | Length of `cases` array |
| `skippedMessageCount` | number   | Non-question messages excluded |
| `flaggedCount`        | number   | Cases with `needs_review` or similar |
| `warnings`            | string[] | Human-readable issues (encoding, missing spoiler close, etc.) |

## ExtractionResult

| Field     | Type                 |
|-----------|----------------------|
| `summary` | ExtractionSummary    |
| `cases`   | QuizTestCase[]       |
