export class TelegramApiError extends Error {
  constructor(
    message: string,
    readonly method: string,
    readonly errorCode?: number,
    readonly parameters?: { retry_after?: number },
  ) {
    super(message);
    this.name = "TelegramApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Calls Telegram Bot API with JSON body. Retries on 429 using retry_after (T038).
 */
export async function callTelegramMethod(
  method: string,
  body: Record<string, unknown>,
  token: string,
): Promise<unknown> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      ok: boolean;
      result?: unknown;
      description?: string;
      error_code?: number;
      parameters?: { retry_after?: number };
    };

    if (data.ok) return data.result;

    if (
      data.error_code === 429 &&
      data.parameters?.retry_after &&
      attempt < maxAttempts - 1
    ) {
      await sleep((data.parameters.retry_after + 0.5) * 1000);
      continue;
    }

    throw new TelegramApiError(
      data.description || `Telegram API error for ${method}`,
      method,
      data.error_code,
      data.parameters,
    );
  }

  throw new TelegramApiError("Telegram API max retries exceeded", method);
}
