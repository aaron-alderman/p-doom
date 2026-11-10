import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "./build.mjs";

const output = await build();
const routes = new Map([
  ["/", ["index.html", "text/html"]],
  ["/style.css", ["style.css", "text/css"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/dossier.json", ["dossier.json", "application/json"]],
]);
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const isArtwork = /^\/art\/[a-z-]+\.jpg$/u.test(pathname);
  const route = routes.get(pathname) ?? (isArtwork ? [pathname.slice(1), "image/jpeg"] : null);
  if (!route || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(404).end("Not found");
    return;
  }
  const [name, type] = route;
  try {
    const bytes = await readFile(new URL(name, output));
    response.writeHead(200, {
      "Content-Type": isArtwork ? type : `${type}; charset=utf-8`,
      "Content-Security-Policy": "default-src 'self'; object-src 'none'; base-uri 'none'",
      "X-Content-Type-Options": "nosniff",
    }).end(request.method === "HEAD" ? undefined : bytes);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Preview artifact unavailable");
  }
});
server.listen(Number(process.env.PDOOM_PORT ?? 4199), "127.0.0.1", () =>
  console.log(`p(doom) Encounter · http://127.0.0.1:${server.address().port}/`));
