import type { QuizRoundRecord } from "../durable/types.js";
import type { Env } from "../env.js";

const DO_BASE = "https://quiz-coordinator.internal";

function coordinatorStub(env: Env) {
  const id = env.QUIZ_COORDINATOR.idFromName("singleton");
  return env.QUIZ_COORDINATOR.get(id);
}

export async function doRegisterRound(
  env: Env,
  round: QuizRoundRecord,
): Promise<void> {
  const stub = coordinatorStub(env);
  const res = await stub.fetch(`${DO_BASE}/round/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(round),
  });
  if (!res.ok) {
    throw new Error(`DO register failed: ${res.status} ${await res.text()}`);
  }
}

export async function doGetOpenRound(
  env: Env,
  chatId: number,
  quizMessageId: number,
): Promise<QuizRoundRecord | null> {
  const stub = coordinatorStub(env);
  const res = await stub.fetch(`${DO_BASE}/round/get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, quiz_message_id: quizMessageId }),
  });
  if (!res.ok) {
    throw new Error(`DO get failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { round: QuizRoundRecord | null };
  return data.round;
}

export type TryCloseResult =
  | { outcome: "no_round" }
  | { outcome: "wrong_answer" }
  | { outcome: "won"; round: QuizRoundRecord }
  | { outcome: "already_won" };

export async function doTryCloseRound(
  env: Env,
  input: {
    chat_id: number;
    quiz_message_id: number;
    participant_message_id: number;
    answer_normalized: string;
  },
): Promise<TryCloseResult> {
  const stub = coordinatorStub(env);
  const res = await stub.fetch(`${DO_BASE}/round/try-close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`DO try-close failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TryCloseResult;
}

export async function doSessionRead(env: Env, key: string): Promise<unknown> {
  const stub = coordinatorStub(env);
  const res = await stub.fetch(`${DO_BASE}/session/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error(`DO session read failed: ${res.status}`);
  const data = (await res.json()) as { value: unknown };
  return data.value ?? null;
}

export async function doSessionWrite(
  env: Env,
  key: string,
  value: unknown,
): Promise<void> {
  const stub = coordinatorStub(env);
  const res = await stub.fetch(`${DO_BASE}/session/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error(`DO session write failed: ${res.status}`);
}

export async function doSessionDelete(env: Env, key: string): Promise<void> {
  const stub = coordinatorStub(env);
  const res = await stub.fetch(`${DO_BASE}/session/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error(`DO session delete failed: ${res.status}`);
}

export async function doListOpenRounds(env: Env): Promise<QuizRoundRecord[]> {
  const stub = coordinatorStub(env);
  const res = await stub.fetch(`${DO_BASE}/round/list-open`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`DO list-open failed: ${res.status}`);
  const data = (await res.json()) as { rounds: QuizRoundRecord[] };
  return data.rounds;
}
