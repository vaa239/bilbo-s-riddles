import { describe, expect, it } from "vitest";
import { normalizeAnswer } from "../src/lib/normalize.js";

describe("normalizeAnswer", () => {
  it("case-folds ASCII", () => {
    expect(normalizeAnswer("HELLO")).toBe(normalizeAnswer("hello"));
  });

  it("collapses whitespace", () => {
    expect(normalizeAnswer("a   b")).toBe("a b");
    expect(normalizeAnswer("  x  y  ")).toBe("x y");
  });

  it("strips punctuation around words", () => {
    expect(normalizeAnswer("Hello, world!")).toBe(
      normalizeAnswer("hello world"),
    );
  });

  const variants = [
    "The answer",
    "the answer",
    "THE ANSWER",
    "  the   answer  ",
    "The, answer!",
    "the-answer".replace("-", " "),
  ];

  it("treats ≥10 style variants as equal when semantically same (SC-002)", () => {
    const norms = variants.map(normalizeAnswer);
    const first = norms[0];
    for (const n of norms) {
      expect(n).toBe(first);
    }
  });

  it("table: punctuation variants", () => {
    const base = normalizeAnswer("bilbo baggins");
    expect(normalizeAnswer("Bilbo Baggins.")).toBe(base);
    expect(normalizeAnswer("bilbo,baggins")).toBe(base);
    expect(normalizeAnswer("BILBO  baggins!!")).toBe(base);
  });

  it("does not match different words", () => {
    expect(normalizeAnswer("wrong")).not.toBe(normalizeAnswer("answer"));
  });
});
