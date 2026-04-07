/**
 * Worker + Durable Object shared env shape (Wrangler bindings + vars).
 */
export interface Env {
  QUIZ_COORDINATOR: DurableObjectNamespace;
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  PLAY_CHAT_ID: string;
  TEST_CHAT_ID?: string;
  OPERATOR_USER_IDS: string;
  SUCCESS_REACTION_EMOJI?: string;
  INTERNAL_API_SECRET?: string;
  APP_VERSION?: string;
  GIT_SHA?: string;
}
