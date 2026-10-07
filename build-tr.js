/* ==========================================================================
   build-tr.js — Turkish pages as real HTML (/tr/…), so search engines and
   link previews see Turkish text. Used by build.js; not run on its own.

   The site still switches language in the browser; these pages simply start
   in Turkish. Every page also gets hreflang links pointing at its twin.
   ========================================================================== */

// Turkish <head> texts for pages whose meta tags are written in English
const META = {
  "index.html": {
    description: "İzmir'de el yapımı, ölçünüze özel couture gelinlik ve after party elbiseleri. Görüntülü görüşmeyle ölçü, dünyanın her yerine gönderim.",
    "og:title": "Burak Altaş Atelier — Size özel couture",
    "og:description": "İzmir'den el yapımı gelinlikler; uzaktan ölçü, dünyaya gönderim."
  },
  "collection.html": {
    title: "Koleksiyonlar — Gelinlikler | Burak Altaş Atelier",
    description: "Siluete, yakaya ve detaylara göre couture gelinlikler: prenses, balık, A kesim, düz kesim ve after party elbiseleri. Hepsi ölçünüze göre dikilir.",
    "og:title": "Koleksiyonlar — Burak Altaş Atelier"
  },
  "atelier.html": {
    description: "İzmir'e gelmeden ölçüye özel gelinlik: görüntülü randevular, detaylı ölçü kartı, üretimden fotoğraflar ve dünyaya hızlı gönderim. Sık sorulan sorular.",
    "og:title": "Atölye — Burak Altaş"
  },
  "designer.html": {
    title: "Burak Altaş — Tasarımcı | Burak Altaş Atelier",
    description: "İzmir'deki Burak Altaş Atelier'in tasarımcısı Burak Altaş ile tanışın — ölçüye özel couture gelinlikler.",
    "og:title": "Burak Altaş — tasarımcı"
  },
  "fitting.html": {
    description: "Burak Altaş atölyesiyle görüntülü randevu alın: tasarım görüşmesi, eşliğinde ölçü ve prova onayı. Saatler kendi saat diliminizde. Doldurulabilir, yazdırılabilir ölçü kartı.",
    "og:title": "Online prova odası — Burak Altaş Atelier",
    "og:description": "Görüntülü randevunuzu alın, gelinlik ölçülerinizi bizimle birlikte çıkarın."
  },
  "contact.html": {
    description: "Ölçüye özel gelinlik için bilgi alın: WhatsApp, görüntülü görüşme ya da Konak, İzmir'deki showroom'umuz."
  },
  "shortlist.html": {
    description: "Kaydettiğiniz gelinlikler. Listenizi ailenizle ve arkadaşlarınızla paylaşın.",
    "og:title": "Burak Altaş Atelier'den bir gelinlik listesi",
    "og:description": "Hangisini seçeyim? 💛"
  },
  "policies.html": {
    description: "Burak Altaş Atelier kişisel verilerinizi nasıl korur (KVKK & GDPR); ölçüye özel siparişler, kargo, iade ve tadilat koşulları."
  }
};

const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Index just after the element that opens at `start` (handles nested tags of the same name)
function elementEnd(html, start) {
  const name = /^<([a-zA-Z0-9]+)/.exec(html.slice(start, start + 20))[1].toLowerCase();
  let i = html.indexOf(">", start) + 1, depth = 1;
  const re = new RegExp(`<(/?)${name}(?=[\\s>/])`, "gi");
  re.lastIndex = i;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) { depth--; if (!depth) return { innerStart: i, innerEnd: m.index, end: html.indexOf(">", m.index) + 1 }; }
    else { const close = html.indexOf(">", m.index); if (html[close - 1] !== "/") depth++; }
  }
  return null;
}

