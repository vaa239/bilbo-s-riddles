import { describe, expect, it } from "vitest";

/**
 * Realistic Telegram `Update` for private message `/newquiz` (constitution III).
 * Shape mirrors Bot API `Update` + `Message` (no invented top-level fields).
 */
const privateNewQuizUpdate = {
  update_id: 100_001,
  message: {
    message_id: 12,
    from: {
      id: 99_001,
      is_bot: false,
      first_name: "Operator",
      username: "op_user",
    },
    chat: {
      id: 99_001,
      first_name: "Operator",
      username: "op_user",
      type: "private",
    },
    date: 1_700_000_000,
    text: "/newquiz",
    entities: [{ offset: 0, length: 8, type: "bot_command" }],
  },
} as const;

describe("Telegram Update fixtures", () => {
  it("private /newquiz update has expected structure", () => {
    expect(privateNewQuizUpdate.message?.chat.type).toBe("private");
    expect(privateNewQuizUpdate.message?.text).toBe("/newquiz");
    expect(privateNewQuizUpdate.message?.from?.id).toBe(99_001);
  });
});
