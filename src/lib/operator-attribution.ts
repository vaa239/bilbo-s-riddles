import type { User } from "grammy/types";

/**
 * Telegram-visible attribution for the last line of the public quiz post (FR-008a).
 */
export function formatPostedByLine(user: User): string {
  if (user.username?.trim()) {
    return `— Quiz by @${user.username.trim()}`;
  }
  const name = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (name) return `— Quiz by ${name}`;
  return "— Quiz by operator";
}
