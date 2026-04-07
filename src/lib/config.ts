import type { Env } from "../env.js";

const DEFAULT_REACTION = "🎉";

export interface ParsedConfig {
  playChatId: number;
  testChatId: number | null;
  operatorUserIds: Set<number>;
  successReactionEmoji: string;
}

function parseTelegramId(raw: string, name: string): number {
  const n = Number(raw.trim());
  if (!Number.isFinite(n)) {
    throw new Error(
      `Invalid ${name}: expected finite number, got ${JSON.stringify(raw)}`,
    );
  }
  return n;
}

export function parseOperatorIds(raw: string): Set<number> {
  const ids = new Set<number>();
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    ids.add(parseTelegramId(t, "OPERATOR_USER_IDS entry"));
  }
  if (ids.size === 0) {
    throw new Error(
      "OPERATOR_USER_IDS must list at least one Telegram user id",
    );
  }
  return ids;
}

export function getParsedConfig(env: Env): ParsedConfig {
  return {
    playChatId: parseTelegramId(env.PLAY_CHAT_ID, "PLAY_CHAT_ID"),
    testChatId: env.TEST_CHAT_ID?.trim()
      ? parseTelegramId(env.TEST_CHAT_ID, "TEST_CHAT_ID")
      : null,
    operatorUserIds: parseOperatorIds(env.OPERATOR_USER_IDS),
    successReactionEmoji:
      env.SUCCESS_REACTION_EMOJI?.trim() || DEFAULT_REACTION,
  };
}

export function isOperator(userId: number, cfg: ParsedConfig): boolean {
  return cfg.operatorUserIds.has(userId);
}

export function isQuizChat(chatId: number, cfg: ParsedConfig): boolean {
  if (chatId === cfg.playChatId) return true;
  if (cfg.testChatId !== null && chatId === cfg.testChatId) return true;
  return false;
}
