import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env.js";
import { roundStoreKey } from "./round-key.js";
import type { QuizRoundRecord } from "./types.js";

export class QuizCoordinator extends DurableObject<Env> {
  private rounds = new Map<string, QuizRoundRecord>();
  private sessions = new Map<string, unknown>();

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/session/read" && request.method === "POST") {
        const { key } = (await request.json()) as { key: string };
        return Response.json({ value: this.sessions.get(key) ?? null });
      }
      if (path === "/session/write" && request.method === "POST") {
        const { key, value } = (await request.json()) as {
          key: string;
          value: unknown;
        };
        this.sessions.set(key, value);
        return Response.json({ ok: true });
      }
      if (path === "/session/delete" && request.method === "POST") {
        const { key } = (await request.json()) as { key: string };
        this.sessions.delete(key);
        return Response.json({ ok: true });
      }

      if (path === "/round/register" && request.method === "POST") {
        const round = (await request.json()) as QuizRoundRecord;
        const key = roundStoreKey(round.chat_id, round.quiz_message_id);
        this.rounds.set(key, round);
        return Response.json({ ok: true });
      }

      if (path === "/round/get" && request.method === "POST") {
        const { chat_id, quiz_message_id } = (await request.json()) as {
          chat_id: number;
          quiz_message_id: number;
        };
        const r =
          this.rounds.get(roundStoreKey(chat_id, quiz_message_id)) ?? null;
        return Response.json({ round: r });
      }

      if (path === "/round/list-open" && request.method === "POST") {
        const rounds = [...this.rounds.values()].filter(
          (x) => x.status === "OPEN",
        );
        return Response.json({ rounds });
      }

      if (path === "/round/try-close" && request.method === "POST") {
        const body = (await request.json()) as {
          chat_id: number;
          quiz_message_id: number;
          participant_message_id: number;
          answer_normalized: string;
        };
        const key = roundStoreKey(body.chat_id, body.quiz_message_id);
        const round = this.rounds.get(key);
        if (!round) {
          return Response.json({ outcome: "no_round" } as const);
        }
        if (round.status === "WON") {
          return Response.json({ outcome: "already_won" } as const);
        }
        if (body.answer_normalized !== round.correct_answer_normalized) {
          return Response.json({ outcome: "wrong_answer" } as const);
        }
        const updated: QuizRoundRecord = {
          ...round,
          status: "WON",
          won_by_message_id: body.participant_message_id,
        };
        this.rounds.set(key, updated);
        return Response.json({ outcome: "won", round: updated } as const);
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ error: msg }, { status: 500 });
    }
  }
}
