#!/usr/bin/env npx tsx
import { createServer } from "node:http";
import { CharlieMcpHttpHandler } from "@jbcbdse/charlie-mcp-server";
import { createPool } from "./store.ts";
import {
  CompareTranslationsTool,
  GetCommentaryTool,
  ListWorksTool,
  LookupPassageTool,
  SearchTool,
} from "./tools.ts";

const PORT = Number(process.env.MCP_PORT ?? 8787);
const HOST = "127.0.0.1";

const pool = createPool();
const tools = [
  new ListWorksTool(pool),
  new LookupPassageTool(pool),
  new CompareTranslationsTool(pool),
  new SearchTool(pool),
  new GetCommentaryTool(pool),
];

const mcpHandler = new CharlieMcpHttpHandler({
  name: "bible-rag",
  version: "0.1.0",
  tools,
});

const server = createServer((req, res) => {
  const path = req.url?.split("?")[0];
  if (path === "/mcp") return void mcpHandler.handle(req, res);
  res.writeHead(404).end();
});

server.listen(PORT, HOST, () => {
  console.log(`bible-rag MCP at http://${HOST}:${PORT}/mcp`);
});

const shutdown = async () => {
  server.close();
  await mcpHandler.close();
  await pool.end();
  process.exit(0);
};
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
