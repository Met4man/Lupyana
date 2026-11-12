import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon"
};

http
  .createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.join(root, pathname);

    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        fs.readFile(path.join(root, "404.html"), (notFoundError, notFoundData) => {
          response.end(notFoundError ? "Not found" : notFoundData);
        });
        return;
      }
      response.writeHead(200, {
        "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      response.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`Lupyana Polyclinic preview: http://localhost:${port}`);

    const addresses = Object.values(os.networkInterfaces())
      .flat()
      .filter((entry) => entry && (entry.family === "IPv4" || entry.family === 4) && !entry.internal)
      .map((entry) => entry.address);

    addresses.forEach((address) => {
      console.log(`Open on a phone on the same Wi-Fi: http://${address}:${port}`);
    });
  });
