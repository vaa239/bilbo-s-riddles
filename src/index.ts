import { QuizCoordinator } from "./durable/quiz-coordinator.js";
import type { Env } from "./env.js";
import { handleInternalApi } from "./internal-api.js";
import { createWebhookHandler } from "./webhook.js";

export { QuizCoordinator };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return Response.json({
        version: env.APP_VERSION ?? "dev",
        git_sha: env.GIT_SHA ?? null,
      });
    }

    if (url.pathname.startsWith("/api/internal/")) {
      return handleInternalApi(request, env);
    }

    if (url.pathname === "/webhook" && request.method === "POST") {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (secret !== env.WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
      const handle = createWebhookHandler(env);
      return handle(request);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
