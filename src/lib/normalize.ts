/**
 * Answer normalization for FR-005 / US4 (see specs/research.md).
 *
 * Steps:
 * 1. NFC Unicode normalization.
 * 2. Trim and collapse internal whitespace to single spaces.
 * 3. Case-fold using default locale lowercasing (`toLowerCase()`); Latin-heavy quizzes;
 *    full Unicode linguistic case-folding is a documented limitation for v1.
 * 4. Replace runs of punctuation / symbols (not letters, numbers, or ASCII apostrophe)
 *    with a single space so `bilbo,baggins` and `bilbo baggins` match.
 * 5. Strip apostrophes (English contractions → one token).
 * 6. Collapse whitespace.
 *
 * Limits: Does not strip combining marks separately after NFC; emoji-only answers
 * normalize to empty. Surrogate pairs and rare scripts depend on `\p{L}\p{N}` support
 * in the Workers runtime (Unicode property escapes).
 */
export function normalizeAnswer(text: string): string {
  if (!text) return "";
  let s = text.normalize("NFC").trim().toLowerCase();
  s = s.replace(/[^\p{L}\p{N}']+/gu, " ");
  s = s.replace(/'/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
