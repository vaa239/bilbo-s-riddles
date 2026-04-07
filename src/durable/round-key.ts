/** Stable map key for `(chat_id, quiz_message_id)` (FR-010 isolation). */
export function roundStoreKey(chatId: number, quizMessageId: number): string {
  return `${chatId}:${quizMessageId}`;
}
