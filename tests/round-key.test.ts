import { describe, expect, it } from "vitest";
import { roundStoreKey } from "../src/durable/round-key.js";

describe("roundStoreKey (FR-010 isolation)", () => {
  it("differs when chat_id differs for same quiz_message_id", () => {
    const a = roundStoreKey(-1001, 42);
    const b = roundStoreKey(-1002, 42);
    expect(a).not.toBe(b);
  });

  it("differs when quiz_message_id differs in same chat", () => {
    expect(roundStoreKey(-1001, 1)).not.toBe(roundStoreKey(-1001, 2));
  });
});
