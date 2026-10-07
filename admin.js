/* ==========================================================================
   BURAK ALTAŞ ATELIER — Admin paneli sunucusu
   Çalıştırma:  "Admin Paneli.bat" dosyasına çift tıklayın
                (ya da terminalde:  node admin.js)
   Panel:       http://localhost:5600/admin
   Site önizleme: http://localhost:5600/
   Yalnızca bu bilgisayardan erişilebilir; internete açılmaz.
   ========================================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
// build.js (and build-tr.js) are re-read on every use, so a panel left open for days still
// publishes with the latest site code after an update from Git
const fresh = () => {
  for (const m of ["./build.js", "./build-tr.js"]) delete require.cache[require.resolve(m)];
  return require("./build.js");
};
const build = (...a) => fresh().build(...a);
const loadSite = (...a) => fresh().loadSite(...a);
const refreshRates = (...a) => fresh().refreshRates(...a);

const crypto = require("crypto");
const ROOT = __dirname;
// REMOTE=1 ("Burak'a Admin Paneli.bat"): opens the panel to the internet through a temporary
// Cloudflare link, behind a password. It runs on its own port, so the local panel can stay open too.
const REMOTE = !!process.env.REMOTE;
const PORT = Number(process.env.PORT) || (REMOTE ? 5601 : 5600);
const HOST = "127.0.0.1";
const IMG_DIR = path.join(ROOT, "assets", "img", "uploads");
const VID_DIR = path.join(ROOT, "assets", "video", "uploads");
const MAX_BODY = 40 * 1024 * 1024;
const MAX_VIDEO = 150 * 1024 * 1024;

const TYPES = { ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };

/* ---------- Writing the data files ---------- */
const HEADER = `/* ==========================================================================
   KATALOG VERİSİ — Admin panelinden yönetilir:
   "Admin Paneli.bat" → http://localhost:5600/admin
   (Elle de düzenleyebilirsiniz; kaydettikten sonra: node build.js)
   images: kendi fotoğraflarınız "assets/img/…" yolu ile, örnek görseller Unsplash ID'si ile.
   silhouette: ballgown | aline | mermaid | column | mini
   neckline:   strapless | sweetheart | offshoulder | square | halter | vneck | highneck
   features:   pearls | feathers | lace | slit | detachable | sleeves | corset | train | gloves | beading
   ========================================================================== */
`;
function writeAtomic(file, text) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}
function backup(file) {
  const dir = path.join(ROOT, ".yedek");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, path.join(dir, `${path.basename(file)}.${stamp}`));
  // keep the 30 most recent backups per file
  const old = fs.readdirSync(dir).filter((f) => f.startsWith(path.basename(file) + ".")).sort().reverse().slice(30);
  old.forEach((f) => fs.unlinkSync(path.join(dir, f)));
}
const js = (v) => JSON.stringify(v, null, 2);
function writeData(W) {
  const file = path.join(ROOT, "assets/js/data.js");
  backup(file);
  writeAtomic(file, `${HEADER}
window.COLLECTIONS = ${js(W.COLLECTIONS)};

window.GOWNS = ${js(W.GOWNS)};

/* Atölye ve hikâye görselleri */
window.MEDIA = ${js(W.MEDIA)};

/* Gelin yorumları */
window.REVIEWS = ${js(W.REVIEWS)};

/* Tasarımcı sayfası (designer.html). Boş alanlar sitede görünmez. */
window.DESIGNER = ${js(W.DESIGNER)};
`);
}
function writeConfig(S) {
  const file = path.join(ROOT, "assets/js/config.js");
  backup(file);
  const q = (v) => JSON.stringify(v ?? "");
  writeAtomic(file, `/* ==========================================================================
   BURAK ALTAŞ ATELIER — SİTE AYARLARI
   Admin panelinin "Ayarlar" sekmesinden düzenlenir (elle de düzenlenebilir).
   ========================================================================== */
window.SITE = {
  brand: ${q(S.brand)},
  // WhatsApp numarası: ülke kodu ile, + ve boşluk OLMADAN
  whatsapp: ${q(S.whatsapp)},
  phoneDisplay: ${q(S.phoneDisplay)},
  email: ${q(S.email)},
  instagram: ${q(S.instagram)},
  instagramHandle: ${q(S.instagramHandle)},
  // Yeni açılacak influencer hesabı
  instagramStudio: ${q(S.instagramStudio)},
  etsyShop: ${q(S.etsyShop)},
  mapsUrl: ${q(S.mapsUrl)},
  city: ${q(S.city)},
  address: ${q(S.address)},
  hours: ${JSON.stringify(S.hours || { en: "", tr: "" })},
  // Fiyatları sitede göstermek için true, gizlemek için false
  showPrices: ${S.showPrices ? "true" : "false"},
  // Kişiselleştirme ücretleri (USD). null = sitede ücret gösterme, 0 = "ücretsiz", sayı = "+$X"
  extras: ${js(cleanExtras(S.extras || {})).replace(/\n/g, "\n  ")},
  currency: ${q(S.currency || "USD")},
  // Form gönderimi için (isteğe bağlı) formspree.io form ID'si. Boşsa form WhatsApp'a yönlenir.
  formspreeId: ${q(S.formspreeId)},
  // Üretim süresi (hafta) — "Yetişir mi?" hesaplayıcısı bunu kullanır
  production: ${JSON.stringify(S.production)},
  // ONLINE PROVA RANDEVULARI
  // calcomUser boşken site kendi talep sistemini kullanır (seçilen saat WhatsApp'a gelir).
  // Cal.com kullanıcı adınızı yazınca takvim siteye gömülür.
  appointments: ${js(S.appointments).replace(/\n/g, "\n  ")},
  // CANLI SOHBET (Tawk.to — ücretsiz). Boşsa sitede yalnızca WhatsApp butonu görünür.
  // tawk.to › Administration › Chat Widget › embed kodundaki adres: https://embed.tawk.to/PROPERTY_ID/WIDGET_ID
  chat: ${js(S.chat || { tawkPropertyId: "", tawkWidgetId: "default", tawkWidgetTr: "" }).replace(/\n/g, "\n  ")},
  // ZİYARETÇİ İSTATİSTİKLERİ (Cloudflare Web Analytics — ücretsiz, çerezsiz). Boşsa kapalı.
  analytics: ${js(S.analytics || { cloudflareToken: "" }).replace(/\n/g, "\n  ")},
  // Sitenin yayınlanacağı alan adı (SEO ve paylaşım bağlantıları için)
  domain: ${q(S.domain)}
};
`);
}