// Replace the content of every [data-i18n] element and the attributes listed in [data-i18n-attr]
function applyTranslations(html, TR) {
  let out = "", pos = 0;
  const open = /<[a-zA-Z0-9]+\b[^>]*\bdata-i18n="([^"]+)"[^>]*>/g;
  let m;
  while ((m = open.exec(html))) {
    if (m.index < pos) continue;
    const tr = TR[m[1]];
    const el = elementEnd(html, m.index);
    if (tr == null || !el) continue;
    out += html.slice(pos, el.innerStart) + tr;
    pos = el.innerEnd;
    open.lastIndex = el.innerEnd;
  }
  html = out + html.slice(pos);
  return html.replace(/<[a-zA-Z0-9]+\b[^>]*\bdata-i18n-attr="([^"]+)"[^>]*>/g, (tag, spec) => {
    for (const pair of spec.split(";")) {
      const [attr, key] = pair.split(":").map((x) => x.trim());
      const tr = TR[key];
      if (!attr || tr == null) continue;
      const re = new RegExp(`(\\s${attr}=")[^"]*(")`);
      tag = re.test(tag) ? tag.replace(re, `$1${escAttr(tr)}$2`) : tag.replace(/>$/, ` ${attr}="${escAttr(tr)}">`);
    }
    return tag;
  });
}

// Pages are one folder deeper: point files at the site root, keep links to other pages (their /tr/ twins exist)
const KEEP = /^(?:[a-z]+:|\/\/|\/|#|\.\.\/)/i;
const rebase = (url, pages) => {
  if (!url || KEEP.test(url)) return url;
  const file = url.split(/[?#]/)[0];
  return pages.includes(file) ? url : "../" + url;
};
function rebaseUrls(html, pages) {
  html = html.replace(/(\s(?:href|src|action)=")([^"]*)(")/g, (m, a, url, b) => a + rebase(url, pages) + b);
  return html.replace(/(\s(?:srcset|imagesrcset)=")([^"]*)(")/g, (m, a, set, b) =>
    a + set.split(",").map((part) => part.trim().replace(/^(\S+)/, (u) => rebase(u, pages))).join(", ") + b);
}

function setMeta(html, kind, value) {
  if (kind === "title") return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/, (t) => t.replace(/>[\s\S]*?</, `>${value}<`));
  const re = kind === "description" ? /(<meta name="description" content=")[^"]*(")/ : new RegExp(`(<meta property="${kind}" content=")[^"]*(")`);
  return html.replace(re, `$1${escAttr(value)}$2`);
}

// <link rel="alternate" hreflang> + canonical for a page in either language
function langLinks(domain, file, lang) {
  const p = file === "index.html" ? "" : file;
  const en = `${domain}/${p}`, tr = `${domain}/tr/${p}`;
  return `<link rel="canonical" href="${lang === "tr" ? tr : en}">
  <link rel="alternate" hreflang="en" href="${en}">
  <link rel="alternate" hreflang="tr" href="${tr}">
  <link rel="alternate" hreflang="x-default" href="${en}">`;
}
function withLangLinks(html, domain, file, lang) {
  html = html.replace(/\s*<link rel="canonical"[^>]*>/, "").replace(/\s*<link rel="alternate" hreflang="[^"]*"[^>]*>/g, "");
  return html.replace(/(<meta name="description"[^>]*>)/, `$1\n  ${langLinks(domain, file, lang)}`);
}

/* The Turkish twin of an English page (file = its name, e.g. "fitting.html") */
function toTurkish(html, { file, TR, pages, domain, meta = META[file] || {} }) {
  html = applyTranslations(html, TR);
  html = html.replace(/<html lang="en"[^>]*>/, '<html lang="tr" data-page-lang="tr" data-base="../">');
  for (const [kind, value] of Object.entries(meta)) html = setMeta(html, kind, value);
  html = html.replace(/<meta property="og:locale" content="[^"]*">/, "");
  html = html.replace(/(<meta property="og:[a-z]+")/, '<meta property="og:locale" content="tr_TR">\n  $1');
  html = rebaseUrls(html, pages);
  return withLangLinks(html, domain, file, "tr");
}

module.exports = { toTurkish, withLangLinks, applyTranslations, META };
