// Servidor HTTP local para probar la PWA
// Ejecutar: node serve.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
    const ext = path.extname(filePath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Servidor listo en http://localhost:${PORT}`);
    console.log(`📲 En tu móvil: http://<IP-del-PC>:${PORT}`);
  });
