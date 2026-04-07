import type { StorageAdapter } from "grammy";
import type { Env } from "../env.js";
import type { SessionData } from "../handlers/operator.js";
import { doSessionDelete, doSessionRead, doSessionWrite } from "./do-client.js";

export function createGrammySessionStorage(
  env: Env,
): StorageAdapter<SessionData> {
  return {
    async read(key: string) {
      const v = await doSessionRead(env, `grammy:${key}`);
      return (v as SessionData) ?? undefined;
    },
    async write(key: string, value: SessionData) {
      await doSessionWrite(env, `grammy:${key}`, value);
    },
    async delete(key: string) {
      await doSessionDelete(env, `grammy:${key}`);
    },
  };
}
