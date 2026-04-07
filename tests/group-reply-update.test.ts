import { describe, expect, it } from "vitest";

/** Supergroup threaded reply (for scoring handler contract). */
const supergroupReplyUpdate = {
  update_id: 100_002,
  message: {
    message_id: 55,
    from: {
      id: 88_002,
      is_bot: false,
      first_name: "Player",
    },
    chat: {
      id: -100_123_456_789,
      title: "Quiz group",
      type: "supergroup",
    },
    date: 1_700_000_100,
    text: "my answer",
    reply_to_message: {
      message_id: 50,
      from: { id: 7_000_000_000, is_bot: true, first_name: "BilboBot" },
      chat: {
        id: -100_123_456_789,
        title: "Quiz group",
        type: "supergroup",
      },
      date: 1_700_000_050,
      text: "1. What has roots…",
    },
  },
} as const;

describe("Telegram group reply fixture", () => {
  it("has reply_to_message for quiz thread", () => {
    expect(supergroupReplyUpdate.message.reply_to_message?.message_id).toBe(50);
    expect(supergroupReplyUpdate.message.chat.type).toBe("supergroup");
  });
});
