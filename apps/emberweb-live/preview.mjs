import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(appRoot, "dist");
const routes = new Map([
  ["/", "index.html"],
  ["/work", "work.html"],
  ["/packages", "packages.html"],
  ["/audit", "audit.html"],
  ["/process", "process.html"],
  ["/industries", "industries.html"],
  ["/care", "care.html"],
  ["/start", "start.html"],
  ["/policies", "policies.html"],
]);
const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

const server = http.createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  const target = routes.get(pathname) || pathname.replace(/^\/+/, "");
  const filePath = path.resolve(outputDirectory, target);
  if (!filePath.startsWith(outputDirectory + path.sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const details = await stat(filePath);
    if (!details.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": types.get(path.extname(filePath)) || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => {
  process.stdout.write("EmberWeb preview: http://127.0.0.1:" + port + "\n");
});
