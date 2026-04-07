# Telegram handler contracts

## In scope updates

The bot MUST register handlers only for:

| Source | Update type | Condition | Action |
|--------|-------------|-----------|--------|
| Private chat | `Message` | `from_user.id` ∈ `OPERATOR_USER_IDS` and command/state for publish FSM | Drive quiz creation; never forward draft to play/test until confirmed |
| Supergroup / group | `Message` | `chat.id` ∈ {`PLAY_CHAT_ID`, `TEST_CHAT_ID`} and `reply_to_message` present | Attempt scoring path |
| Supergroup / group | `Message` | same chats, no `reply_to_message` | No scoring; optional ignore (no public error) |

## Scoring handler contract

**Preconditions**:

- `message.chat.id` equals round’s `chat_id`.
- `message.reply_to_message` is not None.
- `message.reply_to_message.message_id` equals an **OPEN** round’s `quiz_message_id` in that chat.

**Input**: `message.text` or `message.caption` (if quiz accepts media later—v1 text only); empty ⇒ no-op per spec.

**Output** (on match):

- Reaction on `message.message_id`.
- Reply to `message.message_id` with explanation.
- Unpin quiz message; mark round `WON`.

**Output** (on non-match): no user-visible reply required; no unpin.

## Public quiz message body

`send_message.text` MUST be built from: question, all numbered/list options (fair presentation, FR-008), then a **final line** that attributes the round to the publishing operator (FR-008a). That line MUST be excluded from answer normalization and MUST NOT contain the explanation or correct-option hint.

## Pin contract

After `send_message` returns `message_id` in target chat:

1. Call `pin_chat_message(chat_id, message_id)`.
2. On `TelegramBadRequest` or permission error: notify operator in DM with error text; still register round only if product decision is to keep open round without pin—**default**: register round so answers still work; log pin failure.

## Idempotency

Closing a `WON` round: second correct reply MUST NOT unpin again or duplicate explanation (optional short acknowledgment allowed per spec).
