/* ==========================================================================
   BURAK ALTAŞ ATELIER — core
   No framework, no build step. Each page declares <body data-page="…">.
   ========================================================================== */
(() => {
  "use strict";
  document.documentElement.classList.add("js");

  // Drafts (imported but not reviewed yet) stay in the admin panel only
  // (?taslak=1 previews them from the panel — the published catalogue has no drafts at all)
  const PREVIEW_DRAFTS = new URLSearchParams(location.search).get("taslak") === "1";
  const S = window.SITE, G = (window.GOWNS || []).filter((g) => !g.draft || PREVIEW_DRAFTS), C = window.COLLECTIONS, M = window.MEDIA, R = window.REVIEWS;
  const I = window.I18N || { tr: {}, ui: {} };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const page = document.body.dataset.page;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) ?? d : d; } catch { return d; } },
    // Returns false when the browser refuses to save (private mode, storage full, blocked)
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  };

  /* ---------- Language ---------- */
  const LANGS = ["en", "tr"];
  // Turkish pages live in /tr/ as real HTML (build.js); the page's own language always wins there
  // (data-page-lang, not data-lang: the language buttons use [data-lang] and clicks look for it)
  const FIXED = document.documentElement.dataset.pageLang;
  const BASE = document.documentElement.dataset.base || "";
  const pageFile = () => decodeURIComponent(location.pathname.split("/").pop() || "index.html");
  const twinOf = (l) => {
    const built = window.BUILT_TR || [];
    if (!built.includes(pageFile())) return null;
    const u = new URL(location.href);
    u.searchParams.delete("lang");
    u.pathname = u.pathname.replace(/\/(?:tr\/)?[^/]*$/, l === "tr" ? `/tr/${pageFile()}` : `/${pageFile()}`);
    return u.href;
  };
  let lang = FIXED || params.get("lang");
  if (LANGS.includes(lang)) store.set("ba-lang", lang);
  else lang = store.get("ba-lang", null);
  if (!LANGS.includes(lang)) lang = (navigator.language || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
  // An English address opened by a Turkish reader (or an old ?lang=tr link): go to the Turkish page
  if (!FIXED && lang === "tr") { const tw = twinOf("tr"); if (tw) { location.replace(tw); return; } }
  // A missing translation falls back to the other language rather than showing nothing
  const L = (o) => (o == null ? "" : typeof o === "string" ? o : o[lang] || o.en || o.tr || "");
  const t = (k, vars) => {
    let s = L(I.ui[k]) || k;
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
    return s;
  };
  const rerenders = [];
  const onLang = (fn) => { rerenders.push(fn); fn(); };

  function applyStatic() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => {
      if (el.dataset.en == null) el.dataset.en = el.innerHTML;
      const tr = I.tr[el.dataset.i18n];
      el.innerHTML = lang === "en" || tr == null ? el.dataset.en : tr;
    });
    $$("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((x) => x.trim());
        const cache = "en_" + attr.replace(/-/g, "_");
        if (el.dataset[cache] == null) el.dataset[cache] = el.getAttribute(attr) || "";
        const tr = I.tr[key];
        el.setAttribute(attr, lang === "en" || tr == null ? el.dataset[cache] : tr);
      });
    });
    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }
  function setLang(l) {
    if (!LANGS.includes(l) || l === lang) return;
    // Built site: each language has its own page — go there (keeps the address shareable and indexable)
    const tw = twinOf(l);
    if (tw) { store.set("ba-lang", l); location.href = tw; return; }
    const inMenu = !!document.activeElement?.closest(".menu");
    lang = l; store.set("ba-lang", l);
    // Keep a ?lang= in the address bar in sync, so a reload doesn't flip the language back
    const u = new URL(location.href);
    if (u.searchParams.has("lang")) { u.searchParams.set("lang", l); history.replaceState(history.state, "", u); }
    applyStatic(); rerenders.forEach((fn) => fn()); observeReveals();
    $(`${inMenu ? ".menu" : ".hdr"} [data-lang="${l}"]`)?.focus();
  }

  /* ---------- Helpers ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isLocal = (id) => /^(assets\/|https?:|\.{0,2}\/)/.test(id);
  const at = (p) => (/^assets\//.test(p) ? BASE + p : p);
  const src = (id, w = 1000) => isLocal(id) ? at(id) : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;
  // Photos uploaded through the admin panel come as name.jpg (1800px) and name-sm.jpg (800px); newer
  // uploads also have name-xs.jpg (480px) for phones — build.js lists which ones in window.UPLOAD_XS
  const XS = new Set(window.UPLOAD_XS || []);
  const srcset = (id) => /^assets\/img\/uploads\/.+\.(jpg|png|webp)$/.test(id)
    ? `${XS.has(id) ? `${at(id.replace(/(\.\w+)$/, "-xs$1"))} 480w, ` : ""}${at(id.replace(/(\.\w+)$/, "-sm$1"))} 800w, ${at(id)} 1800w`
    : isLocal(id) ? "" : [320, 360, 480, 640, 800, 1000, 1400, 1900].map((w) => `${src(id, w)} ${w}w`).join(", ");
  const img = (id, alt, { sizes = "(min-width: 1080px) 25vw, 50vw", eager = false, w = 1000 } = {}) =>
    `<img src="${src(id, w)}" ${srcset(id) ? `srcset="${srcset(id)}" sizes="${sizes}"` : ""} alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const localISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  /* Approximate price in the bride's own currency, guessed from her time zone.
     Rates come from assets/js/fx.js (written at publish time); Gulf currencies are pegged to the dollar. */
  const PEGS = { AED: 3.6725, SAR: 3.75, QAR: 3.64, BHD: 0.376, OMR: 0.3845 };
  const EUROZONE = "Amsterdam Andorra Athens Berlin Bratislava Brussels Busingen Dublin Helsinki Lisbon Ljubljana Luxembourg Madrid Malta Mariehamn Monaco Paris Riga Rome San_Marino Sofia Tallinn Vatican Vienna Vilnius Zagreb".split(" ");
  const TZ_CUR = {
    "Europe/London": "GBP", "Europe/Belfast": "GBP", "Europe/Guernsey": "GBP", "Europe/Jersey": "GBP", "Europe/Isle_of_Man": "GBP",
    "Europe/Istanbul": "TRY", "Asia/Istanbul": "TRY", "Europe/Zurich": "CHF", "Europe/Stockholm": "SEK", "Europe/Oslo": "NOK",
    "Europe/Copenhagen": "DKK", "Europe/Warsaw": "PLN", "Europe/Prague": "CZK", "Europe/Budapest": "HUF", "Europe/Bucharest": "RON",
    "Asia/Dubai": "AED", "Asia/Riyadh": "SAR", "Asia/Qatar": "QAR", "Asia/Bahrain": "BHD", "Asia/Muscat": "OMR",
    "Atlantic/Canary": "EUR", "Atlantic/Madeira": "EUR", "Atlantic/Azores": "EUR", "Asia/Nicosia": "EUR", "Europe/Nicosia": "EUR"
  };
  const localCurrency = () => {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    if (TZ_CUR[tz]) return TZ_CUR[tz];
    if (tz.startsWith("Europe/") && EUROZONE.includes(tz.slice(7))) return "EUR";
    if (tz.startsWith("Australia/")) return "AUD";
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns|Montreal|Moncton|Whitehorse|Yellowknife|Iqaluit)$/.test(tz)) return "CAD";
    return null;
  };
  const fxHint = (usd) => {
    const cur = localCurrency();
    if (!cur || cur === S.currency) return "";
    const rate = PEGS[cur] || (window.FX && window.FX.rates && window.FX.rates[cur]);
    if (!rate) return "";
    const v = usd * rate, step = v >= 10000 ? 100 : 10;
    const txt = new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-GB", { style: "currency", currency: cur, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(Math.round(v / step) * step);
    return ` <span class="gown__fx" title="${esc(t("fxNote", { date: (window.FX && window.FX.date) || "" }))}">≈ ${txt}</span>`;
  };
  const money =(n) => new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: S.currency || "USD", maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d) => d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  // Pre-built, shareable pages (node build.js) are preferred; gown.html?g= is the fallback
  const gownUrl = (g) => ((window.BUILT_GOWNS || []).includes(g.id) ? `gown-${g.id}.html` : `gown.html?g=${g.id}`);
  const currentGownId = () => document.body.dataset.gown || params.get("g");
  const absUrl = (path) => new URL(path, location.href).href;
  const wa = (text) => `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(text)}`;
  const etsyFor = (g) => (g && g.etsy) || S.etsyShop;
  const byId = (id) => G.find((g) => g.id === id);
  const kind = (g) => t(g.collection === "afterparty" ? "apDress" : "weddingDress");
  const gownAlt = (g, i) => `${g.name} — ${L(LABELS.silhouette[g.silhouette])} ${kind(g)}${i ? ` (${i + 1})` : ""}, Burak Altaş Atelier`;

  const LABELS = {
    silhouette: {
      ballgown: { en: "Ball gown", tr: "Prenses" }, aline: { en: "A-line", tr: "A kesim" }, mermaid: { en: "Mermaid", tr: "Balık" },
      column: { en: "Column", tr: "Düz kesim" }, mini: { en: "Mini", tr: "Mini" }
    },
    neckline: {
      strapless: { en: "Strapless", tr: "Straplez" }, sweetheart: { en: "Sweetheart", tr: "Kalp yaka" }, offshoulder: { en: "Off-shoulder", tr: "Omuz açık" },
      square: { en: "Square", tr: "Kare yaka" }, halter: { en: "Halter", tr: "Halter yaka" }, vneck: { en: "V-neck", tr: "V yaka" }, highneck: { en: "High neck", tr: "Dik yaka" }
    },
    features: {
      pearls: { en: "Pearls", tr: "İnci" }, feathers: { en: "Feathers", tr: "Tüy" }, lace: { en: "Lace", tr: "Dantel" }, slit: { en: "Slit", tr: "Yırtmaç" },
      detachable: { en: "Detachable skirt", tr: "Çıkarılabilir etek" }, sleeves: { en: "Sleeves", tr: "Kollu" }, corset: { en: "Corset", tr: "Korse" },
      train: { en: "Train", tr: "Kuyruk" }, gloves: { en: "Opera gloves", tr: "Opera eldiveni" }, beading: { en: "Beading", tr: "Boncuk işleme" }
    }
  };

  /* ---------- Icons ---------- */
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4c3.4 0 5.7 3.6 4.5 7.1-1.7 4.8-9.2 9.4-9.2 9.4z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.2C2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.1 1.3 15.2.1 12 .1 5.5.1.2 5.4.2 11.9c0 2.1.5 4.1 1.6 5.9L.1 24l6.3-1.7c1.7.9 3.7 1.4 5.6 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.3z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 12h18M15 6l6 6-6 6"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M21 12H3M9 6l-6 6 6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 8h18M3 16h12"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M12 3v13M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8zM9 8V6a3 3 0 016 0v2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>'
  };
  ICON.video = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10.5l6-3.5v10l-6-3.5"/></svg>';
  ICON.print = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a2 2 0 012-2h14a2 2 0 012 2v6a1 1 0 01-1 1h-2M7 14h10v7H7z"/></svg>';
  ICON.chat = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 5.5h16v10.5H10l-4.5 3.5V16H4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>';
  ICON.play = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  ICON.pause = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
  ICON.muted = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  ICON.sound = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/></svg>';
  window.BA_ICON = ICON;

  /* ---------- Shortlist ("the chest") ---------- */
  const SL_KEY = "ba-shortlist";
  const shortlist = {
    // A damaged entry (not a list) is treated as empty instead of breaking every page
    all: () => { const v = store.get(SL_KEY, []); return Array.isArray(v) ? [...new Set(v.filter((id) => typeof id === "string" && byId(id)))] : []; },
    has: (id) => shortlist.all().includes(id),
    toggle(id) {
      const list = shortlist.all();
      const i = list.indexOf(id);
      i >= 0 ? list.splice(i, 1) : list.push(id);
      store.set(SL_KEY, list);
      syncHearts();
      return i < 0;
    },
    add(ids) { store.set(SL_KEY, [...new Set([...shortlist.all(), ...ids.filter(byId)])]); syncHearts(); }
  };
  // Hearts added in another tab show up here too
  addEventListener("storage", (e) => {
    if (e.key !== SL_KEY && e.key !== null) return;
    syncHearts();
    if (document.body.dataset.page === "shortlist") renderShortlist();
  });
  function syncHearts() {
    const n = shortlist.all().length;
    $$("[data-sl-count]").forEach((b) => { b.textContent = n || ""; b.dataset.count = n; });
    $$("[data-heart]").forEach((b) => {
      const on = shortlist.has(b.dataset.heart);
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", t("addShortlist"));
    });
  }
  document.addEventListener("click", (e) => {
    const h = e.target.closest("[data-heart]");
    if (!h) return;
    e.preventDefault(); e.stopPropagation();
    const added = shortlist.toggle(h.dataset.heart);
    h.classList.remove("pop"); void h.offsetWidth; h.classList.add("pop");
    toast(added ? t("addedShortlist") : t("removedShortlist"));
    if (page === "shortlist") renderShortlist();
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toastEl() {
    let el = $(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
    return el;
  }
  function toast(msg) {
    const el = toastEl();
    // A modal <dialog> sits in the top layer; the toast must live inside it to be visible
    const host = $("dialog[open]") || document.body;
    if (el.parentElement !== host) host.append(el);
    el.textContent = msg; el.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("is-on"), 2600);
  }

  /* ---------- Share ---------- */
  async function share({ title, text, url }) {
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); toast(t("linkCopied")); }
    catch { window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank", "noopener"); }
  }

  /* ---------- Header / menu / footer ---------- */
  const NAV = [
    { href: "collection.html?c=yakamoz", key: "nav.bridal", en: "Bridal", tr: "Gelinlik", p: "collection" },
    { href: "collection.html?c=afterparty", key: "nav.after", en: "After Party", tr: "After Party", p: "collection-ap" },
    { href: "atelier.html", key: "nav.atelier", en: "Atelier", tr: "Atölye", p: "atelier" },
    { href: "designer.html", key: "nav.designer", en: "The designer", tr: "Tasarımcı", p: "designer" },
    { href: "fitting.html", key: "nav.fitting", en: "Online fitting", tr: "Online prova", p: "fitting" },
    { href: "contact.html", key: "nav.contact", en: "Contact", tr: "İletişim", p: "contact" }
  ];
  function renderChrome() {
    const hdr = $("[data-header]");
    if (hdr) {
      const cur = navCurrent();
      hdr.innerHTML = `
      <div class="wrap hdr__in">
        <nav class="hdr__nav" aria-label="${t("mainNav")}">
          ${["collection", "collection-ap", "atelier", "contact"].map((p) => NAV.find((n) => n.p === p)).map((n, i) => `<a href="${n.href}" data-p="${n.p}" ${i === 3 ? 'class="hdr__nav-x"' : ""} ${n.p === cur ? 'aria-current="page"' : ""}>${L(n)}</a>`).join("")}
        </nav>
        <button class="icon-btn hdr__burger" type="button" aria-label="${t("openMenu")}" aria-expanded="false" data-menu-open>${ICON.menu}</button>
        <a class="logo" href="index.html" aria-label="BA Burak Altaş Atelier — ${t("home")}">
          <span class="logo__mono" aria-hidden="true">B<i>A</i></span>
          <span class="logo__word" aria-hidden="true">Burak Altaş</span>
        </a>
        <div class="hdr__right">
          <div class="lang" role="group" aria-label="${t("language")}">
            <button type="button" data-lang="en" aria-pressed="${lang === "en"}">EN</button><span>/</span><button type="button" data-lang="tr" aria-pressed="${lang === "tr"}">TR</button>
          </div>
          <a class="icon-btn" href="shortlist.html" aria-label="${t("shortlist")}">${ICON.heart.replace("<svg", '<svg fill="none" stroke="currentColor" stroke-width="1.3"')}<span class="badge" data-sl-count></span></a>
          <a class="btn btn--sm hdr__cta" href="fitting.html" ${page === "fitting" ? 'aria-current="page"' : ""}>${t("bookCall")}</a>
        </div>
      </div>`;
    }
    let menu = $(".menu");
    if (!menu) {
      menu = document.createElement("div"); menu.className = "menu"; menu.id = "menu";
      menu.setAttribute("role", "dialog"); menu.setAttribute("aria-modal", "true"); menu.setAttribute("aria-hidden", "true"); menu.inert = true;
      document.body.append(menu);
    }
    menu.setAttribute("aria-label", t("mainNav"));
    menu.innerHTML = `
      <div class="menu__top">
        <span class="logo"><span class="logo__mono" aria-hidden="true">B<i>A</i></span><span class="logo__word">Burak Altaş</span></span>
        <button class="icon-btn" type="button" aria-label="${t("closeMenu")}" data-menu-close>${ICON.close}</button>
      </div>
      <nav class="menu__links" aria-label="${t("mainNav")}">
        ${NAV.map((n, i) => `<a href="${n.href}"><small>0${i + 1}</small><span>${L(n)}</span></a>`).join("")}
      </nav>
      <div class="menu__foot">
        <a href="${wa(t("waGeneral"))}" target="_blank" rel="noopener">WhatsApp</a>
        <a href="${S.instagram}" target="_blank" rel="noopener">Instagram</a>
        <a href="${S.etsyShop}" target="_blank" rel="noopener">Etsy</a>
        <span class="lang"><button type="button" data-lang="en" aria-pressed="${lang === "en"}">EN</button><span>/</span><button type="button" data-lang="tr" aria-pressed="${lang === "tr"}">TR</button></span>
      </div>`;

    const ftr = $("[data-footer]");
    if (ftr) {
      ftr.innerHTML = `
      <div class="wrap">
        <p class="ftr__big" aria-hidden="true">Burak <em>Altaş</em></p>
        <div class="ftr__grid">
          <div class="ftr__about">
            <span class="logo" style="align-items:flex-start"><span class="logo__mono">B<i>A</i></span><span class="logo__word">Burak Altaş Atelier</span></span>
            <p>${t("footerAbout")}</p>
            <a class="btn btn--ghost-light btn--sm" style="justify-self:start" href="${wa(t("waGeneral"))}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>
          </div>
          <div><h3>${t("collections")}</h3><ul class="ftr__list">
            <li><a href="collection.html?c=yakamoz">Yakamoz — Couture 2027</a></li>
            <li><a href="collection.html?c=afterparty">After Party</a></li>
            <li><a href="collection.html">${t("allGowns")}</a></li>
            <li><a href="shortlist.html">${t("shortlist")}</a></li>
          </ul></div>
          <div><h3>${t("atelier")}</h3><ul class="ftr__list">
            <li><a href="atelier.html">${t("ourStory")}</a></li>
            <li><a href="designer.html">${esc((window.DESIGNER && window.DESIGNER.name) || "Burak Altaş")}</a></li>
            <li><a href="fitting.html">${t("bookCall")}</a></li>
            <li><a href="fitting.html#measure-card">${t("measureGuide")}</a></li>
            <li><a href="atelier.html#remote">${t("howRemote")}</a></li>
            <li><a href="atelier.html#faq">${t("faq")}</a></li>
          </ul></div>
          <div><h3>${t("visit")}</h3><ul class="ftr__list">
            <li><a href="${S.mapsUrl}" target="_blank" rel="noopener">${esc(S.address)}</a></li>
            <li><a href="tel:+${S.whatsapp}">${S.phoneDisplay}</a></li>
            <li><a href="mailto:${S.email}">${S.email}</a></li>
            <li><a href="${S.instagram}" target="_blank" rel="noopener">Instagram ${S.instagramHandle}</a></li>
            <li><a href="${S.etsyShop}" target="_blank" rel="noopener">Etsy</a></li>
          </ul></div>
        </div>
        <div class="ftr__base">
          <span>© ${new Date().getFullYear()} Burak Altaş Atelier · ${t("madeIn")}</span>
          <span>${t("etsyNote")}</span>
          <a href="policies.html">${t("policies")}</a>
          <button type="button" class="ftr__forget" data-forget>${t("forget")}</button>
        </div>
      </div>`;
    }

    let fab = $(".fab-wa");
    if (!fab) { fab = document.createElement("a"); fab.className = "fab-wa"; fab.target = "_blank"; fab.rel = "noopener"; document.body.append(fab); }
    const g = page === "gown" ? byId(currentGownId()) : null;
    fab.href = wa(g ? waGownText(g) : t("waGeneral"));
    if (chatOn) {
      // With live chat set up, the button offers a choice: chat here, or WhatsApp
      fab.classList.add("fab-wa--chat");
      fab.setAttribute("aria-label", t("writeUs"));
      fab.setAttribute("aria-haspopup", "dialog");
      fab.setAttribute("aria-expanded", "false");
      fab.dataset.chatOpen = "";
      fab.innerHTML = `${ICON.chat}<span class="fab-wa__dot" aria-hidden="true"></span><span class="fab-wa__tip">${t("writeUs")}</span>`;
    } else {
      fab.setAttribute("aria-label", t("chatWa"));
      fab.innerHTML = `${ICON.wa}<span class="fab-wa__tip">${t("fabTip")}</span>`;
    }
    syncHearts();
  }

  /* ---------- Live chat (Tawk.to) — only loaded when a bride asks for it ---------- */
  const CHAT = S.chat || {};
  const chatOn = /^[a-f0-9]{16,32}$/i.test(CHAT.tawkPropertyId || "");
  let chatState = "idle", chatWantOpen = false, chatIsOpen = false;
  const chatWidget = () => (lang === "tr" && CHAT.tawkWidgetTr) || CHAT.tawkWidgetId || "default";
  // What the atelier sees next to the conversation
  function chatContext() {
    const g = page === "gown" ? byId(currentGownId()) : null;
    const wd = isoDate(store.get("ba-wedding", ""));
    const fav = shortlist.all().map((id) => byId(id).name).join(", ");
    return {
      sayfa: (location.pathname.split("/").pop() || "index.html").slice(0, 80),
      dil: lang === "tr" ? "Türkçe" : "English",
      ...(g && { gelinlik: `${g.name} (${g.no})` }),
      ...(wd && { "dugun-tarihi": fmtDate(new Date(wd + "T00:00:00")) }),
      ...(fav && { favoriler: fav.slice(0, 250) })
    };
  }
  function setChatBusy(on) { const f = $(".fab-wa"); if (f) f.classList.toggle("is-busy", on); }
  function openLiveChat(open = true) {
    if (!chatOn) return;
    closeChatPick();
    const T = window.Tawk_API;
    if (chatState === "ready" && T) {
      try { T.setAttributes(chatContext(), () => {}); } catch {}
      if (open) { T.showWidget(); T.maximize(); }
      return;
    }
    chatWantOpen = chatWantOpen || open;
    if (chatState === "loading") return;
    chatState = "loading";
    if (open) setChatBusy(true);
    const api = (window.Tawk_API = window.Tawk_API || {});
    window.Tawk_LoadStart = new Date();
    api.customStyle = { zIndex: 1000 };
    api.onLoad = () => {
      chatState = "ready"; setChatBusy(false);
      try { api.setAttributes(chatContext(), () => {}); } catch {}
      if (chatWantOpen) { api.showWidget(); api.maximize(); } else api.hideWidget();
    };
    // Our own button stays the only launcher; Tawk's bubble hides whenever the chat is minimised
    api.onChatMaximized = () => { chatIsOpen = true; $(".fab-wa")?.classList.remove("has-unread"); };
    api.onChatMinimized = () => { chatIsOpen = false; api.hideWidget(); };
    api.onChatStarted = () => store.set("ba-chat", 1);
    api.onChatMessageAgent = () => { if (!chatIsOpen) { $(".fab-wa")?.classList.add("has-unread"); toast(t("chatNew")); } };
    const s = document.createElement("script");
    s.async = true; s.charset = "UTF-8"; s.setAttribute("crossorigin", "*");
    s.src = `https://embed.tawk.to/${encodeURIComponent(CHAT.tawkPropertyId)}/${encodeURIComponent(chatWidget())}`;
    s.onerror = () => { chatState = "idle"; setChatBusy(false); toast(t("chatFail")); };
    document.head.append(s);
    // If the chat service can't be reached, don't leave the bride waiting
    setTimeout(() => { if (chatState === "loading" && chatWantOpen) { setChatBusy(false); toast(t("chatSlow")); } }, 9000);
  }
  function chatPickEl() {
    let el = $(".chatpick");
    if (!el) {
      el = document.createElement("div"); el.className = "chatpick"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.id = "chatpick";
      document.body.append(el);
    }
    return el;
  }
  function openChatPick(anchor) {
    const el = chatPickEl();
    el.setAttribute("aria-label", t("writeUs"));
    el.innerHTML = `
      <p class="chatpick__title">${t("chatPickTitle")}</p>
      <button type="button" class="chatpick__opt" data-livechat>${ICON.chat}<span><b>${t("liveChat")}</b><small>${t("liveChatSub")}</small></span></button>
      <a class="chatpick__opt" href="${esc($(".fab-wa")?.href || wa(t("waGeneral")))}" target="_blank" rel="noopener">${ICON.wa}<span><b>WhatsApp</b><small>${t("waSub")}</small></span></a>`;
    el.classList.toggle("is-above-bar", !!anchor?.closest(".actbar"));
    el.hidden = false;
    $$("[data-chat-open]").forEach((b) => b.setAttribute("aria-expanded", "true"));
    $("[data-livechat]", el).focus();
  }
  function closeChatPick() {
    const el = $(".chatpick"); if (!el || el.hidden) return;
    el.hidden = true;
    $$("[data-chat-open]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  function initChat() {
    if (!chatOn) { $$("[data-chat-card]").forEach((c) => (c.hidden = true)); return; }
    $$("[data-chat-card]").forEach((c) => (c.hidden = false));
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-chat-open]");
      if (opener) { e.preventDefault(); const el = chatPickEl(); el.hidden ? openChatPick(opener) : closeChatPick(); return; }
      if (e.target.closest("[data-livechat]")) { e.preventDefault(); openLiveChat(true); return; }
      if (!e.target.closest(".chatpick")) closeChatPick();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$(".chatpick")?.hidden) { closeChatPick(); $("[data-chat-open]")?.focus(); } });
    // A bride who already started a conversation gets the atelier's replies on her next visit
    if (store.get("ba-chat", 0)) setTimeout(() => openLiveChat(false), 2500);
  }

  function initChromeEvents() {
    const hdr = $(".hdr");
    let lastY = scrollY, ticking = false;
    const onScroll = () => {
      const y = scrollY;
      hdr && hdr.classList.toggle("is-scrolled", y > 30);
      if (hdr && !document.body.classList.contains("menu-open")) hdr.classList.toggle("is-hidden", y > 400 && y > lastY + 4);
      if (y < lastY - 4 && hdr) hdr.classList.remove("is-hidden");
      lastY = y; ticking = false;
      const bar = $(".actbar");
      if (bar) bar.classList.toggle("is-on", y > 500);
    };
    addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
    onScroll();

    document.addEventListener("click", (e) => {
      const lb = e.target.closest("[data-lang]");
      if (lb) { setLang(lb.dataset.lang); return; }
      if (e.target.closest("[data-forget]") && confirm(t("forgetAsk"))) {
        // Personal details live only in this browser; let the bride wipe them (shared family laptops)
        try { Object.keys(localStorage).filter((k) => k.startsWith("ba-") && k !== "ba-lang").forEach((k) => localStorage.removeItem(k)); } catch {}
        syncHearts(); toast(t("forgotten")); setTimeout(() => location.reload(), 900); return;
      }
      if (e.target.closest("[data-menu-open]")) openMenu(true);
      if (e.target.closest("[data-menu-close]")) openMenu(false);
      if (e.target.closest(".menu__links a")) openMenu(false);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) openMenu(false); });
  }
  function navCurrent() {
    if (page !== "collection") return page;
    const c = new URLSearchParams(location.search).get("c");
    return c === "afterparty" ? "collection-ap" : c === "yakamoz" ? "collection" : null;
  }
  function syncNavCurrent() {
    const cur = navCurrent();
    $$(".hdr__nav a").forEach((a) => (a.dataset.p === cur ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  }
  function openMenu(on) {
    const menu = $(".menu");
    menu.classList.toggle("is-open", on);
    menu.setAttribute("aria-hidden", String(!on));
    menu.inert = !on;
    // Keep keyboard focus inside the overlay while it is open
    $$("body > :not(.menu):not(script)").forEach((el) => (el.inert = on));
    document.body.classList.toggle("menu-open", on);
    document.body.style.overflow = on ? "hidden" : "";
    $$("[data-menu-open]").forEach((b) => b.setAttribute("aria-expanded", String(on)));
    if (on) setTimeout(() => $(".menu [data-menu-close]").focus(), 50);
    else $("[data-menu-open]")?.focus();
  }

  /* ---------- Reveal on scroll ---------- */
  let io;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) { $$(".reveal,.reveal-img").forEach((el) => el.classList.add("in")); return; }
    io = io || new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    $$(".reveal:not(.in),.reveal-img:not(.in)").forEach((el) => io.observe(el));
  }

  /* ---------- Cursor label ---------- */
  function initCursor() {
    if (!matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const c = document.createElement("div"); c.className = "cursor"; c.setAttribute("aria-hidden", "true"); document.body.append(c);
    let x = 0, y = 0, cx = 0, cy = 0, raf;
    const loop = () => { cx += (x - cx) * .2; cy += (y - cy) * .2; c.style.translate = `${cx}px ${cy}px`; raf = requestAnimationFrame(loop); };
    addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY; if (!raf) loop();
      const tgt = e.target.closest("[data-cursor]");
      if (tgt && !e.target.closest("[data-heart]")) { c.textContent = t(tgt.dataset.cursor); c.classList.add("is-on"); }
      else c.classList.remove("is-on");
    }, { passive: true });
  }

  /* ---------- Cards ---------- */
  const RAIL_SIZES = "(min-width: 1080px) 25vw, (min-width: 640px) 42vw, 78vw";
  /* ---------- Gown videos ---------- */
  const vidType = (p) => (/\.webm$/i.test(p) ? "video/webm" : "video/mp4");
  function videoTile(g) {
    const v = g.video;
    return `<div class="ph ph--video" data-video>
      <video muted loop playsinline preload="none" poster="${esc(src(v.poster, 1400))}" aria-label="${esc(t("videoAlt", { name: g.name }))}"><source src="${esc(at(v.src))}" type="${vidType(v.src)}"></video>
      <span class="vid__tag">${t("inMotion")}</span>
      <button type="button" class="vid__big" data-vid-play aria-label="${t("playVideo")}">${ICON.play}</button>
      <div class="vid__ctl">
        <button type="button" data-vid-play aria-label="${t("playVideo")}">${ICON.play}</button>
        <button type="button" data-vid-sound aria-pressed="false" aria-label="${t("soundOn")}">${ICON.muted}</button>
      </div>
    </div>`;
  }
  // Plays silently while on screen; never on its own when the bride asked for less motion or to save data
  const autoVideo = () => !matchMedia("(prefers-reduced-motion: reduce)").matches && !(navigator.connection && navigator.connection.saveData);
  let vidIO;
  function initVideos(root) {
    if (!root) return;
    vidIO ||= "IntersectionObserver" in window && new IntersectionObserver((es) => es.forEach((e) => {
      const box = e.target, v = $("video", box);
      if (e.isIntersecting && autoVideo() && !box.dataset.userPaused) v.play().catch(() => {});
      else if (!e.isIntersecting && !v.paused) v.pause();
    }), { threshold: 0.5 });
    $$("[data-video]", root).forEach((box) => {
      const v = $("video", box);
      const sync = () => {
        box.classList.toggle("is-playing", !v.paused);
        $$("[data-vid-play]", box).forEach((b) => { b.innerHTML = v.paused ? ICON.play : ICON.pause; b.setAttribute("aria-label", t(v.paused ? "playVideo" : "pauseVideo")); });
        const snd = $("[data-vid-sound]", box);
        snd.innerHTML = v.muted ? ICON.muted : ICON.sound; snd.setAttribute("aria-pressed", String(!v.muted)); snd.setAttribute("aria-label", t(v.muted ? "soundOn" : "soundOff"));
      };
      ["play", "pause", "volumechange"].forEach((ev) => v.addEventListener(ev, sync));
      box.addEventListener("click", (e) => {
        if (e.target.closest("[data-vid-sound]")) { v.muted = !v.muted; if (!v.muted && v.paused) v.play().catch(() => {}); return; }
        // Anywhere else on the frame: play / pause
        if (v.paused) { delete box.dataset.userPaused; v.play().catch(() => {}); } else { box.dataset.userPaused = "1"; v.pause(); }
      });
      if (!autoVideo()) box.classList.add("is-manual");
      vidIO && vidIO.observe(box);
      sync();
    });
  }
  // Collection cards: hovering a gown with a video plays it (mouse only, never on phones)
  function initCardPreviews() {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.addEventListener("mouseover", (e) => {
      // The card's link layer covers the whole card, so listen on the card rather than the image
      const c = e.target.closest && e.target.closest(".card"), m = c && $(".card__media[data-preview]", c);
      if (!m || c.contains(e.relatedTarget) || !autoVideo()) return;
      let v = $("video", m);
      if (!v) {
        v = document.createElement("video");
        Object.assign(v, { muted: true, loop: true, playsInline: true, preload: "auto", src: m.dataset.preview });
        v.setAttribute("aria-hidden", "true");
        v.addEventListener("playing", () => m.classList.add("is-vid"));
        m.append(v);
      }
      v.play().catch(() => {});
    });
    document.addEventListener("mouseout", (e) => {
      const c = e.target.closest && e.target.closest(".card"), m = c && $(".card__media[data-preview]", c);
      if (!m || c.contains(e.relatedTarget)) return;
      const v = $("video", m);
      m.classList.remove("is-vid");
      if (v) v.pause();
    });
  }
  function card(g, { sizes = RAIL_SIZES, cls = "" } = {}) {
    const second = g.images[1] || g.images[0];
    const price = S.showPrices && g.price ? `<p class="card__price">${t("from")} <b>${money(g.price)}</b></p>` : "";
    return `
    <article class="card reveal ${cls}" data-cursor="view" data-vt="${g.id}">
      <div class="card__media"${g.video ? ` data-preview="${esc(at(g.video.src))}"` : ""}>
        <span class="card__no">${g.no}</span>
        ${g.concept ? `<span class="card__concept">${t("conceptTag")}</span>` : ""}
        ${g.video ? `<span class="card__vid" title="${t("hasVideo")}">${ICON.play}<span class="sr-only">${t("hasVideo")}</span></span>` : ""}
        ${img(g.images[0], gownAlt(g, 0), { sizes })}
        ${second !== g.images[0] ? img(second, "", { sizes }) : ""}
      </div>
      <div class="card__body">
        <h3 class="card__name"><a href="${gownUrl(g)}">${esc(g.name)}</a></h3>
        <button class="heart" type="button" data-heart="${g.id}" aria-pressed="false" aria-label="${t("addShortlist")}">${ICON.heart}</button>
        <p class="card__meaning">${esc(L(g.meaning))}</p>
        ${price}
      </div>
    </article>`;
  }
  // A bride's review; with her photo it becomes the site's strongest trust signal
  function reviewCard(r) {
    return `<figure class="review reveal ${r.photo ? "review--photo" : ""}">
      ${r.photo ? `<div class="ph arch review__ph">${img(r.photo, t("brideAlt", { name: r.name, gown: r.gown || "" }), { sizes: "(min-width: 900px) 180px, 32vw", w: 600 })}</div>` : ""}
      <div class="review__body">
        <blockquote>${esc(L(r.text))}</blockquote>
        <figcaption>${esc(r.name)}${L(r.place) ? ` · ${esc(L(r.place))}` : ""}${r.gown ? ` · ${t("wore")} ${esc(r.gown)}` : ""}</figcaption>
      </div>
    </figure>`;
  }

  // View-transition morph: name the clicked card image so it flies into the gown page
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".card__name a");
    if (!a) return;
    const im = a.closest(".card").querySelector(".card__media img");
    if (!im) return;
    $$("[style*=\"view-transition-name\"]").forEach((el) => (el.style.viewTransitionName = ""));
    im.style.viewTransitionName = "gown-hero";
  });
  addEventListener("pageshow", () => $$(".card__media img").forEach((i) => (i.style.viewTransitionName = "")));

  function initRails() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-rail]");
      if (!b) return;
      const rail = document.getElementById(b.dataset.rail);
      const step = (rail.firstElementChild?.getBoundingClientRect().width || 300) + 24;
      rail.scrollBy({ left: b.dataset.dir === "prev" ? -step : step, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  }

  /* ---------- WhatsApp message builders ---------- */
  function waGownText(g, extra = "") {
    const wd = isoDate(store.get("ba-wedding", ""));
    return t("waGown", { name: g.name, no: g.no, url: absUrl(gownUrl(g)) }) + (extra ? "\n" + extra : "") + "\n" + t("waDate") + (wd ? fmtDate(new Date(wd + "T00:00:00")) : "");
  }

  /* ---------- Gown finder ---------- */
  const FINDER = [
    { key: "venue", q: { en: "Where will you say yes?", tr: "“Evet” diyeceğiniz yer neresi?" }, opts: [
      { v: "grand", t: { en: "A grand ballroom", tr: "Görkemli bir düğün salonu" }, d: { en: "Chandeliers, staircases, drama", tr: "Avizeler, merdivenler, ihtişam" }, w: { s: { ballgown: 3, mermaid: 1 }, f: { train: 2, corset: 1 } } },
      { v: "nature", t: { en: "Seaside or garden", tr: "Deniz kıyısı ya da bahçe" }, d: { en: "Light fabrics that move", tr: "Uçuşan, hafif kumaşlar" }, w: { s: { aline: 3, mermaid: 1 } } },
      { v: "city", t: { en: "City hall & dinner", tr: "Nikâh dairesi ve akşam yemeği" }, d: { en: "Clean, modern, chic", tr: "Sade, modern, şık" }, w: { s: { column: 3, mini: 2 } } },
      { v: "faith", t: { en: "Church, mosque or temple", tr: "Kilise, cami ya da mabet" }, d: { en: "Elegant and more covered", tr: "Zarif ve daha kapalı" }, w: { s: { aline: 1, ballgown: 1 }, f: { sleeves: 4, lace: 1 }, n: { highneck: 3 } } }
    ] },
    { key: "shape", q: { en: "Which shape feels like you?", tr: "Hangi siluet sizi yansıtıyor?" }, opts: [
      { v: "princess", t: { en: "Princess", tr: "Prenses" }, d: { en: "Full skirt, fitted corset", tr: "Kabarık etek, oturan korse" }, w: { s: { ballgown: 4 } } },
      { v: "romantic", t: { en: "Romantic & flowing", tr: "Romantik ve akışkan" }, d: { en: "A soft A-line", tr: "Yumuşak A kesim" }, w: { s: { aline: 4 } } },
      { v: "sculpted", t: { en: "Sculpted", tr: "Heykel gibi" }, d: { en: "Hugs every curve", tr: "Vücudu saran balık" }, w: { s: { mermaid: 4 } } },
      { v: "minimal", t: { en: "Minimal", tr: "Minimal" }, d: { en: "Straight, clean lines", tr: "Düz, temiz çizgiler" }, w: { s: { column: 4 } } },
      { v: "short", t: { en: "Short & playful", tr: "Kısa ve eğlenceli" }, d: { en: "Made for dancing", tr: "Dans etmek için" }, w: { s: { mini: 5 } } }
    ] },
    { key: "detail", q: { en: "Pick the detail you can't live without", tr: "Vazgeçemeyeceğiniz detay hangisi?" }, opts: [
      { v: "pearls", t: { en: "Pearls", tr: "İnciler" }, d: { en: "Hand-sewn, one by one", tr: "Tek tek elde dikilir" }, w: { f: { pearls: 4, beading: 1 } } },
      { v: "feathers", t: { en: "Feathers", tr: "Tüyler" }, d: { en: "Soft movement, pure joy", tr: "Hafiflik ve neşe" }, w: { f: { feathers: 5 } } },
      { v: "lace", t: { en: "Lace", tr: "Dantel" }, d: { en: "Timeless and romantic", tr: "Zamansız ve romantik" }, w: { f: { lace: 4 } } },
      { v: "clean", t: { en: "Nothing at all", tr: "Hiçbiri" }, d: { en: "The cut speaks", tr: "Kesim konuşsun" }, w: { s: { column: 2 }, f: { slit: 2 } } }
    ] },
    { key: "neck", q: { en: "How much shoulder?", tr: "Omuzlar ne kadar açık olsun?" }, opts: [
      { v: "bare", t: { en: "Bare shoulders", tr: "Tamamen açık" }, d: { en: "Strapless or sweetheart", tr: "Straplez ya da kalp yaka" }, w: { n: { strapless: 3, sweetheart: 3 } } },
      { v: "off", t: { en: "Off the shoulder", tr: "Düşük omuz" }, d: { en: "Soft and romantic", tr: "Yumuşak ve romantik" }, w: { n: { offshoulder: 4 } } },
      { v: "covered", t: { en: "Sleeves, please", tr: "Kollu olsun" }, d: { en: "Lace sleeves, high neck", tr: "Dantel kol, dik yaka" }, w: { f: { sleeves: 9 }, n: { highneck: 7 } } },
      { v: "any", t: { en: "Surprise me", tr: "Beni şaşırtın" }, d: { en: "Show me everything", tr: "Hepsini görmek isterim" }, w: {} }
    ] }
  ];
  function scoreGowns(answers) {
    return G.map((g) => {
      let sc = g.featured ? 0.5 : 0;
      answers.forEach((o) => {
        if (!o) return;
        sc += (o.w.s && o.w.s[g.silhouette]) || 0;
        sc += (o.w.n && o.w.n[g.neckline]) || 0;
        if (o.w.f) g.features.forEach((f) => (sc += o.w.f[f] || 0));
      });
      return { g, sc };
    }).sort((a, b) => b.sc - a.sc).slice(0, 4).map((x) => x.g);
  }
  function initFinder() {
    const dlg = document.createElement("dialog");
    dlg.className = "finder-dlg";
    dlg.setAttribute("aria-labelledby", "finder-title");
    document.body.append(dlg);
    let step = 0, answers = [];
    const render = () => {
      const done = step >= FINDER.length;
      const q = FINDER[step];
      dlg.innerHTML = `
      <div class="modal">
        <div>
          <div class="modal__top">
            <span class="eyebrow eyebrow--plain" id="finder-title">${t("finderTitle")} · ${done ? t("finderDone") : `${step + 1} / ${FINDER.length}`}</span>
            <button class="icon-btn" type="button" data-close aria-label="${t("close")}">${ICON.close}</button>
          </div>
          <div class="finder__progress"><i style="width:${(Math.min(step, FINDER.length) / FINDER.length) * 100}%"></i></div>
        </div>
        <div class="modal__body">
          ${done ? `
            <div class="finder__q">
              <h2 class="display h3">${t("finderResult")}</h2>
              <p class="lede">${t("finderResultSub")}</p>
              <div class="finder__nav finder__nav--top">
                <button class="link" type="button" data-restart>${t("startOver")}</button>
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                  <button class="btn btn--ghost" type="button" data-save-all>${t("saveAll")}</button>
                  <a class="btn btn--wa" target="_blank" rel="noopener" href="${wa(t("waFinder", { list: scoreGowns(answers).map((g) => g.name).join(", ") }))}">${ICON.wa} ${t("askAbout")}</a>
                </div>
              </div>
              <div class="finder__results">${scoreGowns(answers).map((g) => card(g, { sizes: "(min-width: 700px) 220px, 45vw" })).join("")}</div>
            </div>` : `
            <div class="finder__q">
              <h2 class="display h3">${L(q.q)}</h2>
              <div class="finder__opts" role="group" aria-label="${esc(L(q.q))}">
                ${q.opts.map((o, i) => `<button type="button" class="finder__opt" data-opt="${i}" aria-pressed="${answers[step] === o}"><b>${L(o.t)}</b><span>${L(o.d)}</span></button>`).join("")}
              </div>
              <div class="finder__nav">
                ${step ? `<button class="link" type="button" data-back>${ICON.arrowL} ${t("back")}</button>` : "<span></span>"}
                <button class="link" type="button" data-skip>${t("skip")}</button>
              </div>
            </div>`}
        </div>
      </div>`;
      syncHearts();
      $$(".reveal", dlg).forEach((el) => el.classList.add("in"));
    };
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.closest("[data-close]")) { dlg.close(); return; }
      const o = e.target.closest("[data-opt]");
      if (o) { answers[step] = FINDER[step].opts[+o.dataset.opt]; step++; render(); dlg.querySelector("button")?.focus(); return; }
      if (e.target.closest("[data-back]")) { step--; render(); return; }
      if (e.target.closest("[data-skip]")) { answers[step] = null; step++; render(); return; }
      if (e.target.closest("[data-restart]")) { step = 0; answers = []; render(); return; }
      if (e.target.closest("[data-save-all]")) { shortlist.add(scoreGowns(answers).map((g) => g.id)); toast(t("savedAll")); }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("[data-finder]")) return;
      e.preventDefault(); step = 0; answers = []; render(); dlg.showModal();
    });
    rerenders.push(() => dlg.open && render());
  }

  /* ---------- "Do I have time?" timeline ---------- */
  function initTimelines() {
    $$("[data-timeline]").forEach((box) => {
      let value = isoDate(store.get("ba-wedding", ""));
      const draw = () => {
        box.innerHTML = `
          <div class="tc__row">
            <label class="field"><span>${t("tcLabel")}</span><input class="input" type="date" value="${value}" min="${localISO()}" data-tc-date></label>
            <button class="btn" type="button" data-tc-go>${t("tcGo")}</button>
          </div>
          <div class="tc__result" aria-live="polite"></div>`;
        if (value) calc();
      };
      const calc = () => {
        const res = $(".tc__result", box);
        if (!value) { res.classList.remove("is-on"); return; }
        const weeks = (box.dataset.weeks || `${S.production.minWeeks},${S.production.maxWeeks}`).split(",").map(Number);
        const day = 864e5, today = new Date(); today.setHours(0, 0, 0, 0);
        const wedding = new Date(value + "T00:00:00");
        const ship = S.production.shippingDays, buffer = 14;
        const orderBy = new Date(wedding - (weeks[1] * 7 + ship + buffer) * day);
        const expressBy = new Date(wedding - (S.production.expressWeeks * 7 + ship + 7) * day);
        const daysLeft = Math.round((wedding - today) / day);
        let tone, verdict;
        if (daysLeft < 0) { tone = "late"; verdict = t("tcPast"); }
        else if (today <= orderBy) { tone = "ok"; verdict = t("tcOk", { date: fmtDate(orderBy) }); }
        else if (today <= expressBy) { tone = "tight"; verdict = t("tcTight"); }
        else { tone = "late"; verdict = t("tcLate"); }
        const start = today > orderBy ? today : orderBy;
        const at = (w) => new Date(+start + w * day);
        const prodEnd = tone === "tight" ? S.production.expressWeeks * 7 : weeks[1] * 7;
        const ms = [
          { k: "tcM1", d: start, key: true },
          { k: "tcM2", d: at(14) },
          { k: "tcM3", d: at(Math.round(prodEnd * .45)) },
          { k: "tcM4", d: at(prodEnd - 7) },
          { k: "tcM5", d: at(prodEnd) },
          { k: "tcM6", d: at(prodEnd + ship) },
          { k: "tcM7", d: wedding, key: true }
        ];
        res.innerHTML = `
          <p class="tc__verdict" data-tone="${tone}">${verdict}</p>
          ${tone !== "late" ? `<ol class="tc__track">${ms.map((m) => `<li class="${m.d <= today ? "is-past" : ""} ${m.key ? "is-key" : ""}"><span>${t(m.k)}</span><time datetime="${m.d.toISOString().slice(0, 10)}">${fmtDate(m.d)}</time></li>`).join("")}</ol>` : ""}
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="${wa(t("waTimeline", { date: fmtDate(wedding) }))}">${ICON.wa} ${t("tcAsk")}</a>
          </div>`;
        res.classList.add("is-on");
      };
      box.addEventListener("click", (e) => { if (e.target.closest("[data-tc-go]")) { value = $("[data-tc-date]", box).value; store.set("ba-wedding", value); calc(); } });
      box.addEventListener("change", (e) => { if (e.target.matches("[data-tc-date]")) { value = e.target.value; store.set("ba-wedding", value); calc(); } });
      onLang(draw);
    });
  }

  /* ======================================================================
     PAGES
     ====================================================================== */

  /* ---------- Home ---------- */
  function pageHome() {
    // Hero slideshow inside the arch
    const heroImgs = $$(".hero__img img");
    if (heroImgs.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let i = 0;
      setInterval(() => { heroImgs[i].classList.remove("is-on"); i = (i + 1) % heroImgs.length; heroImgs[i].classList.add("is-on"); }, 6000);
    }
    const featured = G.filter((g) => g.collection === "yakamoz" && g.featured);
    const ap = G.filter((g) => g.collection === "afterparty");
    onLang(() => {
      const rail = $("#rail-featured");
      if (rail) rail.innerHTML = featured.map((g) => card(g)).join("");
      const rail2 = $("#rail-ap");
      if (rail2) rail2.innerHTML = ap.map((g) => card(g)).join("");
      $$("[data-sil-count]").forEach((el) => { const n = G.filter((g) => g.silhouette === el.dataset.silCount).length; el.textContent = t(n === 1 ? "nGown" : "nGowns", { n }); });
      const rev = $("#reviews");
      if (rev) rev.innerHTML = R.map(reviewCard).join("");
      const ig = $("#insta");
      if (ig) ig.innerHTML = G.slice(0, 6).map((g) => `<a href="${S.instagram}" target="_blank" rel="noopener" aria-label="Instagram — ${esc(g.name)}">${img(g.images[g.images.length > 1 ? 1 : 0], "", { sizes: "(min-width: 900px) 16vw, 33vw", w: 500 })}</a>`).join("");
      syncHearts();
    });
  }

  /* ---------- Collection ---------- */
  function pageCollection() {
    const GROUPS = [
      { key: "s", field: "silhouette", label: "silhouette" },
      { key: "n", field: "neckline", label: "neckline" },
      { key: "f", field: "features", label: "details" }
    ];
    // URL params are untrusted: keep only known values (also dedupes)
    const pick = (key, field) => [...new Set((params.get(key) || "").split(","))].filter((v) => Object.hasOwn(LABELS[field], v));
    const state = {
      c: C.some((c) => c.id === params.get("c")) ? params.get("c") : "",
      s: pick("s", "silhouette"),
      n: pick("n", "neckline"),
      f: pick("f", "features"),
      sort: ["featured", "low", "high"].includes(params.get("sort")) ? params.get("sort") : "featured"
    };
    const avail = (field) => [...new Set(G.filter((g) => !state.c || g.collection === state.c).flatMap((g) => [].concat(g[field])))];

    const syncUrl = () => {
      const p = new URLSearchParams();
      if (state.c) p.set("c", state.c);
      ["s", "n", "f"].forEach((k) => state[k].length && p.set(k, state[k].join(",")));
      if (state.sort !== "featured") p.set("sort", state.sort);
      if (new URLSearchParams(location.search).has("lang")) p.set("lang", lang);
      history.replaceState(null, "", "collection.html" + (p.toString() ? "?" + p : ""));
      syncNavCurrent();
    };
    const list = () => {
      let l = G.filter((g) => (!state.c || g.collection === state.c)
        && (!state.s.length || state.s.includes(g.silhouette))
        && (!state.n.length || state.n.includes(g.neckline))
        && (!state.f.length || state.f.every((f) => g.features.includes(f))));
      if (state.sort === "low") l = [...l].sort((a, b) => a.price - b.price);
      else if (state.sort === "high") l = [...l].sort((a, b) => b.price - a.price);
      else l = [...l].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      return l;
    };

    const head = () => {
      const col = C.find((c) => c.id === state.c);
      $("#coll-title").innerHTML = col ? `${esc(L(col.name))}` : t("allGownsTitle");
      $("#coll-eyebrow").textContent = col ? col.season : t("theCollections");
      $("#coll-lede").textContent = col ? L(col.meaning) : t("collLede");
      document.title = `${col ? L(col.name) + " — " : ""}${t("collectionMeta")} | Burak Altaş Atelier`;
      $$("[data-coll]").forEach((b) => { const on = b.dataset.coll === state.c; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
    };
    const panel = () => {
      $("#fpanel").innerHTML = `<div class="fpanel__groups">${GROUPS.map((gr) => `
        <fieldset class="fpanel__group" style="border:0;padding:0;margin:0">
          <legend class="sr-only">${t(gr.label)}</legend><span aria-hidden="true">${t(gr.label)}</span>
          <div class="chips">${avail(gr.field).map((v) => `<label class="chip"><input type="checkbox" data-k="${gr.key}" value="${v}" ${state[gr.key].includes(v) ? "checked" : ""}><span>${L(LABELS[gr.field][v])}</span></label>`).join("")}</div>
        </fieldset>`).join("")}
        <label class="field" style="max-width:260px"><span>${t("sortBy")}</span>
          <select class="select" id="sort">
            <option value="featured" ${state.sort === "featured" ? "selected" : ""}>${t("sortFeatured")}</option>
            <option value="low" ${state.sort === "low" ? "selected" : ""}>${t("sortLow")}</option>
            <option value="high" ${state.sort === "high" ? "selected" : ""}>${t("sortHigh")}</option>
          </select></label>
        <p class="small">${t("anyGownModest")}</p>
        <button type="button" class="btn btn--sm fpanel__show" data-showres></button>
      </div>`;
      showLabel();
    };
    const tags = () => {
      const all = GROUPS.flatMap((gr) => state[gr.key].map((v) => ({ k: gr.key, v, l: L(LABELS[gr.field][v]) })));
      $("#active-tags").innerHTML = all.map((a) => `<button type="button" data-rm="${a.k}:${esc(a.v)}" aria-label="${t("remove")} ${esc(a.l)}">${esc(a.l)}</button>`).join("")
        + (all.length ? `<button type="button" data-clear class="link" style="background:none">${t("clearAll")}</button>` : "");
      const n = all.length;
      $("#fbtn-filter").classList.toggle("is-active", n > 0);
      $("#fbtn-filter span").textContent = n ? `${t("filter")} (${n})` : t("filter");
    };
    const showLabel = () => { const b = $("[data-showres]"); if (b) { const n = list().length; b.textContent = n === 1 ? t("showN1") : t("showN", { n }); } };
    const grid = () => {
      const l = list();
      showLabel();
      $("#count").textContent = t(l.length === 1 ? "nGown" : "nGowns", { n: l.length });
      $("#grid").innerHTML = l.length ? l.map((g) => card(g, { sizes: "(min-width: 1300px) 23vw, (min-width: 900px) 31vw, 46vw" })).join("")
        : `<div class="grid-empty" style="grid-column:1/-1"><p class="display h3">${t("noMatch")}</p><p class="lede">${t("noMatchSub")}</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn btn--ghost" type="button" data-clear>${t("clearAll")}</button><a class="btn btn--wa" target="_blank" rel="noopener" href="${wa(t("waCustom"))}">${ICON.wa} ${t("askCustom")}</a></div></div>`;
      syncHearts(); observeReveals();
    };
    const all = () => { head(); panel(); tags(); grid(); syncUrl(); };

    document.addEventListener("change", (e) => {
      const cb = e.target.closest("[data-k]");
      if (cb) { const k = cb.dataset.k; state[k] = state[k].filter((v) => v !== cb.value); if (cb.checked) state[k].push(cb.value); tags(); grid(); syncUrl(); }
      if (e.target.id === "sort") { state.sort = e.target.value; grid(); syncUrl(); }
    });
    document.addEventListener("click", (e) => {
      const cb = e.target.closest("[data-coll]");
      if (cb) { state.c = cb.dataset.coll; state.s = []; state.n = []; state.f = []; all(); return; }
      const rm = e.target.closest("[data-rm]");
      if (rm) { const [k, v] = rm.dataset.rm.split(":"); state[k] = state[k].filter((x) => x !== v); panel(); tags(); grid(); syncUrl(); return; }
      if (e.target.closest("[data-clear]")) { state.s = []; state.n = []; state.f = []; panel(); tags(); grid(); syncUrl(); return; }
      if (e.target.closest("[data-showres]")) {
        $("#fpanel").classList.remove("is-open"); $("#fbtn-filter").setAttribute("aria-expanded", "false");
        $("#grid").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        return;
      }
      const fb = e.target.closest("#fbtn-filter");
      if (fb) { const p = $("#fpanel"); const open = !p.classList.contains("is-open"); p.classList.toggle("is-open", open); fb.setAttribute("aria-expanded", String(open)); }
    });
    onLang(all);
  }

  /* ---------- Gown detail ---------- */
  function pageGown() {
    const g = byId(currentGownId());
    if (!g) {
      const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex"; document.head.append(m);
      onLang(() => {
        document.title = `${t("gownMissing")} | Burak Altaş Atelier`;
        $("#gown").innerHTML = `<div class="wrap grid-empty" style="grid-column:1/-1;padding-block:120px"><p class="display h3">${t("gownMissing")}</p><p class="lede">${t("gownMissingSub")}</p><a class="btn" href="collection.html">${t("explore")}</a></div>`;
        $$("main > section").forEach((sec) => (sec.hidden = true));
      });
      return;
    }
    const col = C.find((c) => c.id === g.collection);
    const isMini = g.silhouette === "mini";
    // x = which price in SITE.extras applies to each choice (set in the admin panel)
    const OPTS = [
      { k: "colour", en: "Colour", tr: "Renk", x: [null, "colour", "colour", "colour"], v: [{ en: "Ivory", tr: "Fildişi" }, { en: "Off-white", tr: "Kırık beyaz" }, { en: "Champagne", tr: "Şampanya" }, { en: "Blush", tr: "Pudra" }] },
      ...(isMini ? [] : [
        { k: "sleeves", en: "Sleeves", tr: "Kollar", x: [null, "sleevesLong", "sleevesDetachable"], v: [{ en: "As shown", tr: "Görseldeki gibi" }, { en: "Add long sleeves", tr: "Uzun kol ekle" }, { en: "Detachable sleeves", tr: "Takılıp çıkarılabilir kol" }] },
        { k: "train", en: "Train", tr: "Kuyruk", x: [null, "trainShorter", "trainCathedral"], v: [{ en: "As shown", tr: "Görseldeki gibi" }, { en: "Shorter", tr: "Daha kısa" }, { en: "Cathedral", tr: "Katedral boy" }] }
      ])
    ];
    const chosen = {};
    const EX = S.extras || {};
    // null = no price shown for this choice, 0 = free, n = +$n
    const extraOf = (o, i) => { const key = o.x[i]; if (!key) return null; const v = EX[key]; return v === null || v === undefined || v === "" || !Number.isFinite(+v) ? null : +v; };
    const extraLabel = (n) => (n === null ? "" : n === 0 ? t("free") : `+${money(n)}`);
    const total = () => g.price + Object.entries(chosen).reduce((s, [k, i]) => s + (extraOf(OPTS.find((o) => o.k === k), i) || 0), 0);
    const optText = () => Object.entries(chosen).map(([k, i]) => { const o = OPTS.find((x) => x.k === k); const n = extraOf(o, i); return `${L(o)}: ${L(o.v[i])}${n ? ` (+${money(n)})` : ""}`; }).join(" · ");
    const priceHtml = () => {
      const tot = total();
      return `${t("from")} <b>${money(tot)}</b> ${t("madeToMeasure")}${fxHint(tot)}${tot > g.price ? `<span class="gown__price-note">${t("withChoices")}</span>` : ""}`;
    };

    const render = () => {
      document.title = `${g.name} — ${L(LABELS.silhouette[g.silhouette])} ${kind(g)} | Burak Altaş Atelier`;
      const meta = $('meta[name="description"]'); if (meta) meta.content = L(g.story);
      $("#gown").innerHTML = `
      <div>
        <div class="gown__gallery" id="gallery" aria-label="${t("gallery")}">
          ${g.images.map((id, i) => (i === 1 && g.video ? videoTile(g) : "") + `<button class="ph" type="button" data-zoom="${i}" aria-label="${t("zoomImage")} ${i + 1}" ${i === 0 ? 'style="view-transition-name:gown-hero"' : ""}>${img(id, gownAlt(g, i), { sizes: i === 0 ? "(min-width: 1000px) 55vw, 88vw" : "(min-width: 1000px) 28vw, 88vw", eager: i === 0, w: 1400 })}</button>`).join("")}${g.video && g.images.length < 2 ? videoTile(g) : ""}
        </div>
        <div class="gown__dots" aria-hidden="true">${[...g.images, ...(g.video ? [0] : [])].map((_, i) => `<i class="${i ? "" : "is-on"}"></i>`).join("")}</div>
      </div>
      <aside class="gown__panel">
        <div class="gown__panel-in">
          <ol class="crumbs" aria-label="${t("breadcrumb")}">
            <li><a href="index.html">${t("home")}</a></li>
            <li><a href="collection.html?c=${g.collection}">${esc(L(col.name))}</a></li>
            <li aria-current="page">${g.no}</li>
          </ol>
          <div>
            <h1 class="gown__name">${esc(g.name)}</h1>
            <p class="gown__meaning">— ${esc(L(g.meaning))}</p>
            ${g.draft ? `<p class="gown__concept"><b>Taslak önizleme</b> Bu model sitede henüz görünmüyor; panelde "Taslak" kutusunu kaldırınca yayına girer.</p>` : ""}
            ${g.concept ? `<p class="gown__concept"><b>${t("conceptTag")}</b> ${t("conceptNote")}</p>` : ""}
          </div>
          ${S.showPrices && g.price ? `<div><p class="gown__price" id="gown-price" aria-live="polite">${priceHtml()}</p><p class="small mt-s">${t("currencyNote")}</p></div>` : ""}
          <p class="gown__story">${esc(L(g.story))}</p>
          <dl class="specs">
            <dt>${t("silhouette")}</dt><dd>${L(LABELS.silhouette[g.silhouette])}</dd>
            <dt>${t("neckline")}</dt><dd>${L(LABELS.neckline[g.neckline])}</dd>
            ${L(g.fabric) ? `<dt>${t("fabric")}</dt><dd>${esc(L(g.fabric))}</dd>` : ""}
            ${g.features.length ? `<dt>${t("details")}</dt><dd>${g.features.map((f) => L(LABELS.features[f])).join(" · ")}</dd>` : ""}
            ${g.hours ? `<dt>${t("handwork")}</dt><dd>${t("hoursN", { n: g.hours })}</dd>` : ""}
            <dt>${t("leadTime")}</dt><dd>${t("weeksN", { a: g.weeks[0], b: g.weeks[1] })}</dd>
            ${g.model && (g.model.height || g.model.size) ? `<dt>${t("onModel")}</dt><dd>${[g.model.height ? `${g.model.height} cm` : "", esc(g.model.size || "")].filter(Boolean).join(" · ")}</dd>` : ""}
          </dl>
          <div class="opts">
            <p class="eyebrow eyebrow--plain">${t("makeYours")}</p>
            ${OPTS.map((o) => `<fieldset class="fpanel__group" style="border:0;padding:0;margin:0"><legend class="sr-only">${L(o)}</legend><span aria-hidden="true">${L(o)}</span>
              <div class="chips">${o.v.map((v, i) => `<label class="chip"><input type="radio" name="opt-${o.k}" value="${i}" data-opt="${o.k}" ${chosen[o.k] === i ? "checked" : ""}><span>${L(v)}${S.showPrices && extraLabel(extraOf(o, i)) ? `<small class="chip__price">${extraLabel(extraOf(o, i))}</small>` : ""}</span></label>`).join("")}</div></fieldset>`).join("")}
          </div>
          <div class="gown__ctas">
            <a class="btn btn--etsy btn--block" href="${etsyFor(g)}" target="_blank" rel="noopener" data-etsy>${ICON.bag} ${t("orderEtsy")}</a>
            <div class="gown__ctas-row">
              <a class="btn btn--wa" href="#" target="_blank" rel="noopener" data-wa-gown>${ICON.wa} ${t("askWa")}</a>
              <button class="icon-btn heart" style="margin:0" type="button" data-heart="${g.id}" aria-pressed="false" aria-label="${t("addShortlist")}">${ICON.heart}</button>
              <button class="icon-btn" type="button" data-share aria-label="${t("share")}">${ICON.share}</button>
            </div>
            <a class="btn btn--ghost btn--block" href="fitting.html?type=consult&g=${g.id}">${ICON.video} ${t("bookGownCall")}</a>
            <p class="gown__note">${ICON.shield}<span>${t("etsyProtect")}</span></p>
          </div>
          <div class="acc">
            <details><summary>${t("accFit")}</summary><div class="acc__body">${t("accFitBody")}</div></details>
            <details><summary>${t("accShip")}</summary><div class="acc__body">${t("accShipBody", { a: g.weeks[0], b: g.weeks[1] })}</div></details>
            <details><summary>${t("accCare")}</summary><div class="acc__body">${t("accCareBody")}</div></details>
          </div>
        </div>
      </aside>`;
      updateWa();
      syncHearts();

      // Pairing + more from collection
      const pair = G.filter((x) => x.id !== g.id && (isMini ? x.collection === "yakamoz" && x.featured : x.collection === "afterparty")).slice(0, 4);
      const more = G.filter((x) => x.id !== g.id && x.collection === g.collection).slice(0, 8);
      $("#pair-title").textContent = isMini ? t("pairBridal") : t("pairAP");
      $("#rail-pair").innerHTML = pair.map((x) => card(x)).join("");
      $("#rail-more").innerHTML = more.map((x) => card(x)).join("");
      // Real brides who wore this exact gown — the strongest proof a photo is real
      const brides = (R || []).filter((r) => r.gown && r.gown.toLocaleLowerCase("tr") === g.name.toLocaleLowerCase("tr"));
      const bs = $("#brides-sec");
      if (bs) {
        bs.hidden = !brides.length;
        $("#brides-title").innerHTML = t("bridesWore", { name: esc(g.name) });
        $("#gown-brides").innerHTML = brides.map(reviewCard).join("");
      }
      $("#tl").dataset.weeks = g.weeks.join(",");

      // Mobile action bar
      let bar = $(".actbar");
      if (!bar) { bar = document.createElement("div"); bar.className = "actbar"; document.body.append(bar); document.body.classList.add("has-bar"); }
      bar.innerHTML = (chatOn
        ? `<button type="button" class="btn btn--wa" data-chat-open aria-haspopup="dialog" aria-expanded="false">${ICON.chat} ${t("writeUs")}</button>`
        : `<a class="btn btn--wa" target="_blank" rel="noopener" data-wa-gown href="#">${ICON.wa} WhatsApp</a>`)
        + `<a class="btn" href="${etsyFor(g)}" target="_blank" rel="noopener">${ICON.bag} Etsy</a>`;
      updateWa();
      jsonLd();
      observeReveals();
      initVideos($("#gallery"));

      // Mobile gallery dots
      const gal = $("#gallery");
      gal.addEventListener("scroll", () => {
        const i = Math.round(gal.scrollLeft / (gal.firstElementChild.getBoundingClientRect().width + 4));
        $$(".gown__dots i").forEach((d, j) => d.classList.toggle("is-on", i === j));
      }, { passive: true });
    };
    function updateWa() {
      const extra = optText();
      $$("[data-wa-gown]").forEach((a) => (a.href = wa(waGownText(g, extra ? `${t("waOptions")} ${extra}` : ""))));
      const fab = $(".fab-wa"); if (fab) fab.href = wa(waGownText(g, extra ? `${t("waOptions")} ${extra}` : ""));
    }
    function jsonLd() {
      if (document.body.dataset.gown) return; // pre-built page already has its product data
      let s = $("#ld-gown");
      if (!s) { s = document.createElement("script"); s.type = "application/ld+json"; s.id = "ld-gown"; document.head.append(s); }
      s.textContent = JSON.stringify({
        "@context": "https://schema.org", "@type": "Product", name: `${g.name} wedding dress`, sku: g.no,
        image: g.images.map((id) => src(id, 1400)), description: g.story.en, material: g.fabric.en, color: "Ivory",
        brand: { "@type": "Brand", name: "Burak Altaş Atelier" },
        offers: { "@type": "Offer", price: g.price, priceCurrency: S.currency, availability: "https://schema.org/PreOrder", url: etsyFor(g) },
        ...(g.video ? { subjectOf: { "@type": "VideoObject", name: `${g.name} — Burak Altaş Atelier`, description: g.story.en || g.story.tr, thumbnailUrl: absUrl(src(g.video.poster, 1400)), contentUrl: absUrl(g.video.src), uploadDate: g.video.date } } : {})
      });
    }

    document.addEventListener("change", (e) => {
      const r = e.target.closest("[data-opt]");
      if (r) { chosen[r.dataset.opt] = +r.value; updateWa(); const p = $("#gown-price"); if (p) p.innerHTML = priceHtml(); }
    });
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-share]")) share({ title: `${g.name} — Burak Altaş Atelier`, text: t("shareText", { name: g.name }), url: absUrl(gownUrl(g)) });
      const z = e.target.closest("[data-zoom]");
      if (z) openLightbox(g, +z.dataset.zoom);
    });
    onLang(render);
  }

  /* ---------- Lightbox ---------- */
  // Adjustable zoom: 100–400 %. A tap zooms to the bride's last chosen level (remembered), starting gently at 175 %.
  const ZOOM = { min: 1, max: 4, step: 0.25, start: 1.75 };
  function openLightbox(g, start) {
    let dlg = $("dialog.lb");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "lb"; document.body.append(dlg); }
    dlg.setAttribute("aria-label", t("gallery"));
    const opener = document.activeElement;
    let i = start;
    // Build once; navigation only swaps the image so keyboard focus stays on the buttons
    dlg.innerHTML = `<div class="lightbox">
      <div class="lightbox__top"><span aria-live="polite" data-count></span><button class="icon-btn" type="button" data-x aria-label="${t("close")}">${ICON.close}</button></div>
      <div class="lightbox__stage" data-stage></div>
      <div class="lightbox__bar">
        <div class="rail-nav"><button type="button" data-p aria-label="${t("prev")}">${ICON.arrowL}</button></div>
        <div class="lb-zoom" role="group" aria-label="${t("zoomLevel")}">
          <button type="button" class="lb-zoom__btn" data-zout aria-label="${t("zoomOut")}">−</button>
          <input type="range" min="${ZOOM.min}" max="${ZOOM.max}" step="${ZOOM.step}" value="1" data-zr aria-label="${t("zoomLevel")}">
          <button type="button" class="lb-zoom__btn" data-zin aria-label="${t("zoomIn")}">+</button>
          <output data-zv aria-live="polite">100%</output>
          <button type="button" class="lb-zoom__fit" data-zfit>${t("zoomFit")}</button>
        </div>
        <div class="rail-nav"><button type="button" data-n aria-label="${t("next")}">${ICON.arrow}</button></div>
      </div>
      <p class="lightbox__hint">${t("zoomHint")}</p>
    </div>`;
    const stage = $("[data-stage]", dlg), range = $("[data-zr]", dlg);
    let s = 1, tx = 0, ty = 0, im = null;
    const clampS = (v) => Math.min(ZOOM.max, Math.max(ZOOM.min, v));
    const remember = () => { if (s > 1.05) store.set("ba-zoom", Math.round(s * 100) / 100); };
    const preferred = () => { const z = +store.get("ba-zoom", ZOOM.start); return z > 1 && z <= ZOOM.max ? z : ZOOM.start; };
    // Keep the image covering the stage when zoomed; centred when it is smaller than the stage
    const apply = (animate = true) => {
      if (!im) return;
      const mx = Math.max(0, (im.offsetWidth * s - stage.clientWidth) / 2), my = Math.max(0, (im.offsetHeight * s - stage.clientHeight) / 2);
      tx = Math.min(mx, Math.max(-mx, tx)); ty = Math.min(my, Math.max(-my, ty));
      im.classList.toggle("no-anim", !animate);
      im.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
      stage.classList.toggle("is-zoomed", s > 1);
      range.value = s;
      $("[data-zv]", dlg).textContent = `${Math.round(s * 100)}%`;
      $("[data-zout]", dlg).disabled = s <= ZOOM.min;
      $("[data-zin]", dlg).disabled = s >= ZOOM.max;
    };
    // Zoom towards a point on screen (cursor, fingers or the centre)
    const zoomTo = (ns, px, py, animate = true) => {
      ns = clampS(ns);
      const r = stage.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (px == null) { px = cx; py = cy; }
      const k = ns / s;
      tx = px - cx - k * (px - cx - tx); ty = py - cy - k * (py - cy - ty);
      s = ns;
      if (s === 1) { tx = 0; ty = 0; }
      apply(animate);
    };
    const go = (n) => {
      i = (n + g.images.length) % g.images.length;
      s = 1; tx = 0; ty = 0;
      stage.innerHTML = img(g.images[i], gownAlt(g, i), { w: 1900, eager: true, sizes: "100vw" });
      im = $("img", stage); im.draggable = false;
      $("[data-count]", dlg).textContent = `${g.name} · ${i + 1} / ${g.images.length}`;
      apply(false);
    };

    // Mouse wheel / trackpad
    stage.addEventListener("wheel", (e) => { e.preventDefault(); zoomTo(s * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY, false); clearTimeout(stage._wt); stage._wt = setTimeout(remember, 300); }, { passive: false });
    // Drag to move, pinch to zoom, tap to toggle
    const pts = new Map();
    let pan = null, pinch = null;
    stage.addEventListener("pointerdown", (e) => {
      try { stage.setPointerCapture(e.pointerId); } catch {}
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) pan = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s }; pan = null;
      }
    });
    stage.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        zoomTo(pinch.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2, false);
      } else if (pan) {
        const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) pan.moved = true;
        if (s > 1 && pan.moved) { stage.classList.add("is-panning"); tx = pan.tx + dx; ty = pan.ty + dy; apply(false); }
      }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      stage.classList.remove("is-panning");
      if (pinch) { if (pts.size < 2) { pinch = null; remember(); } return; }
      if (pan && !pan.moved && e.type === "pointerup") s > 1 ? zoomTo(1) : zoomTo(preferred(), e.clientX, e.clientY);
      pan = null;
    };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    range.addEventListener("input", () => zoomTo(+range.value, null, null, false));
    range.addEventListener("change", remember);
    const onResize = () => apply(false);
    addEventListener("resize", onResize);
    dlg.addEventListener("close", () => { removeEventListener("resize", onResize); opener?.focus?.(); }, { once: true });

    go(i); dlg.showModal();
    dlg.onclose = null;
    dlg.onclick = (e) => {
      if (e.target.closest("[data-x]")) return dlg.close();
      if (e.target.closest("[data-p]")) return go(i - 1);
      if (e.target.closest("[data-n]")) return go(i + 1);
      if (e.target.closest("[data-zin]")) { zoomTo(s + ZOOM.step); remember(); }
      if (e.target.closest("[data-zout]")) { zoomTo(s - ZOOM.step); remember(); }
      if (e.target.closest("[data-zfit]")) zoomTo(1);
    };
    dlg.onkeydown = (e) => {
      if (e.target === range) return;
      if (e.key === "+" || e.key === "=") { zoomTo(s + ZOOM.step); remember(); }
      else if (e.key === "-" || e.key === "_") { zoomTo(s - ZOOM.step); remember(); }
      else if (e.key === "0") zoomTo(1);
      else if (s > 1 && e.key.startsWith("Arrow")) {
        // While zoomed, arrows move around the photo instead of changing it
        e.preventDefault();
        tx += { ArrowLeft: 80, ArrowRight: -80 }[e.key] || 0; ty += { ArrowUp: 80, ArrowDown: -80 }[e.key] || 0; apply();
      }
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
    };
  }

  /* ---------- Shortlist page ---------- */
  function renderShortlist() {
    const shared = (params.get("ids") || "").split(",").filter(byId);
    const ids = shared.length ? shared : shortlist.all();
    const gowns = ids.map(byId);
    $("#sl-title").innerHTML = shared.length ? t("slSharedTitle") : t("slTitle");
    $("#sl-lede").textContent = shared.length ? t("slSharedLede") : t("slLede");
    const box = $("#sl");
    if (!gowns.length) {
      box.innerHTML = `<div class="sl-empty"><p class="display h3">${t("slEmpty")}</p><p class="lede">${t("slEmptySub")}</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="btn" href="collection.html">${t("explore")}</a><button class="btn btn--ghost" type="button" data-finder>${t("finderTitle")}</button></div></div>`;
      return;
    }
    const names = gowns.map((g) => `${g.name} (${g.no})`).join(", ");
    const link = absUrl(`shortlist.html?ids=${ids.join(",")}`);
    box.innerHTML = `
      <div class="sl-actions">
        ${shared.length ? `<button class="btn" type="button" data-keep>${t("slKeep")}</button>` : `<button class="btn" type="button" data-sl-share>${ICON.share} ${t("slShare")}</button>`}
        <a class="btn btn--wa" target="_blank" rel="noopener" href="${wa(t("waShortlist", { list: names, url: link }))}">${ICON.wa} ${t("slAsk")}</a>
        <a class="btn btn--ghost" href="contact.html?ids=${ids.join(",")}">${t("enquire")}</a>
      </div>
      ${shared.length ? "" : `
      <div class="sl-save">
        <p><b>${t("slSaveTitle")}</b> ${t(/Instagram|FBAN|FBAV/.test(navigator.userAgent) ? "slSaveIg" : "slSaveText")}</p>
        <div class="sl-save__btns">
          <a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`${t("slSelfText")}\n${names}\n${link}`)}">${ICON.wa} ${t("slSelfWa")}</a>
          <a class="btn btn--ghost btn--sm" href="mailto:?subject=${encodeURIComponent(t("slShareTitle"))}&body=${encodeURIComponent(`${t("slSelfText")}\n${names}\n\n${link}`)}">${t("slSelfMail")}</a>
          <button class="btn btn--ghost btn--sm" type="button" data-sl-copy>${t("slSelfCopy")}</button>
        </div>
      </div>`}
      <div class="grid" style="padding-top:0">${gowns.map((g) => card(g, { sizes: "(min-width: 900px) 25vw, 50vw" })).join("")}</div>`;
    box.onclick = async (e) => {
      if (e.target.closest("[data-sl-share]")) share({ title: t("slShareTitle"), text: t("slShareText"), url: link });
      if (e.target.closest("[data-sl-copy]")) { try { await navigator.clipboard.writeText(link); toast(t("linkCopied")); } catch { prompt(t("slSelfCopy"), link); } }
      if (e.target.closest("[data-keep]")) { shortlist.add(shared); toast(t("savedAll")); }
    };
    syncHearts(); observeReveals();
  }

  /* ---------- Contact wizard ---------- */
  function pageContact() {
    // Google Maps sets its own cookies, so it loads only when the bride asks for it
    const map = $("[data-map]");
    if (map) $("[data-map-load]", map).addEventListener("click", () => {
      const q = encodeURIComponent((S.address || "").replace(/,?\s*Türkiye$/, ""));
      map.classList.remove("map--off");
      map.innerHTML = `<iframe title="${esc(t("mapTitle"))}" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${q}&output=embed"></iframe>`;
    });
    const pre =[...new Set([...(params.get("ids") || "").split(","), params.get("g") || ""].filter(byId))];
    const picked = pre.length ? pre : shortlist.all();
    const data = store.get("ba-enquiry", {});
    let step = 0;
    // Countries are stored as ISO codes and named in the bride's language
    const COUNTRIES = ["US", "GB", "DE", "NL", "FR", "AT", "CH", "SE", "DK", "NO", "BE", "IT", "ES", "CA", "AU", "AE", "SA", "QA", "KW", "BH", "OM", "IQ", "TR", "OTHER"];
    const countryName = (c) => { if (c === "OTHER") return t("otherCountry"); try { return new Intl.DisplayNames([lang], { type: "region" }).of(c); } catch { return c; } };
    const BUDGETS = ["$300 – 600", "$600 – 1,000", "$1,000 – 1,500", "$1,500 – 3,000", "$3,000+"];
    const PREFS = ["WhatsApp", "Email", "Videocall"];
    const byEmail = () => data.prefer === "Email";

    const pickedHtml = () => picked.map((id) => { const g = byId(id); return `<span class="picked__item">${img(g.images[0], "", { w: 120, sizes: "32px" })}${esc(g.name)}<button type="button" data-unpick="${id}" aria-label="${t("remove")} ${esc(g.name)}">×</button></span>`; }).join("");
    const render = () => {
      const w = $("#wizard");
      w.innerHTML = `
      <div class="wizard__steps" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= step ? "is-on" : ""}"></i>`).join("")}</div>
      <form novalidate id="enq">
        <section class="wizard__pane ${step === 0 ? "is-on" : ""}" aria-label="${t("wz1")}">
          <p class="eyebrow">01 · ${t("wz1")}</p>
          <h2>${t("wz1h")}</h2>
          <div class="picked" id="picked" data-empty="${esc(t("noneYet"))}">${pickedHtml()}</div>
          <label class="field"><span>${t("addGown")}</span>
            <select class="select" id="add-gown"><option value="">—</option>${G.filter((g) => !picked.includes(g.id)).map((g) => `<option value="${g.id}">${esc(g.name)} · ${g.no}</option>`).join("")}</select></label>
          <label class="check"><input type="checkbox" name="custom" ${data.custom ? "checked" : ""}> ${t("customDesign")}</label>
          <label class="field"><span>${t("ideas")}</span><textarea class="textarea" name="ideas" placeholder="${esc(t("ideasPh"))}">${esc(data.ideas || "")}</textarea></label>
        </section>
        <section class="wizard__pane ${step === 1 ? "is-on" : ""}" aria-label="${t("wz2")}">
          <p class="eyebrow">02 · ${t("wz2")}</p>
          <h2>${t("wz2h")}</h2>
          <div class="wizard__grid">
            <label class="field"><span>${t("weddingDate")}</span><input class="input" type="date" name="date" value="${esc(isoDate(data.date) || isoDate(store.get("ba-wedding", "")))}"></label>
            <label class="field"><span>${t("country")}</span><select class="select" name="country"><option value="">—</option>${COUNTRIES.map((c) => ({ c, n: countryName(c) })).sort((a, b) => (a.c === "OTHER") - (b.c === "OTHER") || a.n.localeCompare(b.n, lang)).map(({ c, n }) => `<option value="${c}" ${data.country === c ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
            <fieldset class="field full" style="border:0;padding:0;margin:0"><legend>${t("budget")}</legend><div class="chips mt-s">${BUDGETS.map((b) => `<label class="chip"><input type="radio" name="budget" value="${b}" ${data.budget === b ? "checked" : ""}><span>${b}</span></label>`).join("")}</div></fieldset>
            <fieldset class="field full" style="border:0;padding:0;margin:0"><legend>${t("fitting")}</legend><div class="chips mt-s">${["fitGuide", "fitVideo", "fitVisit"].map((k) => `<label class="chip"><input type="radio" name="fitting" value="${k}" ${data.fitting === k ? "checked" : ""}><span>${t(k)}</span></label>`).join("")}</div></fieldset>
          </div>
        </section>
        <section class="wizard__pane ${step === 2 ? "is-on" : ""}" aria-label="${t("wz3")}">
          <p class="eyebrow">03 · ${t("wz3")}</p>
          <h2>${t("wz3h")}</h2>
          <div class="wizard__grid">
            <label class="field"><span>${t("name")} *</span><input class="input" name="name" autocomplete="name" required value="${esc(data.name || "")}" aria-describedby="err-name"><small class="field__err" id="err-name"></small></label>
            <label class="field"><span>${t("email")}</span><input class="input" type="email" name="email" autocomplete="email" value="${esc(data.email || "")}" aria-describedby="err-email"><small class="field__err" id="err-email"></small></label>
            <label class="field full"><span>${t("phone")}</span><input class="input" type="tel" name="phone" autocomplete="tel" placeholder="${esc(t("phonePh"))}" value="${esc(data.phone || "")}"></label>
            <fieldset class="field full" style="border:0;padding:0;margin:0"><legend>${t("prefer")}</legend><div class="chips mt-s">${PREFS.map((k) => `<label class="chip"><input type="radio" name="prefer" value="${k}" ${(PREFS.includes(data.prefer) ? data.prefer : "WhatsApp") === k ? "checked" : ""}><span>${t("pref_" + k)}</span></label>`).join("")}</div></fieldset>
          </div>
          <p class="small">${t("privacy")}</p>
        </section>
        <section class="wizard__pane wizard__done ${step === 3 ? "is-on" : ""}">
          <p class="display h3">${t("thanks")}</p>
          <p class="lede">${t(byEmail() ? "thanksSubEmail" : "thanksSub")}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
            <a class="btn ${byEmail() ? "btn--ghost" : "btn--wa"}" target="_blank" rel="noopener" href="${wa(compose())}">${ICON.wa} ${t("openWa")}</a>
            <a class="btn ${byEmail() ? "" : "btn--ghost"}" href="${mailto()}">${t("sendEmail")}</a>
          </div>
        </section>
        ${step === 3 ? "" : `<div class="wizard__nav mt-m">
          ${step ? `<button type="button" class="link" data-prev>${ICON.arrowL} ${t("back")}</button>` : "<span></span>"}
          ${step < 2 ? `<button type="button" class="btn" data-next>${t("continue")} ${ICON.arrow}</button>` : `<button type="submit" class="btn ${byEmail() ? "" : "btn--wa"}" data-submit>${submitLabel()}</button>`}
        </div>`}
      </form>`;
    };
    const collect = () => {
      const f = $("#enq"); if (!f) return;
      const fd = new FormData(f);
      ["ideas", "date", "country", "budget", "fitting", "name", "email", "phone", "prefer"].forEach((k) => { if (fd.has(k) || f.elements[k]) data[k] = fd.get(k) || ""; });
      if (f.elements.custom) data.custom = f.elements.custom.checked;
      store.set("ba-enquiry", data);
    };
    const submitLabel = () => (byEmail() ? t("sendByEmail") : `${ICON.wa} ${t("sendEnquiry")}`);
    const mailto = () => `mailto:${S.email}?subject=${encodeURIComponent(t("mailSubject") + " — " + (data.name || ""))}&body=${encodeURIComponent(compose())}`;
    function compose() {
      const lines = [t("waEnquiryHead")];
      if (picked.length) lines.push(`• ${t("gowns")}: ${picked.map((id) => `${byId(id).name} (${byId(id).no})`).join(", ")}`);
      if (data.custom) lines.push(`• ${t("customDesign")}`);
      if (data.ideas) lines.push(`• ${t("ideas")}: ${data.ideas}`);
      if (data.date) lines.push(`• ${t("weddingDate")}: ${fmtDate(new Date(data.date + "T00:00:00"))}`);
      if (data.country) lines.push(`• ${t("country")}: ${COUNTRIES.includes(data.country) ? countryName(data.country) : data.country}`);
      if (data.budget) lines.push(`• ${t("budget")}: ${data.budget}`);
      if (data.fitting) lines.push(`• ${t("fitting")}: ${t(data.fitting)}`);
      lines.push(`• ${t("name")}: ${data.name || "-"}`);
      if (data.email) lines.push(`• ${t("email")}: ${data.email}`);
      if (data.phone) lines.push(`• ${t("phone")}: ${data.phone}`);
      if (PREFS.includes(data.prefer)) lines.push(`• ${t("prefer")}: ${t("pref_" + data.prefer)}`);
      return lines.join("\n");
    }
    const validate = () => {
      const f = $("#enq"); let ok = true;
      const nm = f.elements.name, em = f.elements.email;
      const setErr = (el, id, msg) => { el.setAttribute("aria-invalid", msg ? "true" : "false"); $("#" + id).textContent = msg; if (msg && ok) { el.focus(); ok = false; } };
      setErr(nm, "err-name", nm.value.trim() ? "" : t("errName"));
      setErr(em, "err-email", !em.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value) ? "" : t("errEmail"));
      return ok;
    };
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#wizard")) return;
      if (e.target.closest("[data-next]")) { collect(); step++; render(); $("#wizard").scrollIntoView({ block: "start" }); $("#wizard .wizard__pane.is-on input, #wizard .wizard__pane.is-on select")?.focus({ preventScroll: true }); }
      if (e.target.closest("[data-prev]")) { collect(); step--; render(); }
      const un = e.target.closest("[data-unpick]");
      if (un) { collect(); picked.splice(picked.indexOf(un.dataset.unpick), 1); render(); }
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "add-gown" && e.target.value) { collect(); picked.push(e.target.value); render(); $("#add-gown").focus(); }
      if (e.target.name === "prefer") { collect(); const b = $("[data-submit]"); if (b) { b.innerHTML = submitLabel(); b.classList.toggle("btn--wa", !byEmail()); } }
    });
    document.addEventListener("submit", async (e) => {
      if (e.target.id !== "enq") return;
      e.preventDefault(); collect();
      if (!validate()) return;
      const msg = compose();
      if (S.formspreeId) {
        try { await fetch(`https://formspree.io/f/${S.formspreeId}`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ ...data, gowns: picked.join(", "), message: msg }) }); } catch {}
      } else if (byEmail()) {
        location.href = mailto();
      } else {
        window.open(wa(msg), "_blank", "noopener");
      }
      step = 3; render();
    });
    onLang(() => { collect(); render(); });
  }

  /* ---------- Designer page (filled from the admin panel) ---------- */
  function pageDesigner() {
    const D = window.DESIGNER || {};
    const paras = (txt) => String(txt || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
    onLang(() => {
      const name = D.name || "Burak Altaş";
      document.title = `${name} — ${L(D.title) || t("designer")} | Burak Altaş Atelier`;
      $("#ds-name").textContent = name;
      $("#ds-title").textContent = L(D.title) || t("designer");
      $("#ds-intro").textContent = L(D.intro);
      $("#ds-intro").hidden = !L(D.intro);
      $("#ds-since").textContent = D.since ? t("since", { y: D.since }) : "";
      $("#ds-since").hidden = !D.since;
      $("#ds-photo").innerHTML = D.photo ? img(D.photo, name, { eager: true, sizes: "(min-width: 900px) 40vw, 90vw", w: 1200 }) : `<span class="ds-mono" aria-hidden="true">B<i>A</i></span>`;
      const bio = paras(L(D.bio));
      $("#ds-bio").innerHTML = bio; $("#ds-story").hidden = !bio;
      $("#ds-photo2").innerHTML = D.photo2 ? img(D.photo2, t("designerAtWork", { name }), { sizes: "(min-width: 900px) 45vw, 90vw", w: 1200 }) : "";
      $("#ds-photo2").hidden = !D.photo2;
      const q = L(D.quote);
      $("#ds-quote").innerHTML = q ? `<blockquote class="quote-xl">“${esc(q)}”</blockquote><p class="sig">— ${esc(name)}</p>` : "";
      $("#ds-quote-sec").hidden = !q;
      const hl = (D.highlights || []).filter((h) => h.value || L(h.label));
      $("#ds-stats").innerHTML = hl.map((h) => `<div class="stat"><b>${esc(h.value)}</b><span>${esc(L(h.label))}</span></div>`).join("");
      $("#ds-stats").hidden = !hl.length;
      const pr = (D.press || []).filter((p) => p.name);
      $("#ds-press").innerHTML = pr.map((p) => p.url ? `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a></li>` : `<li>${esc(p.name)}</li>`).join("");
      $("#ds-press-sec").hidden = !pr.length;
    });
  }

  /* ---------- Atelier: measurement guide hover ---------- */
  function pageAtelier() {
    $$(".mlist li").forEach((li) => {
      const on = (v) => $$(`.figure-svg [data-m="${li.dataset.m}"]`).forEach((p) => p.classList.toggle("is-on", v));
      li.addEventListener("mouseenter", () => on(true)); li.addEventListener("mouseleave", () => on(false));
      li.addEventListener("focusin", () => on(true)); li.addEventListener("focusout", () => on(false));
    });
    // FAQ structured data
    const en = (el) => { const d = document.createElement("div"); d.innerHTML = el.dataset.en ?? el.innerHTML; return d.textContent.trim(); };
    const faq = $$("#faq details").map((d) => ({ "@type": "Question", name: en(d.querySelector("summary")), acceptedAnswer: { "@type": "Answer", text: en(d.querySelector(".acc__body p")) } }));
    if (faq.length) { const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq }); document.head.append(s); }
  }

  /* ---------- Contact links that live in static HTML ---------- */
  function wireStaticLinks() {
    onLang(() => {
      $$("[data-wa]").forEach((a) => { a.href = wa(t(a.dataset.wa || "waGeneral")); a.target = "_blank"; a.rel = "noopener"; });
      $$("[data-etsy-shop]").forEach((a) => { a.href = S.etsyShop; a.target = "_blank"; a.rel = "noopener"; });
      $$("[data-ig]").forEach((a) => { a.href = S.instagram; a.target = "_blank"; a.rel = "noopener"; });
      $$("[data-maps]").forEach((a) => { a.href = S.mapsUrl; a.target = "_blank"; a.rel = "noopener"; });
      $$("[data-email]").forEach((a) => { a.href = "mailto:" + S.email; a.textContent = S.email; });
      $$("[data-phone]").forEach((a) => { a.href = "tel:+" + S.whatsapp; a.textContent = S.phoneDisplay; });
      $$("[data-address]").forEach((el) => (el.textContent = S.address));
      $$("[data-hours]").forEach((el) => (el.textContent = L(S.hours)));
      $$("[data-icon]").forEach((el) => { if (!el.dataset.iconDone) { el.insertAdjacentHTML("afterbegin", ICON[el.dataset.icon] + " "); el.dataset.iconDone = 1; } });
    });
  }

  /* ---------- Shared API for page scripts (fitting.js) ---------- */
  window.BA = { $, $$, t, L, esc, isoDate, wa, store, toast, onLang, observeReveals, fmtDate, byId, params, ICON, lang: () => lang };

  /* ---------- Cookie-free visitor statistics (only when a token is set in the admin panel) ---------- */
  function initAnalytics() {
    const token = (S.analytics || {}).cloudflareToken || "";
    if (!/^[a-f0-9]{32}$/i.test(token) || /^(localhost|127\.|\[?::1)/.test(location.hostname) || location.protocol === "file:") return;
    const s = document.createElement("script");
    s.defer = true; s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", JSON.stringify({ token }));
    document.head.append(s);
  }

  /* ---------- Boot ---------- */
  applyStatic();
  onLang(renderChrome);
  initChromeEvents();
  initChat();
  initAnalytics();
  wireStaticLinks();
  initRails();
  initFinder();
  ({ home: pageHome, collection: pageCollection, gown: pageGown, contact: pageContact, atelier: pageAtelier, designer: pageDesigner, shortlist: () => onLang(renderShortlist) }[page] || (() => {}))();
  initTimelines();
  observeReveals();
  initCursor();
  initCardPreviews();
})();
