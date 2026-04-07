import { Bot, session } from "grammy";
import { webhookCallback } from "grammy/web";
import type { Env } from "./env.js";
import { handleGroupMessage } from "./handlers/groups.js";
import {
  type OperatorContext,
  type SessionData,
  registerOperatorHandlers,
} from "./handlers/operator.js";
import { getParsedConfig } from "./lib/config.js";
import { createGrammySessionStorage } from "./lib/session-storage.js";

export function createWebhookHandler(
  env: Env,
): (request: Request) => Promise<Response> {
  try {
    const cfg = getParsedConfig(env);

    const bot = new Bot<OperatorContext>(env.BOT_TOKEN);

    bot.use(
      session({
        initial: (): SessionData => ({}),
        getSessionKey: (ctx) => (ctx.chat ? String(ctx.chat.id) : undefined),
        storage: createGrammySessionStorage(env),
      }),
    );

    registerOperatorHandlers(bot, env, cfg);

    bot.chatType(["group", "supergroup"]).on("message:text", async (ctx) => {
      await handleGroupMessage(ctx, env, cfg);
    });

    return webhookCallback(bot, "cloudflare-mod", {
      secretToken: env.WEBHOOK_SECRET,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return async () =>
      Response.json({ error: "misconfigured", message }, { status: 500 });
  }
}
