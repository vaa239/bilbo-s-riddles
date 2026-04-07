# Feature Specification: Telegram quiz bot

**Feature Branch**: `001-telegram-quiz-bot`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Telegram bot for quiz questions: operator provides question, all answer options, and an explanation comment. Bot publishes the quiz to a designated channel (fixed for now; choosing that destination must be isolated for later change). Participants reply; bot compares replies to the correct answer using normalized text (case-insensitive, tolerant of punctuation and spacing). On a correct reply: add a positive emoji reaction and post the explanation comment in reply to the participant. Pin the quiz message immediately after posting; unpin when the question is resolved by a correct answer."

## Clarifications

### Session 2026-04-07

- Q: Can multiple quiz rounds be open at the same time? → A: Yes; several questions may run in parallel.
- Q: Where does play happen? → A: The bot is added to a **group chat** (or supergroup) shared by a small set of players (and the operator), not only a one-way broadcast channel.
- Q: When several quizzes are open in the same chat, which quiz message should be pinned (only one pin allowed)? → A: **Superseded** — product owner confirms the chat **supports multiple pins at once**; no need to pick a single “winning” pin.
- Q: Pin behavior with several open quizzes? → A: **Each** quiz message is **pinned immediately** after it is posted and stays pinned **until that specific round** is resolved by a correct answer, then **only that** message is unpinned. Other open quizzes’ pins are unaffected.
- Q: Should there be a separate space for trying quizzes safely? → A: Yes — an optional **test chat** (dedicated team test space) alongside the real **play chat**; the operator chooses which target each publish uses.
- Q: Where is the bot hosted? → A: **Cloudflare Workers** with **Telegram webhooks**; round state in a **Durable Object** (see `docs/architecture.md` and `plan.md`).
- Q: Should the public quiz message show who posted the question? → A: Yes — the **last line** of the audience-visible quiz message MUST attribute the question to the **Telegram operator** who published it (display name and/or @username per Telegram’s usual visibility rules).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish live quizzes (possibly several at once) (Priority: P1)

A quiz operator supplies a question, the full set of answer choices shown to players, which choice is correct, and a short explanation tied to the correct answer. For each publish, the operator chooses whether the quiz goes to the **play chat** (real group with players) or the **test chat** (team-only rehearsal space). The bot posts one clear quiz message in the selected chat; the **final line** identifies the posting operator using their **Telegram-visible** identity (so players see who ran that round). The operator may repeat this while other quizzes are still open (including parallel rounds in the same or different targets). Immediately after each post, the bot **pins that quiz’s message**, which may coexist with other pinned quiz messages while those rounds stay open.

**Why this priority**: Without reliable posts, per-question pins, and a safe test space, operators cannot rehearse or run real games confidently.

**Independent Test**: Publish two quizzes without answering either; confirm both messages exist, replies can target each, and **both** quiz messages are pinned (when the platform allows).

**Acceptance Scenarios**:

1. **Given** a configured play chat and an authorized operator, **When** the operator submits a complete quiz aimed at **play chat** (question, all options, correct option, explanation), **Then** the bot posts one quiz message in the play chat that includes the question and all listed options, and **ends with a line** attributing the question to that operator’s Telegram identity.
2. **Given** a quiz message was just posted, **When** the post completes, **Then** that quiz message is pinned without removing pins for other still-open quizzes (subject to platform permissions).
3. **Given** at least one quiz is already open, **When** the operator publishes another full quiz, **Then** a second distinct quiz message exists and open rounds are tracked independently.
4. **Given** a configured **test chat** and an authorized operator, **When** the operator submits a complete quiz aimed at **test chat**, **Then** the bot posts the quiz only in the test chat (not the play chat) and the same pin, reply, scoring, and unpin rules apply there as for play chat.

---

### User Story 2 - Rehearse in the test chat (Priority: P2)

The team uses a **test chat** as a sandbox: operators run full quiz flows (post, pin, threaded answers, reactions, explanations, unpin) without disturbing the main play group. Behavior in test chat matches play chat so what is validated there is representative.

**Why this priority**: Reduces risk of broken or embarrassing posts in front of real players.

**Independent Test**: Run an end-to-end quiz entirely inside the test chat with no messages required in the play chat; confirm full lifecycle works.

**Acceptance Scenarios**:

