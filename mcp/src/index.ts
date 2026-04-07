/**
 * stdio MCP server: tools call the deployed Worker over HTTPS (no Telegram token here).
 * Env: WORKER_URL (no trailing slash), INTERNAL_API_SECRET (Bearer; must match Worker secret).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";

function workerBase(): string {
  const raw = process.env.WORKER_URL?.trim();
  if (!raw) throw new Error("WORKER_URL is required");
  return raw.replace(/\/$/, "");
}

function bearer(): string {
  const s = process.env.INTERNAL_API_SECRET?.trim();
  if (!s) throw new Error("INTERNAL_API_SECRET is required");
  return s;
}

const publishQuizSchema = {
  target: z.enum(["play", "test"]),
  question_text: z.string().min(1).max(8000),
  options: z.array(z.string().min(1).max(2000)).min(2).max(20),
  correct_option_index: z.number().int().min(0),
  explanation_text: z.string().min(1).max(8000),
  posted_by_line: z
    .string()
    .min(1)
    .max(300)
    .describe(
      "Last line of the public quiz post (operator attribution); required for MCP.",
    ),
  operator_user_id: z
    .number()
    .int()
    .describe("Telegram user id of the operator owning this publish."),
};

const server = new McpServer({
  name: "bilbo-riddles",
  version: "0.1.0",
});

server.registerTool(
  "publish_quiz",
  {
    description:
      "POST /api/internal/publish — creates a quiz round in play or test chat (posts + pins + DO register). Side effects: public Telegram messages.",
    inputSchema: publishQuizSchema,
  },
  async (args) => {
    const base = workerBase();
    const res = await fetch(`${base}/api/internal/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer()}`,
      },
      body: JSON.stringify(args),
    });
    const text = await res.text();
    return {
      content: [{ type: "text" as const, text: `HTTP ${res.status}\n${text}` }],
    };
  },
);

server.registerTool(
  "list_open_rounds",
  {
    description:
      "GET /api/internal/open-rounds — returns OPEN rounds from the Durable Object. Requires same Bearer as Worker INTERNAL_API_SECRET.",
    inputSchema: z.object({}),
  },
  async () => {
    const base = workerBase();
    const res = await fetch(`${base}/api/internal/open-rounds`, {
      headers: { Authorization: `Bearer ${bearer()}` },
    });
    const text = await res.text();
    return {
      content: [{ type: "text" as const, text: `HTTP ${res.status}\n${text}` }],
    };
  },
);

server.registerTool(
  "health",
  {
    description:
      "GET /api/health — deploy smoke JSON (version, git_sha). No auth.",
    inputSchema: z.object({}),
  },
  async () => {
    const base = workerBase();
    const res = await fetch(`${base}/api/health`);
    const text = await res.text();
    return {
      content: [{ type: "text" as const, text: `HTTP ${res.status}\n${text}` }],
    };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
