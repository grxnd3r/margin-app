import index from "./index.html";

Bun.serve({
  routes: {
    "/": index,
  },
  // Fallback to serving files from the current directory
  async fetch(req) {
    const url = new URL(req.url);
    const path = "." + url.pathname;
    const file = Bun.file(path);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not Found", { status: 404 });
  },
  development: {
    hmr: true,
  },
  port: 5173,
});

console.log("Dev server running at http://localhost:5173");
