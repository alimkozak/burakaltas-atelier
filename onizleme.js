/* ==========================================================================
   BURAK ALTAŞ ATELIER — Uzaktan önizleme
   Çalıştırma:  "Burak'a Önizleme.bat" dosyasına çift tıklayın
                (ya da terminalde:  node onizleme.js)

   Siteyi bu bilgisayardan geçici bir https linkiyle paylaşır (Cloudflare Tunnel,
   hesap gerekmez). Admin panelinde kaydettiğiniz her şey linkte anında görünür.
   Yalnızca sitenin kendisi paylaşılır: admin paneli, yedekler, notlar ve
   betikler dışarıdan açılamaz. Pencereyi kapatınca link çalışmaz olur.
   ========================================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const tunnel = require("./tunnel.js");

const ROOT = __dirname;
const PORT = Number(process.env.PREVIEW_PORT) || 5700;
const HOST = "127.0.0.1";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm" };

// Same files that go into the "yayin" folder — nothing else is reachable
const isPublic = (rel) =>
  /^[\w-]+\.html$/.test(rel) || /^assets\/[\w\-./]+$/.test(rel) || ["favicon.svg", "apple-touch-icon.png", "site.webmanifest", "robots.txt", "sitemap.xml"].includes(rel);

function serve(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); } catch { res.writeHead(400); return res.end(); }
  if (rel === "") rel = "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  const headers = {
    // Changes saved in the admin panel must show up on Burak's phone at once
    "Cache-Control": "no-cache",
    // A temporary address — the real site at the domain is the one search engines should list
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };
  const notFound = () => fs.readFile(path.join(ROOT, "404.html"), (e, b) => { res.writeHead(404, { ...headers, "Content-Type": TYPES[".html"] }); res.end(e ? "Bulunamadı" : b); });
  if (!file.startsWith(ROOT + path.sep) || rel.split("/").some((p) => p.startsWith(".")) || !isPublic(rel)) return notFound();

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound();
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    // Videos are fetched in byte ranges (Safari on iPhone requires it)
    const m = type.startsWith("video/") && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m) {
      let a = m[1] === "" ? st.size - Number(m[2]) : Number(m[1]);
      const b = m[1] === "" || m[2] === "" ? st.size - 1 : Math.min(Number(m[2]), st.size - 1);
      if (a < 0) a = 0;
      if (a > b || a >= st.size) { res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...headers, "Content-Type": type, "Content-Length": b - a + 1, "Content-Range": `bytes ${a}-${b}/${st.size}`, "Accept-Ranges": "bytes" });
      return req.method === "HEAD" ? res.end() : fs.createReadStream(file, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { ...headers, "Content-Type": type, "Content-Length": st.size, "Accept-Ranges": "bytes" });
    req.method === "HEAD" ? res.end() : fs.createReadStream(file).pipe(res);
  });
}

function startTunnel() {
  tunnel.startTunnel(PORT, (url) => {
    tunnel.copy(url);
    console.log(`
  ┌──────────────────────────────────────────────────────────────┐
     Burak'a gönderilecek link (panoya kopyalandı, yapıştırın):

     ${url}

     Türkçe açmak için:  ${url}/?lang=tr
  └──────────────────────────────────────────────────────────────┘
  • Link bu pencere açık kaldığı sürece çalışır. Her açılışta yeni link verilir.
  • Admin panelinde kaydettiğiniz değişiklikler linkte anında görünür
    (Burak sayfayı yenilesin).
  • Kapatmak için bu pencereyi kapatın (ya da Ctrl+C).
`);
  });
}

// Model pages, sitemap etc. are not kept in Git — make sure they exist and are current
try { require("./build.js").build(); } catch (e) { console.log(`\n  ! Sayfalar üretilemedi: ${e.message}\n`); }

const server = http.createServer((req, res) => { try { serve(req, res); } catch { res.writeHead(500); res.end(); } });
server.listen(PORT, HOST, () => {
  console.log(`\n  Burak Altaş Atelier — Uzaktan önizleme\n  Bu bilgisayarda: http://localhost:${PORT}\n`);
  if (!process.env.NO_TUNNEL) startTunnel();
});
server.on("error", (e) => {
  if (e.code === "EADDRINUSE") console.log(`\n  Önizleme zaten açık görünüyor (port ${PORT}). Açık olan pencereye bakın.\n`);
  else console.error(e);
  process.exit(1);
});
