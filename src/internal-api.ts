import { z } from "zod";
import type { Env } from "./env.js";
import { getParsedConfig } from "./lib/config.js";
import { doListOpenRounds } from "./lib/do-client.js";
import { publishQuizRound } from "./lib/publish-round.js";

const publishBodySchema = z
  .object({
    target: z.enum(["play", "test"]),
    question_text: z.string().min(1).max(8000),
    options: z.array(z.string().min(1).max(2000)).min(2).max(20),
    correct_option_index: z.number().int().min(0),
    explanation_text: z.string().min(1).max(8000),
    posted_by_line: z.string().min(1).max(300),
    operator_user_id: z.number().int(),
  })
  .superRefine((data, ctx) => {
    if (data.correct_option_index >= data.options.length) {
      ctx.addIssue({
        code: "custom",
        message: "correct_option_index out of range",
        path: ["correct_option_index"],
      });
    }
  });

function unauthorized(): Response {
  return new Response("Unauthorized", { status: 401 });
}

function checkInternalSecret(request: Request, env: Env): boolean {
  const secret = env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length).trim();
  return token === secret;
}

export async function handleInternalApi(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);

  if (!env.INTERNAL_API_SECRET?.trim()) {
    return Response.json(
      { error: "internal_api_not_configured" },
      { status: 503 },
    );
  }

  if (!checkInternalSecret(request, env)) {
    return unauthorized();
  }

  let cfg: ReturnType<typeof getParsedConfig>;
  try {
    cfg = getParsedConfig(env);
  } catch {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  if (url.pathname === "/api/internal/publish" && request.method === "POST") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }
    const parsed = publishBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "validation_error", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const d = parsed.data;
    try {
      const result = await publishQuizRound({
        env,
        cfg,
        token: env.BOT_TOKEN,
        target: d.target,
        question: d.question_text,
        options: d.options,
        correctOptionIndex: d.correct_option_index,
        explanation: d.explanation_text,
        postedByLine: d.posted_by_line,
        operatorUserId: d.operator_user_id,
      });
      return Response.json({
        round_id: result.roundId,
        quiz_message_id: result.quizMessageId,
        chat_id: result.chatId,
        pin_failed_message: result.pinFailedMessage ?? null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json(
        { error: "publish_failed", message: msg },
        { status: 500 },
      );
    }
  }

  if (
    url.pathname === "/api/internal/open-rounds" &&
    request.method === "GET"
  ) {
    try {
      const rounds = await doListOpenRounds(env);
      return Response.json({ rounds });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json(
        { error: "list_failed", message: msg },
        { status: 500 },
      );
    }
  }

  return new Response("Not found", { status: 404 });
}