1. **Given** test chat is configured, **When** the operator targets **test chat** for a new quiz, **Then** no quiz content from that action appears in the play chat unless the operator separately publishes there.
2. **Given** quizzes are open in **both** test chat and play chat, **When** participants reply on the correct threads, **Then** each attempt is scored only against rounds in **that same chat** (no cross-chat round matching).

---

### User Story 3 - Correct answer closes the right round (Priority: P2)

A participant uses the messaging app’s **reply** (or equivalent thread anchor) on **the specific quiz message** they are answering and sends text containing their answer. The bot maps that reply to exactly one open round, compares normalized text to that round’s correct answer, and only then applies outcomes for **that** round. When a reply matches, the bot reacts to **that participant message** with the success emoji, posts the explanation as a reply to **that** participant message, and **unpins only that round’s quiz message**, leaving other open quizzes’ pins unchanged.

**Why this priority**: Parallel quizzes are unusable without unambiguous attribution of each attempt to one round.

**Independent Test**: With two open quizzes, reply to each message with correct and incorrect answers and verify scoring, explanations, and pins stay isolated per round.

**Acceptance Scenarios**:

1. **Given** two open quizzes with different correct answers, **When** a participant replies **to quiz message A** with text that normalizes to A’s correct answer, **Then** only round A is marked won, only A’s explanation is posted, A’s quiz message is unpinned, and B’s quiz message **stays pinned** if B is still open.
2. **Given** an open quiz, **When** a participant sends a message in the chat **without** replying to that quiz’s post, **Then** the bot does not treat it as an attempt for that round (and does not reveal explanations or change pins for that round).
3. **Given** an open quiz, **When** a participant replies to the quiz message with text that does not normalize to the correct answer, **Then** the bot does not mark the round won for that attempt and does **not** unpin that quiz message.

---

### User Story 4 - Messy typing still counts when it is the same answer (Priority: P3)

Participants type with different casing, extra spaces, or surrounding punctuation. The bot’s comparison step ignores case differences and collapses or strips “special” characters and spacing according to a single documented normalization rule so equivalent answers are treated as matches, **within the round implied by their reply target**.

**Why this priority**: Reduces frustration and disputes without requiring exact typing.

**Independent Test**: For a chosen round, submit variants of the correct answer (different case, extra punctuation, doubled spaces) and confirm they all win that round; submit clearly wrong text and confirm they do not.

**Acceptance Scenarios**:

1. **Given** the correct answer for a round is stored as canonical text, **When** a participant’s **threaded** reply differs only by letter case from the correct answer, **Then** the bot evaluates it as correct for that round.
2. **Given** the correct answer for a round is stored as canonical text, **When** a participant’s **threaded** reply differs only by common punctuation or spacing around the same words, **Then** the bot evaluates it as correct for that round.

---

### Edge Cases

