import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readCompanyState,
  recordDecision,
  runAssignedTask,
  runMorningResearch,
  vaultInfo,
} from "./research.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = path.join(PROJECT_ROOT, "web");
const PORT = Number(process.env.AI_COMPANY_PORT || 4173);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const target = path.resolve(WEB_ROOT, relative);
  if (!target.startsWith(`${WEB_ROOT}${path.sep}`) && target !== WEB_ROOT) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not Found");
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (request.method === "GET" && url.pathname === "/api/company-state") {
      sendJson(response, 200, await readCompanyState());
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/morning-run") {
      const body = await readJson(request);
      sendJson(response, 200, await runMorningResearch({ force: Boolean(body.force) }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/approval") {
      sendJson(response, 200, await recordDecision(await readJson(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/task") {
      sendJson(response, 200, await runAssignedTask(await readJson(request)));
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Local server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`YURIM AI COMPANY local console: http://localhost:${PORT}`);
  console.log(`Obsidian vault: ${vaultInfo.root}`);
  runMorningResearch().catch((error) => {
    console.error(`Morning research failed: ${error.message}`);
  });
});

const hourlyCheck = setInterval(() => {
  runMorningResearch().catch((error) => {
    console.error(`Scheduled research failed: ${error.message}`);
  });
}, 60 * 60 * 1000);

function shutdown() {
  clearInterval(hourlyCheck);
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
