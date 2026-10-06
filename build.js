/* ==========================================================================
   build.js — paylaşılabilir model sayfalarını ve yayın klasörünü üretir
   Admin paneli kaydettiğinizde bunu kendiliğinden çalıştırır.
   Elle çalıştırmak için:   node build.js            (model sayfaları + sitemap)
                            node build.js --yayin    (+ yayin/ klasörü)
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const DIST = path.join(root, "yayin");
// Only these go live — the admin panel, scripts and notes stay on your computer
const PUBLIC = ["assets", "favicon.svg", "apple-touch-icon.png", "site.webmanifest", "robots.txt", "sitemap.xml"];

function loadSite() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of ["assets/js/config.js", "assets/js/data.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx);
  return ctx.window;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SIL = { ballgown: "ball gown", aline: "A-line", mermaid: "mermaid", column: "column", mini: "mini" };
const pick = (o) => (o && typeof o === "object" ? o.en || o.tr || "" : o || "");

/* Cache-busting: published pages link assets as "app.js?v=<content hash>", so after a publish
   visitors' browsers fetch the new catalogue instead of a cached copy.
   Only the "yayin" copy is stamped — the source pages in Git stay clean, so two people
   working on the site never get merge conflicts on these lines. */
const crypto = require("crypto");
const ASSET_REF = /((?:src|href)="\/?assets\/[^"?]+\.(?:js|css))(?:\?v=[a-f0-9]+)?"/g;
function stampAssets(dir, { strip = false } = {}) {
  const hashes = {};
  const hashOf = (rel) => (hashes[rel] ??= fs.existsSync(path.join(dir, rel))
    ? crypto.createHash("sha1").update(fs.readFileSync(path.join(dir, rel))).digest("hex").slice(0, 10) : null);
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const file = path.join(dir, f), before = fs.readFileSync(file, "utf8");
    const after = before.replace(ASSET_REF, (m, ref) => {
      if (strip) return `${ref}"`;
      const h = hashOf(ref.replace(/^(?:src|href)="\/?/, ""));
      return h ? `${ref}?v=${h}"` : m;
    });
    if (after !== before) fs.writeFileSync(file, after);
  }
}
// Netlify reads this file from the published folder (netlify.toml isn't part of a drag-and-drop)
const HEADERS = `/*.html
  Cache-Control: public, max-age=0, must-revalidate
/
  Cache-Control: public, max-age=0, must-revalidate
/assets/js/*
  Cache-Control: public, max-age=31536000, immutable
/assets/css/*
  Cache-Control: public, max-age=31536000, immutable
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/video/*
  Cache-Control: public, max-age=31536000, immutable
/assets/img/*
  Cache-Control: public, max-age=604800
`;

function build({ dist = false } = {}) {
  const W = loadSite();
  const S = W.SITE, G = W.GOWNS || [];
  // Uploads that also have a 480px phone version (name-xs.jpg); older uploads don't
  const upDir = path.join(root, "assets/img/uploads");
  const xs = fs.existsSync(upDir) ? fs.readdirSync(upDir).filter((f) => /-xs\.(jpg|png|webp)$/.test(f)).map((f) => `assets/img/uploads/${f.replace(/-xs(\.\w+)$/, "$1")}`) : [];
  fs.writeFileSync(path.join(root, "assets/js/built.js"),
    `/* build.js tarafından otomatik üretilir — elle düzenlemeyin */\nwindow.BUILT_GOWNS = ${JSON.stringify(G.map((g) => g.id))};\nwindow.UPLOAD_XS = ${JSON.stringify(xs)};\n`);
  // Source pages never carry version stamps (older builds wrote them here — remove them)
  stampAssets(root, { strip: true });
  // A fresh Git checkout has no exchange rates yet; pages work without them until the next publish
  if (!fs.existsSync(FX_FILE)) fs.writeFileSync(FX_FILE, "window.FX = null;\n");
  const imgUrl = (id, w = 1200, h) =>
    /^https?:/.test(id) ? id : /^assets\//.test(id) ? `${S.domain}/${id}` : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=75`;

  // Remove pages of gowns that no longer exist
  for (const f of fs.readdirSync(root)) if (/^gown-[a-z0-9-]+\.html$/.test(f) && !G.some((g) => `gown-${g.id}.html` === f)) fs.unlinkSync(path.join(root, f));

  const template = fs.readFileSync(path.join(root, "gown.html"), "utf8");
  for (const g of G) {
    const kind = g.collection === "afterparty" ? "after-party dress" : "wedding dress";
    const title = `${g.name} — ${SIL[g.silhouette] || ""} ${kind} | Burak Altaş Atelier`;
    const story = pick(g.story), fabric = pick(g.fabric);
    const url = `${S.domain}/gown-${g.id}.html`;
    const ld = {
      "@context": "https://schema.org", "@type": "Product", name: `${g.name} ${kind}`, sku: g.no,
      image: (g.images || []).map((id) => imgUrl(id, 1400)), description: story, material: fabric,
      brand: { "@type": "Brand", name: "Burak Altaş Atelier" },
      offers: { "@type": "Offer", price: g.price, priceCurrency: S.currency, availability: "https://schema.org/PreOrder", url: g.etsy || S.etsyShop },
      // Lets Google show the clip in video results and on the product listing
      ...(g.video ? { subjectOf: {
        "@type": "VideoObject", name: `${g.name} — Burak Altaş Atelier`, description: story || g.name,
        thumbnailUrl: imgUrl(g.video.poster, 1400), contentUrl: `${S.domain}/${g.video.src}`, uploadDate: g.video.date,
        ...(g.video.seconds ? { duration: `PT${g.video.seconds}S` } : {})
      } } : {})
    };
    const vtype = g.video && /\.webm$/i.test(g.video.src) ? "video/webm" : "video/mp4";
    // The first photo is drawn by JavaScript, so the browser would find it late: announce it in
    // the head with the exact srcset/sizes app.js uses (largest-contentful-paint)
    const first = (g.images || [])[0];
    const unsplash = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;
    const heroSet = !first ? "" : /^assets\/img\/uploads\/.+\.(jpg|png|webp)$/.test(first) ? `${first.replace(/(\.\w+)$/, "-sm$1")} 800w, ${first} 1800w`
      : /^(assets\/|https?:)/.test(first) ? "" : [400, 700, 1000, 1400, 1900].map((w) => `${unsplash(first, w)} ${w}w`).join(", ");
    const heroSrc = !first ? "" : /^(assets\/|https?:)/.test(first) ? first : unsplash(first, 1400);
    const preload = first ? `<link rel="preload" as="image" href="${esc(heroSrc)}"${heroSet ? ` imagesrcset="${esc(heroSet)}" imagesizes="(min-width: 1000px) 55vw, 88vw"` : ""} fetchpriority="high">\n  ` : "";
    const head = `${preload}<title>${esc(title)}</title>
  <meta name="description" content="${esc(`${story} ${fabric}. Made to measure in İzmir, shipped worldwide.`)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Burak Altaş Atelier">
  <meta property="og:title" content="${esc(`${g.name} — Burak Altaş Atelier`)}">
  <meta property="og:description" content="${esc(story)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(g.images && g.images[0] ? imgUrl(g.images[0], 1200, 630) : "")}">
  ${g.video ? `<meta property="og:video" content="${esc(`${S.domain}/${g.video.src}`)}">
  <meta property="og:video:type" content="${vtype}">
  ` : ""}<meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;
    const html = template
      .replace(/<title>[\s\S]*?<\/title>\s*<meta name="description"[^>]*>/, head)
      .replace('<body data-page="gown">', `<body data-page="gown" data-gown="${g.id}">`);
    fs.writeFileSync(path.join(root, `gown-${g.id}.html`), html);
  }

  const today = new Date().toISOString().slice(0, 10);
  const pages = ["", "collection.html", "atelier.html", "designer.html", "fitting.html", "contact.html", "policies.html"];
  let sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
  for (const p of pages) sm += `  <url><loc>${S.domain}/${p}</loc><lastmod>${today}</lastmod></url>\n`;
  for (const g of G) sm += `  <url><loc>${S.domain}/gown-${g.id}.html</loc><lastmod>${today}</lastmod>${(g.images || []).map((id) => `<image:image><image:loc>${esc(imgUrl(id, 1400))}</image:loc></image:image>`).join("")}</url>\n`;
  fs.writeFileSync(path.join(root, "sitemap.xml"), sm + "</urlset>\n");

  if (dist) makeDist();
  return { gowns: G.length, dist: dist ? DIST : null };
}

function makeDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST);
  const html = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
  // Every upload path mentioned in the catalogue or settings (photos, posters, videos, portraits)
  const refs = ["assets/js/data.js", "assets/js/config.js"].map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
  const used = new Set(refs.match(/assets\/(?:img|video)\/uploads\/[\w.-]+/g) || []);
  for (const f of [...html, ...PUBLIC]) {
    const from = path.join(root, f);
    // Dotfiles (e.g. an interrupted video upload) and uploads no longer used by the site never go live
    if (fs.existsSync(from)) fs.cpSync(from, path.join(DIST, f), { recursive: true, filter: (p) => {
      if (path.basename(p).startsWith(".")) return false;
      // Windows hands cpSync long-path names ("\\?\C:\…"); compare without that prefix
      const rel = path.relative(root, p.replace(/^\\\\\?\\/, "")).split(path.sep).join("/");
      return !/^assets\/(img|video)\/uploads\/.+\.\w+$/.test(rel) || used.has(rel.replace(/-(sm|xs)(\.\w+)$/, "$2"));
    } });
  }
  stampAssets(DIST);
  fs.writeFileSync(path.join(DIST, "_headers"), HEADERS);
}

/* Exchange rates for the "≈ €1,370" hint on gown pages. Fetched at publish time (ECB data via
   frankfurter.dev) and written into the site, so visitors' browsers never call a third party. */
const FX_FILE = path.join(root, "assets/js/fx.js");
async function refreshRates() {
  try {
    const r = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,TRY,CHF,SEK,NOK,DKK,PLN,CZK,HUF,RON,CAD,AUD", { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (!j.rates || !j.rates.EUR) throw new Error("beklenmeyen yanıt");
    fs.writeFileSync(FX_FILE, `/* build.js tarafından otomatik üretilir (Avrupa Merkez Bankası kurları) — elle düzenlemeyin */\nwindow.FX = ${JSON.stringify({ date: j.date, base: "USD", rates: j.rates })};\n`);
    return j.date;
  } catch (e) {
    // Keep the previous rates if the service is unreachable; the site simply shows them as they were
    if (!fs.existsSync(FX_FILE)) fs.writeFileSync(FX_FILE, "window.FX = null;\n");
    return null;
  }
}

module.exports = { build, loadSite, refreshRates };

if (require.main === module) {
  (async () => {
    const fx = await refreshRates();
    const r = build({ dist: process.argv.includes("--yayin") });
    console.log(`✓ ${r.gowns} model sayfası, built.js ve sitemap.xml üretildi.${fx ? `\n✓ Döviz kurları güncellendi (${fx})` : "\n! Döviz kurları alınamadı, eskileri kullanılıyor"}${r.dist ? `\n✓ Yayın klasörü hazır: ${r.dist}` : ""}`);
  })();
}
