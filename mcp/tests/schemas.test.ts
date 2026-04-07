import { describe, expect, it } from "vitest";
import * as z from "zod";

const publishQuizShape = {
  target: z.enum(["play", "test"]),
  question_text: z.string().min(1).max(8000),
  options: z.array(z.string().min(1).max(2000)).min(2).max(20),
  correct_option_index: z.number().int().min(0),
  explanation_text: z.string().min(1).max(8000),
  posted_by_line: z.string().min(1).max(300),
  operator_user_id: z.number().int(),
};

const publishQuiz = z.object(publishQuizShape).superRefine((data, ctx) => {
  if (data.correct_option_index >= data.options.length) {
    ctx.addIssue({
      code: "custom",
      message: "correct_option_index out of range",
      path: ["correct_option_index"],
    });
  }
});

describe("MCP publish_quiz Zod (T036)", () => {
  it("rejects when correct_option_index is out of range", () => {
    const r = publishQuiz.safeParse({
      target: "play",
      question_text: "Q",
      options: ["a", "b"],
      correct_option_index: 2,
      explanation_text: "e",
      posted_by_line: "— Quiz by @x",
      operator_user_id: 1,
    });
    expect(r.success).toBe(false);
  });

  it("accepts a minimal valid payload", () => {
    const r = publishQuiz.safeParse({
      target: "play",
      question_text: "Q",
      options: ["a", "b"],
      correct_option_index: 1,
      explanation_text: "e",
      posted_by_line: "— Quiz by @x",
      operator_user_id: 1,
    });
    expect(r.success).toBe(true);
  });
});
