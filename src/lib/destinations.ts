import type { ParsedConfig } from "./config.js";

export type PublishTarget = "play" | "test";

export function resolveTargetChatId(
  target: PublishTarget,
  cfg: ParsedConfig,
): number {
  if (target === "play") return cfg.playChatId;
  if (cfg.testChatId === null) {
    throw new Error(
      "TEST_CHAT_ID is not configured; cannot publish to test chat",
    );
  }
  return cfg.testChatId;
}
