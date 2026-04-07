# Data Model: Telegram quiz bot

## Entity: QuizRound

| Field | Type | Description |
|-------|------|-------------|
| `round_id` | `str` (UUID) | Internal stable id for logging and locks |
| `target` | `TargetKind` enum | `PLAY` or `TEST` |
| `chat_id` | `int` | Telegram chat id where the quiz was published |
| `quiz_message_id` | `int` | Message id of the public quiz post |
| `question_text` | `str` | Stem shown to players |
| `options` | `list[str]` | Ordered choices (display only) |
| `correct_answer_text` | `str` | Text derived from the correct option; used after normalization |
| `explanation_text` | `str` | Shown as reply to winner only |
| `posted_by_line` | `str` | Exact attribution line appended as the **last line** of the public quiz message (FR-008a); derived from Telegram `User` in DM flow or from payload / MCP |
| `status` | enum | `OPEN` \| `WON` |
| `won_by_message_id` | `int \| None` | Participant message that first won (optional, for idempotency) |

**Validation**:

- `options` length ≥ 2.
- Correct option index valid at creation time; store resolved `correct_answer_text` immutably for comparison.

**Relationships**:

- One `QuizRound` per published quiz message.
- `RoundStore` (Durable Object) indexes open rounds by `(chat_id, quiz_message_id)` for reply routing.

## Entity: Published quiz message (Telegram)

Not stored as a separate row—`quiz_message_id` + `chat_id` reference Telegram’s message. Pin state is **derived**: `OPEN` ⇒ should be pinned; `WON` ⇒ should be unpinned (idempotent unpin OK).

## Entity: Participant attempt (transient)

| Field | Type | Description |
|-------|------|-------------|
| `chat_id` | `int` | Same as round |
| `participant_message_id` | `int` | Reply message id |
| `reply_to_message_id` | `int` | Must equal `quiz_message_id` of some open round |
| `text` | `str` | Raw answer text |

Processed once per handler invocation; not persisted after handling.

## State transitions: QuizRound

```text
[Created] → OPEN (after post + pin succeeds)
OPEN → WON (on first successful normalized match)
WON → (terminal)
```

**Side effects on transition to WON**:

1. `set_message_reaction` on participant message.
2. `reply` with explanation to participant message.
3. `unpin_chat_message` for `quiz_message_id` in `chat_id`.

## RoundStore (implementation: Durable Object)

**Chosen platform**: **Cloudflare Durable Object** (e.g. class `QuizCoordinator`), single **DO instance** per bot, holding an in-memory structure keyed by `(chat_id, quiz_message_id)`.

**Responsibilities**:

- `registerRound(round)` after successful `sendMessage` + `pinChatMessage`.
- `getOpenRoundByQuizMessage(chat_id, quiz_message_id) -> QuizRound | null`.
- `tryCloseRound(...)`: compare normalized text; **first** successful close wins (DO serializes concurrent requests).

**Scope**: All keys include `chat_id` so test and play chats never cross (FR-010).

**Note**: Plain **Worker** global variables are **not** authoritative—only DO state (and optional `state.storage` persistence) counts.

## Configuration (environment / Wrangler)

| Name | Required | Purpose |
|------|----------|---------|
| `BOT_TOKEN` | yes | Telegram bot token (secret) |
| `WEBHOOK_SECRET` | yes | Must match Telegram `secret_token` for webhook verification |
| `PLAY_CHAT_ID` | yes | Supergroup id for live play |
| `TEST_CHAT_ID` | no | If unset, test target unavailable |
| `OPERATOR_USER_IDS` | yes | Comma-separated ids allowed to run publish flow |
| `SUCCESS_REACTION_EMOJI` | no | Default `🎉` |