- Two participants send correct answers **to the same quiz** nearly at the same time: the first valid correct reply the bot processes wins that round; later correct replies on that thread may still receive lightweight positive acknowledgment without re-opening that round’s pin state.
- **Parallel rounds:** Each round’s lifecycle (open → won) and **pin state** are independent; resolving one quiz does not unpin other open quizzes.
- **Test vs play:** Rounds in the test chat never interact with rounds in the play chat (separate message threads and state).
- **Test chat unset:** If no test chat is configured, the operator cannot target test chat; only play chat (or whatever single target exists) is available until configuration is added.
- **Non-threaded messages:** Treated as not belonging to any round for scoring (see User Story 3).
- Empty, extremely long, or non-text replies on a quiz thread: ignored for scoring; do not close the round.
- Bot lacks permission to pin or unpin: operator receives a visible failure when a pin change is required; the quiz may still be posted but pin state may be inconsistent until permissions are fixed.
- Operator floods many open quizzes: performance and readability are bounded by normal small-group use (see assumptions); extreme volumes are out of scope for v1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a trusted quiz operator to submit, for each round: the question text, the ordered list of all answer options shown to players, an indicator of which option is correct, and explanation text to reveal after a correct answer.
- **FR-002**: The system MUST resolve **at least one** publish destination (the **play chat**: the real group where players participate) and **MAY** resolve a second destination (**test chat**: a dedicated team test space) through the same dedicated configuration mechanism. Changing these targets MUST NOT require changes to quiz wording, normalization, or scoring logic.
- **FR-002a**: For each publish, the operator MUST be able to choose **play chat** or **test chat** (when test chat is configured). The system MUST deliver the quiz message only to the selected target.
- **FR-003**: After each successful quiz post, the system MUST **pin that round’s quiz message** immediately. Multiple open rounds MAY each have their own message pinned at the same time, per product assumption (supported chat / client behavior).
- **FR-004**: The system MUST attribute each participant attempt to **at most one** open round by requiring a **reply** (or platform-equivalent thread anchor) to that round’s published quiz message; attempts not tied to a quiz message MUST NOT score or close a round.
- **FR-005**: The system MUST normalize both the participant’s reply text and the stored correct answer for **that round** using the same rules before comparison (case-insensitive; punctuation and spacing normalized so equivalent strings match).
- **FR-006**: On the first processed correct reply **for a given round**, the system MUST add a visible positive emoji reaction to that participant’s message, post the stored explanation as a reply threaded to that participant’s message, mark that round closed, and **unpin only that round’s quiz message** (other rounds’ pins unchanged).
- **FR-007**: Until a round receives a processed correct reply, the system MUST keep that round **open**; incorrect threaded replies MUST NOT post the explanation or close the round.
- **FR-008**: The system MUST NOT expose which option is correct in the audience message beyond listing all options fairly (no hidden marking for players).
- **FR-008a**: The audience-visible quiz message MUST include as its **last line** (after the question and all options) a short attribution of **who posted the question**, using the publishing operator’s Telegram-visible identity (e.g. display name and/or @username when available). That line MUST NOT reveal the correct option or explanation.
- **FR-009**: The system MUST support **multiple open rounds at the same time** in the **same target chat** (play or test), each with its own published message and answer state.
- **FR-010**: The system MUST keep round state **scoped per chat**: a reply in the test chat MUST only match rounds published in the test chat, and likewise for the play chat.

### Key Entities

- **Quiz round**: One question, displayed options, designated correct answer text (from the chosen option), explanation text, link to the published quiz message, open/closed state, ordering metadata for options, association to the **target chat** (play or test) where it was published, and the **operator attribution** string used on the last line of the public post.
- **Published quiz message**: The audience-visible post for one round (question, options, then final attribution line per FR-008a); has its own pin lifecycle (pinned while open, unpinned when that round is won).
- **Participant attempt**: A single message that replies to exactly one quiz post, evaluated against that round’s correct answer after normalization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a moderated test with **two** concurrent open quizzes, 100% of correct replies threaded to the proper quiz message close **only** that round within 10 seconds under normal conditions, **unpinning only that round’s quiz** while the other stays pinned if still open.
- **SC-002**: For at least 10 prepared answer variants differing only by case, spacing, or common punctuation, participants are judged correct at least 95% of the time when those variants are semantically the same as the correct answer (allowing for explicitly documented normalization limits).
- **SC-003**: When the first correct reply for a round is processed, 100% of observed rounds in testing show the success emoji on the winning reply and the explanation in the same conversational thread within 10 seconds under normal conditions.
- **SC-004**: Operators report (via checklist sign-off) that changing **play chat** or **test chat** identifiers requires touching only the dedicated destination resolution, not quiz wording or answer-checking behavior.
- **SC-006**: With test chat configured, 100% of dry-run quizzes directed to test chat in a scripted test appear **only** in test chat, with no duplicate post in play chat for that action.
- **SC-005**: In testing, **non-threaded** guesses in the group never change round state or pins for any open quiz (100% of scripted negative cases).
- **SC-007**: In testing, 100% of published quiz messages in play or test chat show, as their **last non-empty line**, text that matches the configured attribution for the operator who published that round (and does not contain the explanation or correct-answer leak).

## Assumptions

- Telegram is the hosting platform; the **play chat** is a **group or supergroup** with a **small** number of human players suitable for casual quiz play (not large public superchannels unless later specified). The **test chat** is a separate group or supergroup used **only** as the team’s rehearsal space (may overlap membership with play chat or be operator-only, per team preference).
- The operator is trusted; there is no multi-tenant quiz authoring UI in this specification’s scope.
- **Threaded replies** to the quiz post are the primary, required way to submit an answer for scoring.
- Explanation text is shown only after a correct answer on the correct thread, as specified.
- Emoji choice is fixed per deployment (single success emoji) unless a later feature adds configuration.
- The play environment is assumed to allow **several pinned quiz messages at once** while multiple rounds are open; if a deployment uses a client or chat mode that does not, that is an integration constraint for planning, not a change to per-round pin/unpin intent.
