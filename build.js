/* ==========================================================================
   build.js — paylaşılabilir model sayfalarını ve yayın klasörünü üretir
   Admin paneli kaydettiğinizde bunu kendiliğinden çalıştırır.
   Elle çalıştırmak için:   node build.js            (model sayfaları + sitemap)
                            node build.js --yayin    (+ yayin/ klasörü)
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { toTurkish, withLangLinks } = require("./build-tr.js");

const root = __dirname;
const DIST = path.join(root, "yayin");
// Only these go live — the admin panel, scripts and notes stay on your computer
const PUBLIC = ["tr", "assets", "favicon.svg", "apple-touch-icon.png", "site.webmanifest", "robots.txt", "sitemap.xml"];

function loadSite() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of ["assets/js/config.js", "assets/js/data.js", "assets/js/i18n.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx);
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
const ASSET_REF = /((?:src|href)="(?:\.\.\/|\/)?assets\/[^"?]+\.(?:js|css))(?:\?v=[a-f0-9]+)?"/g;
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
const HEADERS = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  X-Frame-Options: SAMEORIGIN
  Strict-Transport-Security: max-age=31536000; includeSubDomains
/*.html
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
  const S = W.SITE, G = (W.GOWNS || []).filter((g) => !g.draft);
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

  // Remove pages of gowns (and their Turkish twins) that no longer exist
  const TR_DIR = path.join(root, "tr");
  fs.rmSync(TR_DIR, { recursive: true, force: true });
  fs.mkdirSync(TR_DIR);
  for (const f of fs.readdirSync(root)) if (/^gown-[a-z0-9-]+\.html$/.test(f) && !G.some((g) => `gown-${g.id}.html` === f)) fs.unlinkSync(path.join(root, f));

  // Pages that exist in both languages (404 stays a single, root-level page)
  const STATIC = fs.readdirSync(root).filter((f) => f.endsWith(".html") && !/^gown-/.test(f) && f !== "404.html");
  const PAGES = [...STATIC, ...G.map((g) => `gown-${g.id}.html`)];
  const TRX = (W.I18N && W.I18N.tr) || {};
  const L2 = (o, lang) => (o && typeof o === "object" ? (lang === "tr" ? o.tr || o.en : o.en || o.tr) || "" : o || "");
  const SIL_TR = { ballgown: "Prenses", aline: "A kesim", mermaid: "Balık", column: "Düz kesim", mini: "Mini" };
  const XS = new Set(xs);

  const template = fs.readFileSync(path.join(root, "gown.html"), "utf8");
  const gownHead = (g, lang) => {
    const tr = lang === "tr", ap = g.collection === "afterparty";
    const kind = tr ? (ap ? "after party elbisesi" : "gelinlik") : ap ? "after-party dress" : "wedding dress";
    const title = tr ? `${g.name} — ${SIL_TR[g.silhouette] || ""} ${kind} | Burak Altaş Atelier` : `${g.name} — ${SIL[g.silhouette] || ""} ${kind} | Burak Altaş Atelier`;
    const story = L2(g.story, lang), fabric = L2(g.fabric, lang);
    const url = `${S.domain}/${tr ? "tr/" : ""}gown-${g.id}.html`;
    const ld = {
      "@context": "https://schema.org", "@type": "Product", name: `${g.name} ${kind}`, sku: g.no,
      image: (g.images || []).map((id) => imgUrl(id, 1400)), description: story, material: fabric, inLanguage: lang,
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
    const heroSet = !first ? "" : /^assets\/img\/uploads\/.+\.(jpg|png|webp)$/.test(first)
      ? `${XS.has(first) ? `${first.replace(/(\.\w+)$/, "-xs$1")} 480w, ` : ""}${first.replace(/(\.\w+)$/, "-sm$1")} 800w, ${first} 1800w`
      : /^(assets\/|https?:)/.test(first) ? "" : [320, 360, 480, 640, 800, 1000, 1400, 1900].map((w) => `${unsplash(first, w)} ${w}w`).join(", ");
    const heroSrc = !first ? "" : /^(assets\/|https?:)/.test(first) ? first : unsplash(first, 1400);
    const preload = first ? `<link rel="preload" as="image" href="${esc(heroSrc)}"${heroSet ? ` imagesrcset="${esc(heroSet)}" imagesizes="(min-width: 1000px) 55vw, 88vw"` : ""} fetchpriority="high">\n  ` : "";
    const tail = tr ? "İzmir'de ölçünüze göre dikilir, dünyanın her yerine gönderilir." : "Made to measure in İzmir, shipped worldwide.";
    return `${preload}<title>${esc(title)}</title>
  <meta name="description" content="${esc(`${story} ${fabric}. ${tail}`)}">
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
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
  <script type="application/ld+json">${JSON.stringify(crumbs(g, lang, url)).replace(/</g, "\\u003c")}</script>`;
  };
  // Home › collection › gown, shown by Google under the result title
  const crumbs = (g, lang, url) => {
    const tr = lang === "tr", base = `${S.domain}/${tr ? "tr/" : ""}`;
    const col = (W.COLLECTIONS || []).find((c) => c.id === g.collection);
    return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: tr ? "Ana sayfa" : "Home", item: base },
      ...(col ? [{ "@type": "ListItem", position: 2, name: L2(col.name, lang), item: `${base}collection.html?c=${col.id}` }] : []),
      { "@type": "ListItem", position: col ? 3 : 2, name: g.name, item: url }
    ] };
  };
  const gownHtml = (g, lang) => template
    .replace(/<title>[\s\S]*?<\/title>\s*<meta name="description"[^>]*>/, gownHead(g, lang))
    .replace('<body data-page="gown">', `<body data-page="gown" data-gown="${g.id}">`);

  for (const g of G) {
    const file = `gown-${g.id}.html`;
    fs.writeFileSync(path.join(root, file), withLangLinks(gownHtml(g, "en"), S.domain, file, "en"));
    fs.writeFileSync(path.join(TR_DIR, file), toTurkish(gownHtml(g, "tr"), { file, TR: TRX, pages: PAGES, domain: S.domain, meta: {} }));
  }
  // Turkish twins of the static pages (gown.html is the fallback template for unbuilt gowns)
  for (const f of STATIC) fs.writeFileSync(path.join(TR_DIR, f), toTurkish(fs.readFileSync(path.join(root, f), "utf8"), { file: f, TR: TRX, pages: PAGES, domain: S.domain }));
  fs.appendFileSync(path.join(root, "assets/js/built.js"), `window.BUILT_TR = ${JSON.stringify(PAGES)};\n`);

  // Sitemap: every page in both languages, each pointing at its twin
  const today = new Date().toISOString().slice(0, 10);
  const SM_PAGES = ["index.html", "collection.html", "atelier.html", "designer.html", "fitting.html", "contact.html", "policies.html"];
  const loc = (file, lang) => `${S.domain}/${lang === "tr" ? "tr/" : ""}${file === "index.html" ? "" : file}`;
  const alt = (file) => ["en", "tr"].map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${loc(file, l)}"/>`).join("") + `<xhtml:link rel="alternate" hreflang="x-default" href="${loc(file, "en")}"/>`;
  let sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
  for (const lang of ["en", "tr"]) {
    for (const p of SM_PAGES) sm += `  <url><loc>${loc(p, lang)}</loc><lastmod>${today}</lastmod>${alt(p)}</url>\n`;
    for (const g of G) {
      const file = `gown-${g.id}.html`;
      sm += `  <url><loc>${loc(file, lang)}</loc><lastmod>${today}</lastmod>${alt(file)}${(g.images || []).map((id) => `<image:image><image:loc>${esc(imgUrl(id, 1400))}</image:loc></image:image>`).join("")}</url>\n`;
    }
  }
  fs.writeFileSync(path.join(root, "sitemap.xml"), sm + "</urlset>\n");

  if (dist) makeDist();
  return { gowns: G.length, dist: dist ? DIST : null };
}

/* schema.org description of the atelier, from config.js + the catalogue */
function businessLd(W, lang) {
  const S = W.SITE, G = (W.GOWNS || []).filter((g) => !g.draft);
  const prices = G.map((g) => g.price).filter((n) => n > 0);
  const DAYS = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  const ORDER = Object.keys(DAYS);
  // "Mon–Sat · 10:00–19:00" → opening hours; anything else is simply left out
  const h = /^(mon|tue|wed|thu|fri|sat|sun)\w*\s*[–-]\s*(mon|tue|wed|thu|fri|sat|sun)\w*\D+(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/i.exec((S.hours && S.hours.en) || "");
  const hours = h ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: ORDER.slice(ORDER.indexOf(h[1].toLowerCase()), ORDER.indexOf(h[2].toLowerCase()) + 1).map((d) => DAYS[d]), opens: h[3].padStart(5, "0"), closes: h[4].padStart(5, "0") }] : [];
  const addr = /^(.*?),\s*(\d{5})\s+([^/,]+?)\s*\/\s*([^,]+?)(?:,\s*(.+))?$/.exec(S.address || "");
  const firstImg = (G.find((g) => g.featured) || G[0] || {}).images?.[0];
  return {
    "@context": "https://schema.org", "@type": "ClothingStore", "@id": `${S.domain}/#atelier`,
    name: S.brand, url: lang === "tr" ? `${S.domain}/tr/` : `${S.domain}/`,
    description: lang === "tr" ? "İzmir'de el yapımı, ölçüye özel couture gelinlikler ve after party elbiseleri; görüntülü görüşmeyle ölçü, dünyaya gönderim."
      : "Couture wedding dresses and after-party dresses hand-made to measure in İzmir, fitted over video and shipped worldwide.",
    logo: `${S.domain}/assets/img/icon-512.png`,
    ...(firstImg ? { image: /^assets\//.test(firstImg) ? `${S.domain}/${firstImg}` : /^https?:/.test(firstImg) ? firstImg : `https://images.unsplash.com/photo-${firstImg}?auto=format&fit=crop&w=1200&q=75` } : {}),
    telephone: `+${S.whatsapp}`,
    ...(addr ? { address: { "@type": "PostalAddress", streetAddress: addr[1], postalCode: addr[2], addressLocality: addr[3].trim(), addressRegion: addr[4].trim(), addressCountry: "TR" } } : {}),
    ...(S.mapsUrl ? { hasMap: S.mapsUrl } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(prices.length ? { priceRange: `$${Math.min(...prices).toLocaleString("en-US")}–$${Math.max(...prices).toLocaleString("en-US")}` } : {}),
    currenciesAccepted: S.currency, areaServed: "Worldwide", inLanguage: ["en", "tr"],
    sameAs: [S.instagram, S.instagramStudio].filter((u) => /^https:\/\//.test(u || ""))
  };
}

function makeDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST);
  const html = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
  // The published catalogue leaves out drafts (and so their photos) — they stay on this computer
  const W0 = loadSite();
  const publicData = `/* Burak Altaş Atelier — katalog (yayın kopyası, taslaklar hariç) */\n` +
    ["COLLECTIONS", "GOWNS", "MEDIA", "REVIEWS", "DESIGNER"].filter((k) => W0[k] !== undefined)
      .map((k) => `window.${k} = ${JSON.stringify(k === "GOWNS" ? W0.GOWNS.filter((g) => !g.draft) : W0[k], null, 1)};`).join("\n") + "\n";
  // Every upload path mentioned in the catalogue or settings (photos, posters, videos, portraits)
  const refs = publicData + fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8");
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
  fs.writeFileSync(path.join(DIST, "assets/js/data.js"), publicData);
  // English pages point search engines at their Turkish twins (the source files stay untouched)
  const S = W0.SITE;
  // Link previews (WhatsApp, Instagram…) of the home and collection pages show a real gown photo
  // once one is uploaded: the first featured gown's cover
  const cover = (W0.GOWNS.filter((g) => !g.draft).find((g) => g.featured && /^assets\//.test(g.images[0] || "")) ||
    W0.GOWNS.filter((g) => !g.draft).find((g) => /^assets\//.test(g.images[0] || "")) || {}).images?.[0];
  if (cover) for (const f of ["index.html", "collection.html", "tr/index.html", "tr/collection.html"]) {
    const p = path.join(DIST, f);
    if (fs.existsSync(p)) fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${S.domain}/${cover}$2`));
  }
  for (const f of fs.readdirSync(DIST).filter((f) => f.endsWith(".html") && !/^gown-/.test(f) && f !== "404.html")) {
    const file = path.join(DIST, f);
    fs.writeFileSync(file, withLangLinks(fs.readFileSync(file, "utf8"), S.domain, f, "en"));
  }
  // The shop itself for Google (local search, Maps): built from the settings, so it never goes stale
  const W = loadSite();
  for (const [file, lang] of [["index.html", "en"], ["tr/index.html", "tr"]]) {
    const p = path.join(DIST, file);
    if (!fs.existsSync(p)) continue;
    const ld = JSON.stringify(businessLd(W, lang)).replace(/</g, "\\u003c");
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${ld}</script>`));
  }
  stampAssets(DIST);
  if (fs.existsSync(path.join(DIST, "tr"))) stampAssets(path.join(DIST, "tr"));
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
