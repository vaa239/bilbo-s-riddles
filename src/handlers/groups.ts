import type { Context } from "grammy";
import type { Env } from "../env.js";
import type { ParsedConfig } from "../lib/config.js";
import { isQuizChat } from "../lib/config.js";
import { doTryCloseRound } from "../lib/do-client.js";
import { logEvent } from "../lib/log.js";
import { normalizeAnswer } from "../lib/normalize.js";
import { callTelegramMethod } from "../lib/telegram.js";

export async function handleGroupMessage(
  ctx: Context,
  env: Env,
  cfg: ParsedConfig,
): Promise<void> {
  const msg = ctx.message;
  if (!msg || !ctx.chat) return;

  const chatId = ctx.chat.id;
  if (!isQuizChat(chatId, cfg)) return;

  const replyTo = msg.reply_to_message;
  if (!replyTo) return;

  const text = msg.text;
  if (text === undefined || text.trim() === "") return;

  const participantMessageId = msg.message_id;
  const quizMessageId = replyTo.message_id;
  const guessNorm = normalizeAnswer(text);

  const result = await doTryCloseRound(env, {
    chat_id: chatId,
    quiz_message_id: quizMessageId,
    participant_message_id: participantMessageId,
    answer_normalized: guessNorm,
  });

  if (result.outcome === "no_round" || result.outcome === "wrong_answer") {
    return;
  }

  if (result.outcome === "already_won") {
    logEvent("answer_after_won", {
      chat_id: chatId,
      quiz_message_id: quizMessageId,
    });
    return;
  }

  const round = result.round;
  const token = env.BOT_TOKEN;
  const emoji = cfg.successReactionEmoji;

  logEvent("round_won", {
    round_id: round.round_id,
    chat_id: chatId,
    quiz_message_id: quizMessageId,
    winner_message_id: participantMessageId,
  });

  await callTelegramMethod(
    "setMessageReaction",
    {
      chat_id: chatId,
      message_id: participantMessageId,
      reaction: [{ type: "emoji", emoji }],
    },
    token,
  );

  await callTelegramMethod(
    "sendMessage",
    {
      chat_id: chatId,
      text: round.explanation_text,
      reply_parameters: { message_id: participantMessageId },
    },
    token,
  );

  await callTelegramMethod(
    "unpinChatMessage",
    { chat_id: chatId, message_id: quizMessageId },
    token,
  );
}