/* ---------- Small helpers ---------- */
const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on("data", (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error("Dosya çok büyük")); req.destroy(); } else chunks.push(c); });
  req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch (e) { reject(e); } });
  req.on("error", reject);
});
const slug = (s) => String(s || "").toLocaleLowerCase("tr")
  .replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" }[c]))
  .normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40) || "foto";

/* ---------- Validation of what the panel sends ---------- */
const VOCAB = {
  silhouette: ["ballgown", "aline", "mermaid", "column", "mini"],
  neckline: ["strapless", "sweetheart", "offshoulder", "square", "halter", "vneck", "highneck"],
  features: ["pearls", "feathers", "lace", "slit", "detachable", "sleeves", "corset", "train", "gloves", "beading"]
};
const str = (v, max = 4000) => String(v ?? "").slice(0, max);
const bi = (o, max) => ({ en: str(o && o.en, max), tr: str(o && o.tr, max) });
const imgRef = (v) => { const s = str(v, 500); return /^(assets\/[\w\-./]+|[\w-]+|https:\/\/[^\s"'<>]+)$/.test(s) && !s.includes("..") ? s : null; };
function cleanGown(g, collections) {
  const id = slug(g.id || g.name);
  if (!str(g.name).trim()) throw new Error("Model adı boş olamaz");
  if (!collections.some((c) => c.id === g.collection)) throw new Error(`Bilinmeyen koleksiyon: ${g.collection}`);
  if (!VOCAB.silhouette.includes(g.silhouette)) throw new Error("Siluet seçin");
  const images = (g.images || []).map(imgRef).filter(Boolean);
  if (!images.length) throw new Error(`"${g.name}" için en az bir fotoğraf gerekli`);
  const w = Array.isArray(g.weeks) ? g.weeks.map(Number) : [8, 12];
  return {
    id, no: str(g.no, 20), name: str(g.name, 60).trim(), collection: g.collection,
    meaning: bi(g.meaning, 120),
    silhouette: g.silhouette,
    neckline: VOCAB.neckline.includes(g.neckline) ? g.neckline : "strapless",
    features: [...new Set(g.features || [])].filter((f) => VOCAB.features.includes(f)),
    fabric: bi(g.fabric, 200), hours: Math.max(0, Number(g.hours) || 0), price: Math.max(0, Number(g.price) || 0),
    weeks: [Math.max(1, w[0] || 8), Math.max(1, w[1] || w[0] || 12)],
    etsy: /^https:\/\/(www\.)?(etsy\.com|etsy\.me)\//.test(str(g.etsy)) ? str(g.etsy, 500) : "",
    images, story: bi(g.story, 1200), ...(g.featured ? { featured: true } : {}),
    // Not made yet: the photos are sketches / renders and the gown is sewn for the first bride who orders it
    ...(g.concept ? { concept: true } : {}),
    // Draft (e.g. imported from Instagram, not reviewed yet): kept in the panel, never shown on the site
    ...(g.draft ? { draft: true } : {}),
    // A short clip of the gown in motion: uploaded file + a poster frame taken from it
    ...(g.video && /^assets\/video\/uploads\/[\w-]+\.(mp4|webm)$/.test(str(g.video.src, 300)) && imgRef(g.video.poster)
      ? { video: { src: g.video.src, poster: imgRef(g.video.poster), date: /^\d{4}-\d{2}-\d{2}$/.test(str(g.video.date, 10)) ? g.video.date : new Date().toISOString().slice(0, 10), ...(Number(g.video.seconds) > 0 ? { seconds: Math.round(Number(g.video.seconds)) } : {}) } } : {}),
    // The model wearing the sample in the photos — helps brides judge fit remotely
    ...((Number(g.model && g.model.height) > 0 || str(g.model && g.model.size).trim())
      ? { model: { height: Math.min(230, Math.max(0, Math.round(Number(g.model.height) || 0))), size: str(g.model.size, 24).trim() } } : {})
  };
}
const EXTRA_KEYS = ["colour", "sleevesLong", "sleevesDetachable", "trainShorter", "trainCathedral"];
// Empty = don't show a price for that option; 0 = "free"; a number = "+$X"
const cleanExtras = (o = {}) => Object.fromEntries(EXTRA_KEYS.map((k) => {
  const v = o[k];
  return [k, v === "" || v === null || v === undefined || !Number.isFinite(+v) ? null : Math.max(0, Math.round(+v))];
}));

/* ---------- Two people editing at once ----------
   Every save carries the version of the file it was based on. If someone else saved in the
   meantime, the save is refused instead of silently overwriting their work. */
const hashFile = (rel) => { try { return crypto.createHash("sha1").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex").slice(0, 12); } catch { return ""; } };
const versions = () => ({ data: hashFile("assets/js/data.js"), config: hashFile("assets/js/config.js") });
const VERSIONED = { gowns: "data", designer: "data", reviews: "data", config: "config" };

/* ---------- API ---------- */
async function api(req, res, route, remote) {
  const W = loadSite();
  if (req.method === "GET" && route === "data") {
    return send(res, 200, { site: W.SITE, collections: W.COLLECTIONS, gowns: W.GOWNS, media: W.MEDIA, reviews: W.REVIEWS || [], designer: W.DESIGNER || {}, ver: versions(), remote });
  }
  if (req.method !== "POST") return send(res, 405, { error: "Yöntem desteklenmiyor" });
  // Videos are streamed straight to disk (too big to send as JSON)
  if (route === "upload-video") return uploadVideo(req, res);
  const body = await readBody(req);
  const vk = VERSIONED[route];
  if (vk && (body.ver || remote) && body.ver !== versions()[vk]) {
    return send(res, 409, { error: "Bu arada başka biri de kaydetti. Değişikliğinizi kaybetmemek için sayfayı yenileyin ve tekrar yapın.", conflict: true });
  }
  if (route === "open-folder" && remote) return send(res, 403, { error: "Klasör yalnızca bilgisayardaki panelden açılabilir" });

  if (route === "gowns") {
    const list = (body.gowns || []).map((g) => cleanGown(g, W.COLLECTIONS));
    const ids = new Set();
    for (const g of list) { if (ids.has(g.id)) throw new Error(`Aynı bağlantı adı iki kez kullanılmış: ${g.id}`); ids.add(g.id); }
    W.GOWNS = list;
    writeData(W);
  } else if (route === "designer") {
    const d = body.designer || {};
    W.DESIGNER = {
      name: str(d.name, 80) || "Burak Altaş", title: bi(d.title, 120), photo: imgRef(d.photo) || "", photo2: imgRef(d.photo2) || "",
      since: str(d.since, 10), intro: bi(d.intro, 400), bio: bi(d.bio, 6000), quote: bi(d.quote, 400),
      highlights: (d.highlights || []).slice(0, 6).map((h) => ({ value: str(h.value, 20), label: bi(h.label, 80) })).filter((h) => h.value || h.label.tr || h.label.en),
      press: (d.press || []).slice(0, 12).map((p) => ({ name: str(p.name, 80), url: /^https:\/\//.test(str(p.url)) ? str(p.url, 500) : "" })).filter((p) => p.name)
    };
    writeData(W);
  } else if (route === "reviews") {
    W.REVIEWS = (body.reviews || []).slice(0, 40).map((r) => ({ name: str(r.name, 60), place: bi(r.place, 80), gown: str(r.gown, 60), text: bi(r.text, 600), photo: imgRef(r.photo) || "" })).filter((r) => r.name && (r.text.tr || r.text.en));
    writeData(W);
  } else if (route === "config") {
    const c = body.site || {}, S = W.SITE;
    const A = c.appointments || {};
    const num = (v, d, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+v) ? +v : d));
    const next = {
      ...S,
      whatsapp: str(c.whatsapp, 20).replace(/\D/g, "") || S.whatsapp,
      phoneDisplay: str(c.phoneDisplay, 40), email: str(c.email, 120), instagram: str(c.instagram, 300), instagramHandle: str(c.instagramHandle, 60),
      instagramStudio: str(c.instagramStudio, 300), etsyShop: str(c.etsyShop, 300), mapsUrl: str(c.mapsUrl, 300),
      address: str(c.address, 300), hours: bi(c.hours, 80), showPrices: !!c.showPrices, domain: str(c.domain, 200).replace(/\/$/, ""),
      appointments: {
        ...S.appointments,
        calcomUser: str(A.calcomUser, 60).replace(/[^\w-]/g, ""),
        start: num(A.start, 10, 0, 23), end: num(A.end, 21, 1, 24),
        days: Array.isArray(A.days) ? [...new Set(A.days.map(Number))].filter((d) => d >= 0 && d <= 6).sort() : S.appointments.days
      },
      extras: cleanExtras(c.extras),
      analytics: { cloudflareToken: (/[a-f0-9]{32}/i.exec(str(c.analytics && c.analytics.cloudflareToken, 400)) || [""])[0].toLowerCase() },
      chat: (() => {
        // Accept either the bare IDs or the whole embed address pasted from tawk.to
        const C = c.chat || {};
        const m = /embed\.tawk\.to\/([a-f0-9]+)\/([\w-]+)/i.exec(str(C.tawkPropertyId, 300));
        const id = (m ? m[1] : str(C.tawkPropertyId, 40)).replace(/[^a-f0-9]/gi, "");
        const w = (v, d) => str(v, 40).replace(/[^\w-]/g, "") || d;
        return { tawkPropertyId: id, tawkWidgetId: m ? m[2] : w(C.tawkWidgetId, "default"), tawkWidgetTr: w(C.tawkWidgetTr, "") };
      })()
    };
    writeConfig(next);
  } else if (route === "upload") {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(body.lg || "");
    const s = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(body.sm || "");
    if (!m) throw new Error("Geçersiz görsel");
    fs.mkdirSync(IMG_DIR, { recursive: true });
    const base = `${slug(body.name)}-${Date.now().toString(36)}`;
    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    fs.writeFileSync(path.join(IMG_DIR, `${base}.${ext}`), Buffer.from(m[2], "base64"));
    if (s) fs.writeFileSync(path.join(IMG_DIR, `${base}-sm.${ext}`), Buffer.from(s[2], "base64"));
    const x = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(body.xs || "");
    if (x) fs.writeFileSync(path.join(IMG_DIR, `${base}-xs.${ext}`), Buffer.from(x[2], "base64"));
    return send(res, 200, { ok: true, path: `assets/img/uploads/${base}.${ext}` });
  } else if (route === "publish") {
    const fx = await refreshRates();
    const r = build({ dist: true });
    return send(res, 200, { ok: true, fx, ...r });
  } else if (route === "open-folder") {
    const dir = path.join(ROOT, "yayin");
    if (process.platform === "win32") exec(`explorer "${dir}"`); else exec(`${process.platform === "darwin" ? "open" : "xdg-open"} "${dir}"`);
    return send(res, 200, { ok: true });
  } else {
    return send(res, 404, { error: "Bilinmeyen işlem" });
  }
  const r = build();
  send(res, 200, { ok: true, ...r, ver: versions() });
}

function uploadVideo(req, res) {
  const type = String(req.headers["content-type"] || "").split(";")[0].trim();
  // An H.264 .mov from a phone plays in browsers once saved as .mp4 (same container family)
  const ext = { "video/mp4": "mp4", "video/quicktime": "mp4", "video/webm": "webm" }[type];
  if (!ext) return send(res, 400, { error: "Video MP4, MOV ya da WEBM olmalı" });
  if (Number(req.headers["content-length"]) > MAX_VIDEO) return send(res, 413, { error: "Video çok büyük (en fazla 150 MB)" });
  fs.mkdirSync(VID_DIR, { recursive: true });
  const name = new URL(req.url, "http://x").searchParams.get("name");
  const base = `${slug(name)}-${Date.now().toString(36)}`;
  const tmp = path.join(VID_DIR, `.${base}.part`), final = path.join(VID_DIR, `${base}.${ext}`);
  const out = fs.createWriteStream(tmp);
  let size = 0, failed = false;
  const fail = (code, msg) => { if (failed) return; failed = true; out.destroy(); fs.rm(tmp, { force: true }, () => {}); send(res, code, { error: msg }); };
  req.on("data", (c) => { size += c.length; if (size > MAX_VIDEO) { fail(413, "Video çok büyük (en fazla 150 MB)"); req.destroy(); } });
  req.on("error", () => fail(400, "Yükleme yarıda kesildi"));
  out.on("error", (e) => fail(500, e.message));
  out.on("finish", () => {
    if (failed) return;
    if (!size) return fail(400, "Boş dosya");
    fs.renameSync(tmp, final);
    send(res, 200, { ok: true, path: `assets/video/uploads/${base}.${ext}`, size });
  });
  req.pipe(out);
}

/* ---------- Static files (site preview + panel) ---------- */
function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/admin" || rel === "/admin/") rel = "/admin/index.html";
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  const hidden = /[\\/]\.(?!well-known)|[\\/]node_modules[\\/]/.test(file.slice(ROOT.length));
  if (!file.startsWith(ROOT + path.sep) || hidden) return send(res, 403, "Yasak", "text/plain; charset=utf-8");
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  // Video players ask for byte ranges (Safari requires it, Chrome needs it to seek)
  if (type.startsWith("video/")) {
    return fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return send(res, 404, "Bulunamadı", "text/plain; charset=utf-8");
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if (!m) { res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Accept-Ranges": "bytes" }); return fs.createReadStream(file).pipe(res); }
      let a = m[1] === "" ? st.size - Number(m[2]) : Number(m[1]);
      let b = m[1] === "" || m[2] === "" ? st.size - 1 : Math.min(Number(m[2]), st.size - 1);
      if (a < 0) a = 0;
      if (a > b || a >= st.size) { res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { "Content-Type": type, "Content-Length": b - a + 1, "Content-Range": `bytes ${a}-${b}/${st.size}`, "Accept-Ranges": "bytes" });
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
    });
  }
  fs.readFile(file, (err, buf) => {
    if (err) return fs.readFile(path.join(ROOT, "404.html"), (e2, b2) => send(res, 404, e2 ? "Bulunamadı" : b2, TYPES[".html"]));
    send(res, 200, buf, type);
  });
}

/* ---------- Remote access: password login (only in REMOTE mode) ---------- */
// A fresh password every start, easy to read out on the phone: e.g. "k7m2-q9xa-4fhd"
const makePassword = () => {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return [0, 1, 2].map(() => Array.from(crypto.randomBytes(4), (b) => abc[b % abc.length]).join("")).join("-");
};
const PASSWORD = REMOTE ? (process.env.ADMIN_PASSWORD || makePassword()) : "";
const SESSION_H = 12;
const sessions = new Map(); // token -> expiry (ms)
const failures = new Map(); // ip -> [timestamps]
const cookieOf = (req) => (/(?:^|;\s*)ba_s=([a-f0-9]{48})/.exec(req.headers.cookie || "") || [])[1];
const signedIn = (req) => { const t = cookieOf(req), exp = t && sessions.get(t); if (exp && exp > Date.now()) return true; if (t) sessions.delete(t); return false; };
// Requests through the tunnel carry Cloudflare's headers; ones typed on this PC don't
const isRemoteReq = (req) => !!(req.headers["cf-connecting-ip"] || req.headers["cf-ray"] || req.headers["x-forwarded-for"]) ||
  !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "");
const clientIp = (req) => String(req.headers["cf-connecting-ip"] || req.socket.remoteAddress || "?");
const tooMany = (ip) => (failures.get(ip) || []).filter((t) => t > Date.now() - 15 * 60e3).length >= 8;
const samePassword = (a) => { const x = Buffer.from(String(a)), y = Buffer.from(PASSWORD); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// Remote users reach only the panel, its API and the public site — never README, scripts or backups
const remoteAllowed = (rel) => /^\/(admin(\/.*)?|api\/[\w-]+|(tr\/)?[\w-]+\.html|tr\/|assets\/[\w\-./]+|favicon\.svg|apple-touch-icon\.png|site\.webmanifest|robots\.txt|sitemap\.xml)?$/.test(rel) && !rel.includes("..");

const loginPage = (msg = "") => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Giriş — Admin</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f2eb;color:#1b1714;font:16px/1.5 system-ui,sans-serif}form{width:min(360px,calc(100% - 32px));display:grid;gap:14px;padding:32px 28px;background:#fcfaf6;border:1px solid rgba(27,23,20,.14);border-radius:12px}
h1{margin:0;font:400 1.6rem Georgia,serif}p{margin:0;color:#6b6056;font-size:.92rem}input{font:inherit;font-size:18px;padding:12px 14px;border:1px solid rgba(27,23,20,.3);border-radius:8px;letter-spacing:.06em}button{font:inherit;padding:13px;border:0;border-radius:8px;background:#1b1714;color:#f7f2eb;cursor:pointer}.e{color:#9c3b2f}</style></head>
<body><form method="post" action="/giris"><h1>B<i>A</i> · Admin paneli</h1><p>Alim'in gönderdiği şifreyi girin.</p>${msg ? `<p class="e">${msg}</p>` : ""}
<input name="sifre" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" required autofocus aria-label="Şifre"><button>Giriş yap</button></form></body></html>`;

function handleLogin(req, res) {
  if (req.method === "GET") return send(res, 200, loginPage(), TYPES[".html"]);
  const ip = clientIp(req);
  if (tooMany(ip)) return send(res, 429, loginPage("Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin."), TYPES[".html"]);
  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 2000) req.destroy(); });
  req.on("end", () => {
    const pw = new URLSearchParams(raw).get("sifre") || "";
    if (!samePassword(pw.trim()) && !samePassword(pw.trim().toLowerCase())) {
      failures.set(ip, [...(failures.get(ip) || []), Date.now()]);
      return send(res, 401, loginPage("Şifre hatalı."), TYPES[".html"]);
    }
    failures.delete(ip);
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, Date.now() + SESSION_H * 3600e3);
    res.writeHead(303, { Location: "/admin", "Set-Cookie": `ba_s=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_H * 3600}`, "Cache-Control": "no-store" });
    res.end();
  });
}

// Model pages, sitemap etc. are not kept in Git — make sure they exist and are current
try { build(); } catch (e) { console.log(`\n  ! Sayfalar üretilemedi: ${e.message}\n`); }

const server = http.createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split("?")[0]);
    const remote = REMOTE && isRemoteReq(req);
    if (remote) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "same-origin");
      if (rel === "/giris") return handleLogin(req, res);
      if (rel === "/cikis") { sessions.delete(cookieOf(req)); res.writeHead(303, { Location: "/giris", "Set-Cookie": "ba_s=; Path=/; Max-Age=0" }); return res.end(); }
      if (!signedIn(req)) {
        if (rel.startsWith("/api/")) return send(res, 401, { error: "Oturum kapandı — lütfen yeniden giriş yapın", login: true });
        res.writeHead(303, { Location: "/giris" }); return res.end();
      }
      if (!remoteAllowed(rel)) return send(res, 404, "Bulunamadı", "text/plain; charset=utf-8");
    }
    // Only same-origin browser requests may change data
    if (req.method === "POST") {
      const origin = req.headers.origin || "";
      const ok = [`http://localhost:${PORT}`, `http://${HOST}:${PORT}`, ...(remote ? [`https://${req.headers.host}`] : [])];
      // Through the tunnel the page's own origin is its trycloudflare address (the session cookie
      // is SameSite=Strict as well, so other sites can't post with it)
      const tunnelOrigin = remote && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin);
      if (origin && !ok.includes(origin) && !tunnelOrigin) return send(res, 403, { error: "İzin yok" });
    }
    const m = /^\/api\/([\w-]+)$/.exec(rel);
    if (m) return await api(req, res, m[1], remote);
    serveStatic(req, res, req.url);
  } catch (e) {
    send(res, 400, { error: e.message || String(e) });
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}/admin`;
  console.log(`\n  Burak Altaş Atelier — Admin paneli hazır${REMOTE ? " (uzaktan erişim)" : ""}\n  Panel:   ${url}\n  Site:    http://localhost:${PORT}/\n  Kapatmak için bu pencereyi kapatın (ya da Ctrl+C).\n`);
  if (!process.env.NO_OPEN) {
    const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd);
  }
  if (REMOTE && !process.env.NO_TUNNEL) {
    const tunnel = require("./tunnel.js");
    tunnel.startTunnel(PORT, (link) => {
      tunnel.copy(`Admin paneli: ${link}/admin\nŞifre: ${PASSWORD}`);
      console.log(`
  ┌──────────────────────────────────────────────────────────────┐
     Burak'a gönderilecekler (ikisi birlikte panoya kopyalandı):

     Link:   ${link}/admin
     Şifre:  ${PASSWORD}
  └──────────────────────────────────────────────────────────────┘
  • Panelde yapılan her değişiklik sitenizi değiştirir — Burak'a buna göre söyleyin.
  • Siz de aynı anda kendi panelinizi kullanabilirsiniz; aynı anda kaydedilirse
    panel çakışmayı fark eder ve kimsenin işi kaybolmaz.
  • Şifre ve link yalnızca bu pencere açıkken geçerlidir. Kapatınca erişim biter.
`);
    });
  }
});
server.on("error", (e) => {
  if (e.code === "EADDRINUSE") console.log(`\n  Panel zaten açık görünüyor: http://localhost:${PORT}/admin\n`);
  else console.error(e);
});
