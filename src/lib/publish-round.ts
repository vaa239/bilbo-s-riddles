import type { QuizRoundRecord } from "../durable/types.js";
import type { Env } from "../env.js";
import type { ParsedConfig } from "./config.js";
import type { PublishTarget } from "./destinations.js";
import { resolveTargetChatId } from "./destinations.js";
import { doRegisterRound } from "./do-client.js";
import { formatQuizMessage } from "./formatters.js";
import { logEvent } from "./log.js";
import { normalizeAnswer } from "./normalize.js";
import { TelegramApiError, callTelegramMethod } from "./telegram.js";

export interface PublishInput {
  env: Env;
  cfg: ParsedConfig;
  token: string;
  target: PublishTarget;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  postedByLine: string;
  operatorUserId: number;
}

export interface PublishResult {
  quizMessageId: number;
  chatId: number;
  roundId: string;
  pinFailedMessage?: string;
}

export async function publishQuizRound(
  input: PublishInput,
): Promise<PublishResult> {
  const { env, cfg, token } = input;
  const chatId = resolveTargetChatId(input.target, cfg);
  const text = formatQuizMessage(
    input.question,
    input.options,
    input.postedByLine,
  );
  const correctText = input.options[input.correctOptionIndex]?.trim() ?? "";
  const correctNorm = normalizeAnswer(correctText);

  const sendResult = (await callTelegramMethod(
    "sendMessage",
    { chat_id: chatId, text, disable_web_page_preview: true },
    token,
  )) as { message_id: number };

  const quizMessageId = sendResult.message_id;
  let pinFailedMessage: string | undefined;

  try {
    await callTelegramMethod(
      "pinChatMessage",
      {
        chat_id: chatId,
        message_id: quizMessageId,
        disable_notification: true,
      },
      token,
    );
  } catch (e) {
    const msg =
      e instanceof TelegramApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    pinFailedMessage = msg;
    logEvent("pin_failed", {
      chat_id: chatId,
      quiz_message_id: quizMessageId,
      operator_user_id: input.operatorUserId,
    });
    try {
      await callTelegramMethod(
        "sendMessage",
        {
          chat_id: input.operatorUserId,
          text: `Could not pin the quiz message in the target chat: ${msg}`,
        },
        token,
      );
    } catch (_dmErr) {
      logEvent("pin_failure_dm_failed", {
        operator_user_id: input.operatorUserId,
      });
    }
  }

  const roundId = crypto.randomUUID();
  const round: QuizRoundRecord = {
    round_id: roundId,
    target: input.target === "play" ? "PLAY" : "TEST",
    chat_id: chatId,
    quiz_message_id: quizMessageId,
    question_text: input.question,
    options: input.options,
    correct_answer_normalized: correctNorm,
    explanation_text: input.explanation,
    posted_by_line: input.postedByLine,
    status: "OPEN",
    won_by_message_id: null,
  };

  await doRegisterRound(env, round);

  logEvent("round_registered", {
    round_id: roundId,
    chat_id: chatId,
    quiz_message_id: quizMessageId,
    target: input.target,
  });

  return { quizMessageId, chatId, roundId, pinFailedMessage };
}
