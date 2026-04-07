import type { Bot, Context } from "grammy";
import type { SessionFlavor } from "grammy";
import type { OperatorSession } from "../durable/types.js";
import type { Env } from "../env.js";
import { type ParsedConfig, isOperator } from "../lib/config.js";
import type { PublishTarget } from "../lib/destinations.js";
import { logEvent } from "../lib/log.js";
import { formatPostedByLine } from "../lib/operator-attribution.js";
import { publishQuizRound } from "../lib/publish-round.js";

export interface SessionData {
  op?: OperatorSession;
}

export type OperatorContext = Context & SessionFlavor<SessionData>;

function ensureOp(session: SessionData): OperatorSession {
  if (!session.op) session.op = { step: "idle" };
  return session.op;
}

export function registerOperatorHandlers(
  bot: Bot<OperatorContext>,
  env: Env,
  cfg: ParsedConfig,
): void {
  const token = env.BOT_TOKEN;

  bot.command("start", async (ctx) => {
    await ctx.reply("Bilbo quiz bot. Operators: /newquiz to publish a round.");
  });

  bot.command("newquiz", async (ctx) => {
    if (!ctx.from) return;
    if (!isOperator(ctx.from.id, cfg)) {
      logEvent("operator_rejected", { user_id: ctx.from.id });
      return;
    }
    ctx.session.op = { step: "awaiting_target" };
    await ctx.reply("Which target? Reply `play` or `test`.");
  });

  bot.command("cancel", async (ctx) => {
    if (!ctx.from || !isOperator(ctx.from.id, cfg)) return;
    ctx.session.op = { step: "idle" };
    await ctx.reply("Cancelled. Send /newquiz to start again.");
  });

  bot.command("publish", async (ctx) => {
    if (!ctx.from || !isOperator(ctx.from.id, cfg)) return;
    const op = ctx.session.op;
    if (!op || op.step !== "awaiting_confirm") {
      await ctx.reply("Nothing to publish. Finish /newquiz first.");
      return;
    }
    await runPublish(ctx, env, cfg, token, op);
    ctx.session.op = { step: "idle" };
  });

  bot.chatType("private").on("message:text", async (ctx) => {
    if (!ctx.from || !isOperator(ctx.from.id, cfg)) return;

    const raw = ctx.message.text;
    if (raw.startsWith("/")) return;

    const op = ensureOp(ctx.session);

    switch (op.step) {
      case "idle":
        await ctx.reply("Send /newquiz to publish a quiz.");
        return;

      case "awaiting_target": {
        const t = raw.trim().toLowerCase();
        if (t !== "play" && t !== "test") {
          await ctx.reply("Reply with `play` or `test`.");
          return;
        }
        if (t === "test" && cfg.testChatId === null) {
          await ctx.reply(
            "Test chat is not configured (TEST_CHAT_ID). Use `play` or /cancel.",
          );
          return;
        }
        op.target = t as PublishTarget;
        op.step = "awaiting_question";
        await ctx.reply("Send the question text (one message).");
        return;
      }

      case "awaiting_question":
        op.question = raw.trim();
        op.options = [];
        op.step = "awaiting_options";
        await ctx.reply(
          "Send each answer option as a separate message. When you have at least two options, send /doneoptions.",
        );
        return;

      case "awaiting_options": {
        if (raw.trim() === "/doneoptions") {
          const opts = op.options ?? [];
          if (opts.length < 2) {
            await ctx.reply(
              "Need at least 2 options. Keep sending options, then /doneoptions.",
            );
            return;
          }
          op.step = "awaiting_correct_index";
          await ctx.reply(
            `Which option is correct? Reply with a number 1–${opts.length} (the number shown in the quiz).`,
          );
          return;
        }
        if (!op.options) op.options = [];
        op.options.push(raw.trim());
        await ctx.reply(
          `Saved option ${op.options.length}. Send more lines or /doneoptions.`,
        );
        return;
      }

      case "awaiting_correct_index": {
        const n = Number.parseInt(raw.trim(), 10);
        const opts = op.options ?? [];
        if (!Number.isFinite(n) || n < 1 || n > opts.length) {
          await ctx.reply(`Send a number from 1 to ${opts.length}.`);
          return;
        }
        op.correct_option_index = n - 1;
        op.step = "awaiting_explanation";
        await ctx.reply(
          "Send the explanation text (shown to the winner only).",
        );
        return;
      }

      case "awaiting_explanation":
        op.explanation = raw.trim();
        op.step = "awaiting_confirm";
        await ctx.reply(
          [
            "Ready to publish. Summary:",
            `Target: ${op.target}`,
            `Question: ${op.question}`,
            `Options: ${(op.options ?? []).length}`,
            "",
            "Send /publish to post, or /cancel to abort.",
          ].join("\n"),
        );
        return;

      case "awaiting_confirm":
        await ctx.reply("Send /publish to confirm, or /cancel.");
        return;

      default:
        await ctx.reply("Unexpected state. /cancel and /newquiz.");
    }
  });
}

async function runPublish(
  ctx: OperatorContext,
  env: Env,
  cfg: ParsedConfig,
  token: string,
  op: OperatorSession,
): Promise<void> {
  if (
    !ctx.from ||
    op.target === undefined ||
    !op.question ||
    !op.options ||
    op.correct_option_index === undefined ||
    !op.explanation
  ) {
    await ctx.reply("Incomplete draft. /cancel and start over.");
    return;
  }

  const postedByLine = formatPostedByLine(ctx.from);

  const result = await publishQuizRound({
    env,
    cfg,
    token,
    target: op.target,
    question: op.question,
    options: op.options,
    correctOptionIndex: op.correct_option_index,
    explanation: op.explanation,
    postedByLine,
    operatorUserId: ctx.from.id,
  });

  await ctx.reply(
    [
      "Published.",
      `Round id: ${result.roundId}`,
      `Message id: ${result.quizMessageId}`,
      result.pinFailedMessage ? `Pin warning: ${result.pinFailedMessage}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
