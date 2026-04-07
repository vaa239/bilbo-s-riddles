# Feature Specification: Derive quiz test cases from chat export

**Feature Branch**: `002-derive-tests-from-questions`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Create test cases from questions in a Telegram chat export; use only question content, not comments or commentary."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Produce test cases from an exported chat (Priority: P1)

A quiz maintainer has a chat history export that contains many messages, including numbered quiz questions mixed with announcements, thanks, links, and discussion. They provide that export and receive a clean set of **test cases**—one per real quiz question—with the wording a player would see, so they can review or load the material into a quiz workflow without manually copying each item.

**Why this priority**: This is the core outcome: turning raw chat history into usable quiz items.

**Independent Test**: Given a representative export file, the maintainer obtains a list of test cases whose count matches the number of distinct quiz questions in the source, and each case contains at least the visible question text.

**Acceptance Scenarios**:

1. **Given** an export that contains clearly marked quiz questions (e.g. labeled by number or round) among other messages, **When** the maintainer runs the extraction, **Then** every such quiz question becomes exactly one test case and non-question messages (service notices, editor thanks, link-only round indexes, empty or off-topic chatter) do not become test cases.
2. **Given** a quiz message that includes both a question and a hidden or separate block with the official answer, **When** extraction runs, **Then** the test case stores the question text separately from the expected answer (when an answer is present in the source), so the question can be shown to players without revealing the answer.
3. **Given** a message that is not a quiz question (for example credits, editorial notes, or replies that only discuss a question), **When** extraction runs, **Then** that message does not generate a test case.

---

### User Story 2 - Omit commentary and “comment” lines from each question (Priority: P2)

The maintainer wants **only the question as posed**, not the long explanation that often follows the answer in the same message (host commentary, sources, statistics, or “read aloud before answer” notes). Those parts must not appear in the primary question field of the test case.

**Why this priority**: Without this, pasted content is noisy and unsuitable as a player-facing prompt.

**Independent Test**: For a sample where the source bundles question + answer + commentary together, the extracted question field contains only the prompt text through the end of the task (e.g. before the answer section), and commentary does not appear in that field.

**Acceptance Scenarios**:

1. **Given** a message whose structure separates “what to ask” from “answer and commentary,” **When** extraction runs, **Then** the test case’s question field excludes commentary and source citations that belong to the explanation, not the task.
2. **Given** inline instructions meant for the host (e.g. to read a note before revealing the answer), **When** extraction runs, **Then** those host-only instructions are either omitted from the player-facing question field or clearly isolated so they can be excluded from what players see (maintainer’s chosen policy documented in assumptions).

---

### User Story 3 - Stable ordering and traceability (Priority: P3)

The maintainer needs to map each test case back to the source (round, number, or message order) so they can fix mistakes or compare with the original chat.

**Why this priority**: Supports audit and manual correction without re-reading the entire export.

**Independent Test**: Each test case includes enough ordering or source reference (e.g. sequence index, round label if present, question number if present) to sort cases the same way as in the chat and to find the originating message.

**Acceptance Scenarios**:

1. **Given** questions appear in chronological order in the export, **When** results are produced, **Then** test cases can be sorted into the same relative order.
2. **Given** the export labels rounds or question numbers, **When** results are produced, **Then** those labels are preserved on the corresponding test cases where they exist in the source.

---

### Edge Cases

- Export contains images or files referenced by a question but no text: system should either skip, flag as incomplete, or surface a clear warning—not silently invent text.
- Duplicate or near-duplicate questions (reposts): avoid double-counting or document deterministic deduplication (e.g. by message position).
- Questions split across multiple messages: define whether the system merges them into one test case or treats them as separate (default: merge only when clearly one numbered item continued in the next message).
- Mixed languages and special markup in the source: question text should remain readable; encoding issues should be reported rather than corrupted.
- Very large exports: processing completes without requiring the maintainer to split the file manually (within reasonable desktop expectations for file sizes typical of chat exports).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept a chat history export in the same bundled form the chat application provides (e.g. archive containing a main message document and related assets).
- **FR-002**: The system MUST identify messages that represent quiz questions versus messages that are metadata, discussion, gratitude, round indexes, or other non-question content, and MUST only create test cases from quiz questions.
- **FR-003**: Each test case MUST include the full player-facing task text for that question, excluding post-answer commentary, sources, and statistics when those are structurally separable from the prompt in the source.
- **FR-004**: When the source provides an official expected answer (including alternate acceptable phrasings where explicitly marked), the system MUST capture them in dedicated field(s) separate from the question text.
- **FR-005**: The system MUST output test cases in a structured form suitable for human review and for downstream import into a quiz (exact file format is left to planning; the spec requires clarity of fields, not a specific technology).
- **FR-006**: The system MUST preserve chronological order and any explicit round or question numbering present in the source on each test case.
- **FR-007**: The system MUST report a summary after extraction: count of test cases produced, and counts or lists of skipped messages or items flagged as ambiguous, so the maintainer can validate coverage.
- **FR-008**: When the system cannot reliably separate question from commentary for a given message, it MUST flag that item for manual review rather than silently mixing commentary into the question field.

### Key Entities

- **Chat export bundle**: The user-supplied archive and its contents representing one chat’s history.
- **Source message**: A single logical message in that history (may contain text, links, or references to media).
- **Quiz question message**: A message identified as posing one numbered or delimited quiz task to players.
- **Test case**: A record with at least a question prompt, optional expected answer(s), optional host-only notes (if retained separately), and traceability metadata (order, round, number).
- **Extraction summary**: Aggregate statistics and warnings from a run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a fixed sample export agreed during planning, at least 95% of manually counted quiz questions in the chat appear as test cases with no spurious extra cases from obvious non-question messages.
- **SC-002**: For at least 90% of test cases in that sample, a reviewer agrees that the question field contains no answer commentary or source blocks that belong after the answer in the source layout.
- **SC-003**: A maintainer can go from “exported zip on disk” to “reviewable list of all extracted test cases” in one step, without hand-editing the export file first.
- **SC-004**: The extraction summary always states how many test cases were emitted and whether any items need manual review; zero silent failures where items are dropped without mention.

## Assumptions

- The primary reference input is a Telegram Desktop–style HTML export packaged with assets, as in the project’s sample archive; other export formats are out of scope unless added later.
- “Comments” means both (a) non-question chat messages and (b) explanatory commentary bundled with a question after the official answer in the same message; both should be excluded from the primary question text (with (b) in answer/explanation fields only if the product owner wants explanations stored—default is to keep answer separate and omit long commentary from player-facing text).
- Host-only lines (e.g. instructions to read something before the answer) are not shown to players in the default question field; they may be omitted or stored in a separate optional field.
- Test cases are for content preparation (authoring/import), not for real-time play in this feature’s scope.
- The maintainer reads Russian (and possibly English) text in exports; no translation is required.
