import { describe, expect, it } from "vitest";
import type { ParsedConfig } from "../src/lib/config.js";
import { resolveTargetChatId } from "../src/lib/destinations.js";

function cfg(overrides: Partial<ParsedConfig> = {}): ParsedConfig {
  return {
    playChatId: -100111,
    testChatId: null,
    operatorUserIds: new Set([1]),
    successReactionEmoji: "🎉",
    ...overrides,
  };
}

describe("resolveTargetChatId (US2 / FR-002a)", () => {
  it("resolves play to PLAY_CHAT_ID", () => {
    expect(resolveTargetChatId("play", cfg())).toBe(-100111);
  });

  it("throws when test chosen but TEST_CHAT_ID unset", () => {
    expect(() =>
      resolveTargetChatId("test", cfg({ testChatId: null })),
    ).toThrow(/TEST_CHAT_ID is not configured/);
  });

  it("resolves test when configured", () => {
    expect(resolveTargetChatId("test", cfg({ testChatId: -100222 }))).toBe(
      -100222,
    );
  });
});
