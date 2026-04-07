/**
 * Build audience-visible quiz text (FR-008, FR-008a).
 * postedByLine is appended as the final line (attribution only).
 */
export function formatQuizMessage(
  question: string,
  options: string[],
  postedByLine: string,
): string {
  const lines: string[] = [question.trim(), ""];
  for (let i = 0; i < options.length; i++) {
    lines.push(`${i + 1}. ${options[i].trim()}`);
  }
  lines.push("", postedByLine.trim());
  return lines.join("\n");
}
