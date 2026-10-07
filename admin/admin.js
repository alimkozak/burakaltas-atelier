/* ==========================================================================
   Admin paneli — istemci
   ========================================================================== */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const view = $("#view");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let DB = null;          // everything loaded from /api/data
  let dirty = false;      // unsaved edits in the current screen

  const L = {
    silhouette: { ballgown: "Prenses", aline: "A kesim", mermaid: "Balık", column: "Düz kesim", mini: "Mini" },
    neckline: { strapless: "Straplez", sweetheart: "Kalp yaka", offshoulder: "Omuz açık", square: "Kare yaka", halter: "Halter yaka", vneck: "V yaka", highneck: "Dik yaka" },
    features: { pearls: "İnci", feathers: "Tüy", lace: "Dantel", slit: "Yırtmaç", detachable: "Çıkarılabilir etek", sleeves: "Kollu", corset: "Korse", train: "Kuyruk", gloves: "Opera eldiveni", beading: "Boncuk işleme" }
  };
  const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

  /* ---------- helpers ---------- */
  const src = (id, w = 400) => !id ? "" : /^https?:/.test(id) ? id : /^assets\//.test(id) ? "/" + id.replace(/(\.\w+)$/, w <= 800 && /uploads\//.test(id) ? "-sm$1" : "$1") : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=60`;
  const slug = (s) => String(s || "").toLocaleLowerCase("tr").replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" }[c])).normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40);
  const money = (n) => "$" + Number(n || 0).toLocaleString("en-US");
  let toastT;
  function toast(msg, err) {
    const t = $("#toast"); t.textContent = msg; t.classList.toggle("err", !!err); t.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("is-on"), err ? 6000 : 3200);
  }
  // Saves carry the version of the data they were based on, so two people editing at once
  // can't silently overwrite each other (the server answers 409 if someone saved in between)
  const VER_OF = { gowns: "gowns", designer: "designer", reviews: "reviews", config: "config" };
  // Saves run one after another: a double tap on Save sends the second save with the version the
  // first one returned, instead of tripping the "someone else saved" check against itself
  let queue = Promise.resolve(), uploading = 0;
  const post = (route, body) => {
    if (uploading && route !== "upload") return Promise.reject(new Error("Fotoğraflar hâlâ yükleniyor — bitince tekrar Kaydet'e basın"));
    const run = queue.then(() => send(route, body));
    queue = run.catch(() => {});
    return run;
  };
  async function send(route, body) {
    const vk = VER_OF[route];
    const payload = vk && DB.ver ? { ...body, ver: DB.ver[vk] } : body;
    let r;
    try { r = await fetch(`/api/${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
    catch { throw new Error("Bağlantı koptu. İnternetinizi kontrol edip tekrar deneyin — yazdıklarınız bu ekranda duruyor."); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && j.login) { showLogin(); throw new Error("Oturum kapandı — kaydedilmedi. Yazdıklarınız bu ekranda duruyor."); }
    if (r.status === 409) showConflict();
    if (!r.ok) throw new Error(j.error || "Kaydedilemedi");
    if (j.ver) DB.ver = j.ver;
    return j;
  }
  const bar = (id, html) => {
    $(`#${id}`)?.remove();
    const el = document.createElement("div");
    el.id = id; el.className = "conflict"; el.setAttribute("role", "alert"); el.innerHTML = html;
    document.body.prepend(el);
    return el;
  };
  // Signed out (session ended, panel restarted): never leave the page — the edits would be lost.
  // Sign in again in a new tab, come back, press Save again.
  function showLogin() {
    const el = bar("relogin", `<span><b>Oturumunuz kapandı.</b> Yazdıklarınız bu ekranda duruyor. Yeni sekmede giriş yapın, sonra bu sekmeye dönüp tekrar <b>Kaydet</b>'e basın.</span><a class="btn btn--sm" href="/giris" target="_blank" rel="noopener">Giriş yap ↗</a>`);
    addEventListener("focus", function back() { fetch("/api/data", { cache: "no-store" }).then((r) => { if (r.ok) { el.remove(); removeEventListener("focus", back); } }); });
  }
  function showConflict() {
    const el = bar("conflict", `<span><b>Bu arada başka biri de aynı yeri kaydetti.</b> Sizin son değişikliğiniz kaydedilmedi. Yazdıklarınız bu ekranda duruyor: önemli bir metin varsa kopyalayın, sonra sayfayı yenileyip tekrar yapın.</span><span class="row"><button type="button" class="btn btn--sm btn--ghost" data-x>Kapat</button><button type="button" class="btn btn--sm" data-r>Sayfayı yenile</button></span>`);
    $("[data-r]", el).onclick = () => { dirty = false; location.reload(); };
    $("[data-x]", el).onclick = () => el.remove();
  }

  /* Prices typed the Turkish way: "45.000" = 45000, "3,200" = 3200, "$1290" = 1290.
     Returns a number, null for empty, or NaN when it can't be read (e.g. "45.000 TL"). */
  function parseMoney(v) {
    let s = String(v ?? "").trim().toLocaleLowerCase("tr");
    if (!s) return null;
    if (/tl|₺|lira|eur|€|£|gbp/.test(s)) return NaN;
    s = s.replace(/usd|dolar|\$|\s/g, "");
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return +s.replace(/[.,]/g, "");
    if (/^\d+([.,]\d{1,2})?$/.test(s)) return Math.round(+s.replace(",", "."));
    return NaN;
  }
  const moneyInput = (name, val, { ph = "ör. 1290", attrs = "" } = {}) =>
    `<input class="in" name="${name}" data-money inputmode="decimal" autocomplete="off" value="${val === null || val === undefined || val === "" ? "" : esc(val)}" placeholder="${esc(ph)}" ${attrs}><small class="money__hint" aria-live="polite"></small>`;
  // Live "= $45,000" under every price field, so a typo is seen before saving
  document.addEventListener("input", (e) => {
    const el = e.target.closest?.("[data-money]"); if (!el) return;
    const h = el.parentElement.querySelector(".money__hint"); if (!h) return;
    const n = parseMoney(el.value);
    h.textContent = n === null ? "" : Number.isNaN(n) ? "Dolar (USD) olarak, sadece rakamla yazın — ör. 1290" : `= ${money(n)}`;
    h.classList.toggle("is-err", Number.isNaN(n));
  });
  async function reload() {
    const r = await fetch("/api/data", { cache: "no-store" });
    if (r.status === 401) { location.href = "/giris"; return; }
    DB = await r.json();
    // Remote session: show who is connected and a way to sign out
    if (DB.remote && !$(".side__remote")) $(".side__site")?.insertAdjacentHTML("afterend", `<a class="side__site side__remote" href="/cikis">Uzaktan bağlısınız · Çıkış</a>`);
  }
  const markDirty = () => { dirty = true; const m = $(".savebar .msg"); if (m) { m.textContent = "Kaydedilmemiş değişiklikler var"; m.classList.remove("err"); } };
  addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // Two-language field: Turkish first (the team writes Turkish), English for foreign brides
  const bi = (name, val = {}, { ta = false, lg = false, ph = {} } = {}) => `
    <div class="bi">
      <label><b>Türkçe</b>${ta ? `<textarea class="ta ${lg ? "ta--lg" : ""}" data-bi="${name}.tr" placeholder="${esc(ph.tr || "")}">${esc(val.tr)}</textarea>` : `<input class="in" data-bi="${name}.tr" value="${esc(val.tr)}" placeholder="${esc(ph.tr || "")}">`}</label>
      <label><b>English</b>${ta ? `<textarea class="ta ${lg ? "ta--lg" : ""}" data-bi="${name}.en" placeholder="${esc(ph.en || "")}">${esc(val.en)}</textarea>` : `<input class="in" data-bi="${name}.en" value="${esc(val.en)}" placeholder="${esc(ph.en || "")}">`}</label>
    </div>`;
  const readBi = (root, name) => ({ tr: ($(`[data-bi="${name}.tr"]`, root)?.value || "").trim(), en: ($(`[data-bi="${name}.en"]`, root)?.value || "").trim() });

  /* ---------- Photo processing: resize in the browser before upload ---------- */
  async function processAndUpload(file, name) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`"${file.name}" desteklenmiyor. JPG, PNG ya da WEBP yükleyin (iPhone'da: Ayarlar › Kamera › Formatlar › En Uyumlu).`);
    const bmp = await createImageBitmap(file);
    const make = (max, q) => {
      // Sized by WIDTH: the site's srcset says "800w", so the file must really be 800px wide
      const s = Math.min(1, max / bmp.width);
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", q);
    };
    const r = await post("upload", { name, lg: make(1800, 0.85), sm: make(800, 0.8), xs: make(480, 0.78) });
    return r.path;
  }
  function photoManager(container, list, { name, max = 12, onChange }) {
    const draw = () => {
      container.innerHTML = `
        <label class="drop" tabindex="0">
          <input type="file" accept="image/jpeg,image/png,image/webp" ${max > 1 ? "multiple" : ""} hidden>
          <b>${max > 1 ? "Fotoğrafları buraya sürükleyin" : "Fotoğrafı buraya sürükleyin"}</b>
          <small>ya da tıklayıp seçin · JPG / PNG · otomatik küçültülür</small>
        </label>
        <div class="uploading" hidden></div>
        <div class="photos">${list.map((id, i) => `
          <div class="photo" draggable="true" data-i="${i}">
            <img src="${esc(src(id, 400))}" alt="">
            ${max > 1 && i === 0 ? `<span class="photo__tag">Kapak</span>` : ""}${max > 1 && i === 1 ? `<span class="photo__tag">2. görsel</span>` : ""}
            ${max > 1 && i > 0 ? `<button type="button" class="photo__cover" data-cover aria-label="Kapak yap" title="Kapak yap">★</button>` : ""}
            <div class="photo__acts">
              ${max > 1 ? `<button type="button" data-mv="-1" aria-label="Sola taşı" ${i === 0 ? "disabled" : ""}>←</button>` : "<span></span>"}
              <button type="button" data-rm aria-label="Kaldır">✕</button>
              ${max > 1 ? `<button type="button" data-mv="1" aria-label="Sağa taşı" ${i === list.length - 1 ? "disabled" : ""}>→</button>` : "<span></span>"}
            </div>
          </div>`).join("")}</div>`;
      const input = $("input[type=file]", container), drop = $(".drop", container);
      const handle = async (files) => {
        const box = $(".uploading", container);
        files = [...files].slice(0, Math.max(0, max - list.length) || (max === 1 ? 1 : 0));
        if (!files.length) { toast(`En fazla ${max} fotoğraf`, true); return; }
        // Each photo on its own: a broken file is skipped, the others still go up, and what's
        // uploaded is on screen straight away (so screen and saved gown never disagree)
        const failed = [];
        uploading++;
        try {
          for (let k = 0; k < files.length; k++) {
            if (box.isConnected) { box.hidden = false; box.textContent = `Yükleniyor ${k + 1} / ${files.length}…`; }
            try {
              if (!files[k].size) throw new Error("boş dosya");
              const p = await processAndUpload(files[k], name());
              if (max === 1) list.splice(0, list.length, p); else list.push(p);
              onChange();
            } catch (e) {
              failed.push(/desteklenmiyor|Bağlantı|Oturum/.test(e.message) ? e.message : `"${files[k].name}" açılamadı (bozuk ya da boş dosya)`);
              if (/Bağlantı|Oturum/.test(e.message)) break;
            }
          }
        } finally { uploading--; }
        if (!container.isConnected) return;
        draw();
        const ok = files.length - failed.length;
        if (failed.length) toast(`${ok ? `${ok} fotoğraf eklendi. ` : ""}${failed.join(" · ")}`, true);
        else toast(`${ok > 1 ? "Fotoğraflar" : "Fotoğraf"} eklendi — kaydetmeyi unutmayın`);
      };
      input.addEventListener("change", () => handle(input.files));
      drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
      drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-over"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
      drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("is-over"); if (e.dataTransfer.files.length) handle(e.dataTransfer.files); });
      // Reorder by dragging photos onto each other, or with the arrows
      let from = null;
      $$(".photo", container).forEach((el) => {
        el.addEventListener("dragstart", () => { from = +el.dataset.i; el.classList.add("is-drag"); });
        el.addEventListener("dragend", () => el.classList.remove("is-drag"));
        el.addEventListener("dragover", (e) => { if (from !== null) { e.preventDefault(); el.classList.add("is-target"); } });
        el.addEventListener("dragleave", () => el.classList.remove("is-target"));
        el.addEventListener("drop", (e) => { e.preventDefault(); const to = +el.dataset.i; if (from !== null && from !== to) { const [x] = list.splice(from, 1); list.splice(to, 0, x); onChange(); draw(); } from = null; });
      });
      container.onclick = (e) => {
        const ph = e.target.closest(".photo"); if (!ph) return;
        const i = +ph.dataset.i;
        if (e.target.closest("[data-rm]")) { list.splice(i, 1); onChange(); draw(); }
        if (e.target.closest("[data-cover]")) { list.unshift(...list.splice(i, 1)); onChange(); draw(); }
        const mv = e.target.closest("[data-mv]");
        if (mv) { const j = i + +mv.dataset.mv; [list[i], list[j]] = [list[j], list[i]]; onChange(); draw(); }
      };
    };
    draw();
  }

  /* ---------- Video: checked in the browser, poster frame taken from the clip ---------- */
  const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
  const mb = (n) => (n / 1048576).toFixed(n > 10485760 ? 0 : 1).replace(".", ",") + " MB";
  // iPhones record HEVC (H.265) by default — it plays in Safari only, so brides on Android/Windows would see nothing
  async function isHevc(file) {
    const part = async (a, b) => new Uint8Array(await file.slice(a, b).arrayBuffer());
    const chunks = [await part(0, 4 << 20), await part(Math.max(0, file.size - (4 << 20)), file.size)];
    const hit = (u, s) => { const c = [...s].map((x) => x.charCodeAt(0)); outer: for (let i = 0; i < u.length - 4; i++) { for (let k = 0; k < 4; k++) if (u[i + k] !== c[k]) continue outer; return true; } return false; };
    return chunks.some((u) => hit(u, "hvc1") || hit(u, "hev1"));
  }
  const loadVideo = (url) => new Promise((resolve, reject) => {
    const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    const to = setTimeout(() => reject(new Error("Video açılamadı")), 15000);
    v.addEventListener("loadeddata", () => { clearTimeout(to); resolve(v); }, { once: true });
    v.addEventListener("error", () => { clearTimeout(to); reject(new Error("Video açılamadı: dosya bozuk ya da bu format desteklenmiyor. Videoyu MP4 (H.264) olarak dışa aktarıp yeniden deneyin.")); }, { once: true });
  });
  const seek = (v, t) => new Promise((r) => { v.addEventListener("seeked", r, { once: true }); v.currentTime = t; });
  async function uploadFrame(v, name) {
    const make = (max, q) => {
      const s = Math.min(1, max / v.videoWidth);
      const c = document.createElement("canvas"); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", q);
    };
    return (await post("upload", { name: `${name}-video`, lg: make(1800, 0.85), sm: make(800, 0.8), xs: make(480, 0.78) })).path;
  }
  const sendVideo = (file, name, onProgress) => new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", `/api/upload-video?name=${encodeURIComponent(name)}`);
    x.setRequestHeader("Content-Type", file.type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} x.status === 200 ? resolve(j) : reject(new Error(j.error || "Video yüklenemedi")); };
    x.onerror = () => reject(new Error("Video yüklenemedi — panel penceresi açık mı?"));
    x.send(file);
  });
  function videoManager(container, g, { name, onChange }) {
    const draw = () => {
      const v = g.video;
      container.innerHTML = v ? `
        <div class="vid">
          <video src="/${esc(v.src)}" poster="${esc(src(v.poster, 800))}" controls muted playsinline preload="metadata"></video>
          <div class="vid__side">
            <p><b>Kapak karesi</b><br><small>Video oynamadan önce görünen kare. Değiştirmek için videoyu istediğiniz anda durdurup aşağıdaki düğmeye basın.</small></p>
            <img src="${esc(src(v.poster, 400))}" alt="" class="vid__poster">
            <button type="button" class="btn btn--sm" data-frame>Bu kareyi kapak yap</button>
            <button type="button" class="btn btn--sm btn--danger" data-vrm>Videoyu kaldır</button>
            ${v.seconds ? `<small>${v.seconds} saniye</small>` : ""}
          </div>
        </div>` : `
        <label class="drop" tabindex="0">
          <input type="file" accept="video/mp4,video/quicktime,video/webm" hidden>
          <b>Videoyu buraya sürükleyin</b>
          <small>ya da tıklayıp seçin · MP4 / MOV · 10–20 saniye ideal</small>
        </label>
        <div class="uploading" hidden><span></span><i class="bar"><i></i></i></div>`;
      if (v) {
        const el = $("video", container);
        $("[data-frame]", container).onclick = async (e) => {
          const b = e.currentTarget; b.disabled = true; b.textContent = "Kaydediliyor…";
          try { el.pause(); g.video = { ...g.video, poster: await uploadFrame(el, name()) }; onChange(); draw(); toast("Kapak karesi değişti — kaydetmeyi unutmayın"); }
          catch (err) { toast(err.message, true); b.disabled = false; b.textContent = "Bu kareyi kapak yap"; }
        };
        $("[data-vrm]", container).onclick = () => { delete g.video; onChange(); draw(); };
        return;
      }
      const input = $("input[type=file]", container), drop = $(".drop", container);
      const handle = async (file) => {
        const box = $(".uploading", container), say = (t) => { box.hidden = false; $("span", box).textContent = t; };
        const bar = (p) => ($(".bar i", box).style.width = `${Math.round(p * 100)}%`);
        let url;
        if (!file) return;
        uploading++;
        try {
          if (!VIDEO_TYPES.includes(file.type)) throw new Error(`"${file.name}" bir video değil ya da desteklenmiyor. MP4 ya da MOV yükleyin.`);
          if (file.size > 95 * 1048576) throw new Error(`Video çok büyük (${mb(file.size)}). 1080p ve 10–20 saniye olarak yeniden kaydedin; en fazla 95 MB.`);
          say("Video kontrol ediliyor…"); bar(0);
          if (await isHevc(file)) throw new Error("Bu video HEVC (H.265) formatında; Android ve Windows'taki gelinler onu göremez. iPhone'da Ayarlar › Kamera › Formatlar › “En Uyumlu” seçip yeniden çekin ya da videoyu paylaşırken “En Uyumlu” / MP4 olarak dışa aktarın.");
          url = URL.createObjectURL(file);
          const probe = await loadVideo(url);
          if (!probe.videoWidth) throw new Error("Videonun görüntüsü okunamadı. MP4 (H.264) olarak dışa aktarıp yeniden deneyin.");
          // Some exported clips don't report a length (Infinity) — treat as unknown rather than "too long"
          const dur = Number.isFinite(probe.duration) ? probe.duration : 0;
          if (dur > 120) throw new Error(`Video ${Math.round(dur)} saniye. Sitede döngüde oynayacağı için 10–30 saniyeye kısaltın.`);
          await seek(probe, dur ? Math.min(1.2, dur * 0.25) : 0.5);
          say("Kapak karesi hazırlanıyor…");
          const poster = await uploadFrame(probe, name());
          say("Video yükleniyor…");
          const r = await sendVideo(file, name(), bar);
          g.video = { src: r.path, poster, date: new Date().toISOString().slice(0, 10), seconds: Math.round(dur) || undefined };
          onChange(); draw();
          toast(file.size > 30 * 1048576 ? `Video eklendi (${mb(file.size)}). Biraz büyük: mobil veride geç açılabilir — 1080p yeterli.` : "Video eklendi — kaydetmeyi unutmayın", file.size > 30 * 1048576);
        } catch (err) { box.hidden = true; toast(err.message, true); }
        finally { uploading--; if (url) URL.revokeObjectURL(url); }
      };
      input.addEventListener("change", () => handle(input.files[0]));
      drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
      drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-over"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
      drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("is-over"); handle(e.dataTransfer.files[0]); });
    };
    draw();
  }

  /* ======================================================================
     MODELLER
     ====================================================================== */
  /* ---------- Quick edit: Etsy links, prices, featured, draft — every gown on one screen ---------- */
  const ETSY = /^https:\/\/([\w-]+\.)?(etsy\.com|etsy\.me)\//;
  const normUrl = (v) => { let u = String(v || "").trim(); if (!u) return ""; if (/^http:\/\//i.test(u)) u = "https://" + u.slice(7); if (!/^https:\/\//i.test(u)) u = "https://" + u.replace(/^\/+/, ""); return u; };
  function renderQuick() {
    const rows = DB.gowns.map((g) => ({ id: g.id, etsy: g.etsy || "", price: g.price || 0, featured: !!g.featured, draft: !!g.draft }));
    view.innerHTML = `
      <div class="head">
        <div><h1>Hızlı düzenleme <small>${rows.length} model</small></h1><p>Etsy ilan linklerini, fiyatları ve işaretleri tek ekranda girin, sonra bir kez kaydedin. Etsy'de ilanı açın › <b>Paylaş</b> › linki kopyalayıp ilgili satıra yapıştırın.</p></div>
        <a class="btn btn--ghost" href="#modeller">← Modeller</a>
      </div>
      <div class="toolbar"><input type="search" id="qq" placeholder="Model adı ya da kodu ile ara…" aria-label="Ara"></div>
      <div class="qtable__wrap"><table class="qtable">
        <thead><tr><th>Kod</th><th>Model</th><th>Fiyat (USD)</th><th>Etsy ilan linki</th><th title="Ana sayfada öne çıkar">★</th><th>Taslak</th></tr></thead>
        <tbody>${DB.gowns.map((g, i) => `
          <tr data-row="${i}" data-q="${esc(`${g.name} ${g.no}`.toLocaleLowerCase("tr"))}">
            <td class="qtable__no">${esc(g.no)}</td>
            <td><a href="#model=${encodeURIComponent(g.id)}">${esc(g.name)}</a></td>
            <td><input class="in" data-f="price" data-money inputmode="decimal" autocomplete="off" value="${g.price || ""}" aria-label="${esc(g.name)} fiyat"><small class="money__hint" aria-live="polite"></small></td>
            <td><input class="in" type="url" inputmode="url" autocapitalize="off" data-f="etsy" value="${esc(g.etsy || "")}" placeholder="https://www.etsy.com/listing/…" aria-label="${esc(g.name)} Etsy linki"><small class="qerr" hidden>Geçerli bir Etsy linki değil</small></td>
            <td><input type="checkbox" data-f="featured" ${g.featured ? "checked" : ""} aria-label="${esc(g.name)} öne çıkar"></td>
            <td><input type="checkbox" data-f="draft" ${g.draft ? "checked" : ""} aria-label="${esc(g.name)} taslak"></td>
          </tr>`).join("")}</tbody>
      </table></div>
      <div class="savebar"><span class="msg">Değişiklik yok</span><button type="button" class="btn btn--ok" data-qsave>Kaydet</button></div>`;
    $("#qq").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLocaleLowerCase("tr");
      $$("tr[data-row]").forEach((tr) => (tr.hidden = !!q && !tr.dataset.q.includes(q)));
    });
    const check = (tr) => {
      const v = normUrl($('[data-f="etsy"]', tr).value);
      const bad = !!v && !ETSY.test(v);
      $(".qerr", tr).hidden = !bad;
      $('[data-f="etsy"]', tr).setAttribute("aria-invalid", String(bad));
      return !bad;
    };
    view.oninput = (e) => {
      const tr = e.target.closest("tr[data-row]"); if (!tr) return;
      const r = rows[+tr.dataset.row], f = e.target.dataset.f;
      r[f] = e.target.type === "checkbox" ? e.target.checked : f === "price" ? parseMoney(e.target.value) : f === "etsy" ? normUrl(e.target.value) : e.target.value.trim();
      if (f === "etsy") check(tr);
      markDirty();
    };
    view.onchange = view.oninput;
    view.onclick = async (e) => {
      if (!e.target.closest("[data-qsave]")) return;
      const trs = [...$$("tr[data-row]")];
      const bad = trs.filter((tr) => !check(tr));
      const badPrice = rows.filter((r) => Number.isNaN(r.price));
      const noPrice = rows.filter((r) => !r.draft && !(r.price > 0));
      const msg = $(".savebar .msg");
      if (bad.length) { msg.textContent = `${bad.length} satırda Etsy linki hatalı`; msg.classList.add("err"); bad[0].hidden = false; $('[data-f="etsy"]', bad[0]).focus(); return; }
      if (badPrice.length) { msg.textContent = `${badPrice.length} satırda fiyat okunamadı — dolar olarak, sadece rakamla yazın`; msg.classList.add("err"); return; }
      const cheap = rows.filter((r) => r.price > 0 && r.price < 100);
      if (cheap.length && !confirm(`${cheap.map((r) => DB.gowns.find((g) => g.id === r.id).name + ": " + money(r.price)).join(", ")} — fiyat doğru mu? (Fiyatlar dolar olarak yazılır.)`)) return;
      if (noPrice.length) { msg.textContent = `${noPrice.length} modelin fiyatı yok (taslak değilse fiyat gerekli)`; msg.classList.add("err"); return; }
      const list = DB.gowns.map((g, i) => {
        const r = rows[i], x = { ...g, etsy: r.etsy, price: r.price || 0 };
        r.featured ? (x.featured = true) : delete x.featured;
        r.draft ? (x.draft = true) : delete x.draft;
        return x;
      });
      const btn = e.target.closest("[data-qsave]"); btn.disabled = true; btn.textContent = "Kaydediliyor…";
      try { await post("gowns", { gowns: list }); dirty = false; await reload(); toast("Kaydedildi"); renderQuick(); }
      catch (err) { msg.textContent = err.message; msg.classList.add("err"); btn.disabled = false; btn.textContent = "Kaydet"; }
    };
  }

  function renderList() {
    const G = DB.gowns, C = DB.collections;
    view.innerHTML = `
      <div class="head">
        <div><h1>Modeller <small>${G.length} model</small></h1><p>Sıralama sitedeki sırayı belirler. ★ işaretli modeller ana sayfada öne çıkar.</p></div>
        <div class="row"><a class="btn btn--ghost" href="#hizli">Hızlı düzenleme</a><a class="btn" href="#yeni">+ Yeni model</a></div>
      </div>
      <div class="toolbar">
        <input type="search" id="q" placeholder="Model adı ya da kodu ile ara…" aria-label="Ara">
        <select id="fc" aria-label="Koleksiyon"><option value="">Tüm koleksiyonlar</option>${C.map((c) => `<option value="${c.id}">${esc(c.name.tr || c.name.en)}</option>`).join("")}</select>
      </div>
      <div class="list" id="list"></div>
      ${(DB.trash || []).length ? `<details class="card trash"><summary>Son silinen modeller (${DB.trash.length})</summary>
        <p class="hint">Yanlışlıkla sildiyseniz buradan geri getirin. Fotoğrafları da geri gelir.</p>
        <div class="list">${DB.trash.map((t) => `<div class="item item--trash">
          ${t.image ? `<img src="${esc(src(t.image, 200))}" alt="" loading="lazy">` : `<div class="noimg"></div>`}
          <div><div class="item__name">${esc(t.name)}</div><div class="item__meta"><span>${esc(t.no)}</span><span>${new Date(t.date).toLocaleDateString("tr-TR")} silindi</span></div></div>
          <div class="item__acts"><button class="btn btn--sm" data-restore="${esc(t.id)}">Geri getir</button></div>
        </div>`).join("")}</div></details>` : ""}`;
    view.querySelectorAll("[data-restore]").forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      try { await post("restore", { id: b.dataset.restore }); await reload(); renderList(); toast("Model geri geldi"); }
      catch (err) { toast(err.message, true); b.disabled = false; }
    }));
    const draw = () => {
      const q = $("#q").value.toLocaleLowerCase("tr"), fc = $("#fc").value;
      $("#list").innerHTML = G.map((g, i) => ({ g, i })).filter(({ g }) => (!fc || g.collection === fc) && (!q || `${g.name} ${g.no}`.toLocaleLowerCase("tr").includes(q))).map(({ g, i }) => {
        const col = C.find((c) => c.id === g.collection);
        const warn = [!g.etsy && "Etsy linki yok", !(g.story?.en) && "İngilizce açıklama yok", g.images.some((x) => !/^assets\//.test(x)) && "Örnek fotoğraf"].filter(Boolean);
        return `<div class="item" data-i="${i}">
          ${g.images[0] ? `<img src="${esc(src(g.images[0], 200))}" alt="" loading="lazy">` : `<div class="noimg"></div>`}
          <div>
            <div class="item__name">${esc(g.name)} ${g.draft ? `<span class="pill pill--warn">Taslak · sitede görünmüyor</span>` : ""}${g.featured ? `<span class="pill pill--gold">★ öne çıkan</span>` : ""}</div>
            <div class="item__meta"><span>${esc(g.no)}</span><span>${esc(col ? col.name.tr || col.name.en : g.collection)}</span><span>${L.silhouette[g.silhouette] || ""}</span><span>${money(g.price)}</span>${warn.map((w) => `<span class="pill pill--warn">${w}</span>`).join("")}</div>
          </div>
          <div class="item__acts">
            <button class="icon" data-up title="Yukarı taşı" aria-label="Yukarı taşı" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="icon" data-down title="Aşağı taşı" aria-label="Aşağı taşı" ${i === G.length - 1 ? "disabled" : ""}>↓</button>
            <button class="icon" data-star title="Öne çıkar" aria-label="Öne çıkar" aria-pressed="${!!g.featured}">${g.featured ? "★" : "☆"}</button>
            <a class="btn btn--sm btn--ghost" href="${g.draft ? `/gown.html?g=${esc(g.id)}&taslak=1` : `/gown-${esc(g.id)}.html`}" target="_blank" rel="noopener">Önizle ↗</a>
            <button class="btn btn--sm btn--ghost" data-dup>Kopyala</button>
            <a class="btn btn--sm" href="#model=${encodeURIComponent(g.id)}">Düzenle</a>
          </div>
        </div>`;
      }).join("") || `<p class="note">Eşleşen model yok.</p>`;
    };
    $("#q").addEventListener("input", draw); $("#fc").addEventListener("change", draw); draw();
    let busy = false;
    $("#list").onclick = async (e) => {
      const it = e.target.closest(".item"); if (!it || busy) return;
      const i = +it.dataset.i, list = clone(G);
      if (e.target.closest("[data-up]")) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      else if (e.target.closest("[data-down]")) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      else if (e.target.closest("[data-star]")) list[i].featured = !list[i].featured;
      else if (e.target.closest("[data-dup]")) { location.hash = `#yeni=${encodeURIComponent(G[i].id)}`; return; }
      else return;
      busy = true;
      try { await post("gowns", { gowns: list }); await reload(); renderList(); toast("Kaydedildi"); }
      catch (err) { toast(err.message, true); }
      finally { busy = false; }
    };
  }

  function nextCode(collection) {
    const prefix = collection === "afterparty" ? "AP-2" : "BA-1";
    const nums = DB.gowns.map((g) => g.no).filter((n) => n && n.startsWith(prefix)).map((n) => +n.slice(prefix.length));
    return prefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
  }

  function renderEditor(id, copyFrom) {
    const existing = DB.gowns.find((g) => g.id === id);
    const base = existing || (copyFrom && DB.gowns.find((g) => g.id === copyFrom));
    const g = base ? clone(base) : { name: "", collection: DB.collections[0].id, meaning: {}, silhouette: "ballgown", neckline: "strapless", features: [], fabric: {}, hours: "", price: "", weeks: [8, 12], etsy: "", images: [], story: {} };
    if (!existing) { g.id = ""; g.no = nextCode(g.collection); if (copyFrom) { g.name = ""; g.images = []; g.etsy = ""; delete g.video; } }
    const isNew = !existing;
    view.innerHTML = `
      <div class="head">
        <div><h1>${isNew ? "Yeni model" : esc(g.name)}</h1><p>${isNew ? "Alanları doldurup fotoğrafları ekleyin. Kaydedince model sitede hemen yayına hazır olur." : `Kod ${esc(g.no)} · <a href="${g.draft ? `/gown.html?g=${esc(g.id)}&taslak=1` : `/gown-${esc(g.id)}.html`}" target="_blank" rel="noopener">${g.draft ? "taslağı önizle ↗" : "sitede gör ↗"}</a>`}</p></div>
        <a class="btn btn--ghost" href="#modeller">← Modellere dön</a>
      </div>
      <form class="editor" id="ed" novalidate>
        <div>
          <section class="card">
            <h2>Temel bilgiler</h2><p class="hint">Model adı sitede büyük başlık olarak görünür. Anlamı, adın altındaki küçük italik satırdır.</p>
            <div class="grid2">
              <label class="f"><span>Model adı *</span><input class="in" name="name" value="${esc(g.name)}" required maxlength="60" placeholder="ör. Yakamoz"></label>
              <label class="f"><span>Model kodu</span><input class="in" name="no" value="${esc(g.no)}" maxlength="20"><small>Otomatik verilir, değiştirebilirsiniz.</small></label>
              <label class="f"><span>Koleksiyon *</span><select class="sel" name="collection">${DB.collections.map((c) => `<option value="${c.id}" ${g.collection === c.id ? "selected" : ""}>${esc(c.name.tr || c.name.en)}</option>`).join("")}</select></label>
              <label class="f"><span>Başlangıç fiyatı — dolar (USD) *</span>${moneyInput("price", g.price || "")}<small>Sadece rakam, dolar olarak (ör. 1290). Etsy'deki fiyatla aynı ya da daha yüksek olmalı.</small></label>
              <div class="f full"><span>Adın anlamı <em>(isteğe bağlı)</em></span>${bi("meaning", g.meaning, { ph: { tr: "ör. denizde ay parıltısı", en: "e.g. moonlight on the sea" } })}</div>
            </div>
          </section>

          <section class="card">
            <h2>Fotoğraflar *</h2><p class="hint">İlk fotoğraf kapaktır (★ ile istediğiniz fotoğrafı kapak yapın). İkincisi, bilgisayarda fotoğrafın üzerine gelince görünür — arka görünüm için ideal. Oklarla ya da sürükleyerek sıralayın. En az 3 fotoğraf önerilir: ön, arka, detay.</p>
            <div id="photos"></div>
          </section>

          <section class="card">
            <h2>Video <em>(isteğe bağlı — çok önerilir)</em></h2><p class="hint">10–20 saniyelik dikey bir video: gelin yürürken, dönerken, kuyruk yere dökülürken. Fotoğrafın gösteremediği hareketi gösterir. Sitede galerinin 2. karesinde sessiz ve döngüde oynar. 1080p yeterli; müzik eklemeyin (ses kapalı başlar).</p>
            <div id="video"></div>
          </section>

          <section class="card">
            <h2>Kesim & detaylar</h2><p class="hint">Bunlar sitedeki filtreleri ve gelinlik bulucuyu besler — doğru seçmek önemli.</p>
            <div class="grid2">
              <label class="f"><span>Siluet *</span><select class="sel" name="silhouette">${Object.entries(L.silhouette).map(([k, v]) => `<option value="${k}" ${g.silhouette === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
              <label class="f"><span>Yaka</span><select class="sel" name="neckline">${Object.entries(L.neckline).map(([k, v]) => `<option value="${k}" ${g.neckline === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
              <div class="f full"><span>Detaylar</span><div class="chips">${Object.entries(L.features).map(([k, v]) => `<label class="chip"><input type="checkbox" name="features" value="${k}" ${g.features.includes(k) ? "checked" : ""}><span>${v}</span></label>`).join("")}</div></div>
              <div class="f full"><span>Kumaş & işleme</span>${bi("fabric", g.fabric, { ph: { tr: "ör. İtalyan mikado, el işi inci işleme", en: "e.g. Italian mikado, hand-sewn pearls" } })}</div>
              <label class="f"><span>El işçiliği (saat)</span><input class="in" name="hours" type="number" min="0" value="${esc(g.hours)}" placeholder="ör. 240"></label>
              <label class="f"><span>Üretim süresi (hafta)</span><div class="row"><input class="in" name="w0" type="number" min="1" value="${esc(g.weeks[0])}" style="width:90px"> – <input class="in" name="w1" type="number" min="1" value="${esc(g.weeks[1])}" style="width:90px"></div></label>
              <label class="f"><span>Fotoğraftaki modelin boyu (cm) <em>(isteğe bağlı)</em></span><input class="in" name="modelH" type="number" min="0" max="230" value="${esc(g.model?.height || "")}" placeholder="ör. 172"></label>
              <label class="f"><span>Fotoğraftaki modelin bedeni <em>(isteğe bağlı)</em></span><input class="in" name="modelS" value="${esc(g.model?.size || "")}" maxlength="24" placeholder="ör. EU 36 / UK 8"><small>Uzaktan alan gelin, kendi ölçüleriyle karşılaştırabilsin diye.</small></label>
            </div>
          </section>

          <section class="card">
            <h2>Hikâye</h2><p class="hint">2–3 cümle: modeli özel yapan ne? Hangi gelin için? İngilizce boş kalırsa yabancı ziyaretçiler Türkçe metni görür.</p>
            ${bi("story", g.story, { ta: true, ph: { tr: "ör. Atölyenin imza modeli. Balenli korse beli inceltir…", en: "e.g. The atelier's signature. A boned corset sculpts the waist…" } })}
          </section>

          <section class="card">
            <h2>Satış</h2><p class="hint">Gelinliği beğenen kişi mağazadan satın alır. Etsy'de bu modelin ilanını açın ve linkini yapıştırın (Etsy › ilan › Paylaş › "Share & Save" linki önerilir — %4 ücret iadesi). Boşsa buton mağaza ana sayfasına gider.</p>
            <div class="grid2">
              <label class="f full"><span>Etsy ilan linki</span><input class="in" name="etsy" type="url" inputmode="url" autocapitalize="off" value="${esc(g.etsy)}" placeholder="https://www.etsy.com/listing/…"><small class="err-text" id="etsy-err" hidden>Bu bir Etsy ilan linki değil. Etsy'de ilanı açın › Paylaş › linki kopyalayıp buraya yapıştırın.</small></label>
              ${(DB.site.stores || []).map((x, i) => `<label class="f full"><span>${esc(x.name)} ilan linki <em>(isteğe bağlı)</em></span><input class="in" data-shop="${esc(x.name)}" type="url" inputmode="url" autocapitalize="off" value="${esc((g.shops || {})[x.name] || "")}" placeholder="Boşsa ${esc(x.name)} mağaza sayfasına gider"></label>`).join("")}
              <label class="check"><input type="checkbox" name="featured" ${g.featured ? "checked" : ""}> Ana sayfada öne çıkar ★</label>
              <label class="check full"><input type="checkbox" name="draft" ${g.draft ? "checked" : ""}> Taslak — sitede gösterme <small style="display:block;color:var(--mute);margin-left:26px">Instagram'dan aktarılan modeller taslak olarak gelir. Bilgileri kontrol edip bu kutuyu kaldırınca model yayına girer.</small></label>
              <label class="check full"><input type="checkbox" name="concept" ${g.concept ? "checked" : ""}> Henüz dikilmedi — görseller çizim ya da görselleştirme <small style="display:block;color:var(--mute);margin-left:26px">Sitede “Tasarım · sipariş üzerine dikilir” etiketi ve açıklaması çıkar. Yapay zekâyla üretilmiş görsel kullanıyorsanız Etsy ilanında da belirtin.</small></label>
            </div>
          </section>
          <div class="savebar">
            <span class="msg">${isNew ? "Yeni model — henüz kaydedilmedi" : "Değişiklik yok"}</span>
            <div class="row">
              <button type="submit" class="btn btn--ok">Kaydet</button>
            </div>
          </div>
          ${isNew ? "" : `<p class="delzone"><button type="button" class="btn btn--sm btn--danger" data-del>Bu modeli sil</button> <small>Silinen model, Modeller sayfasının altındaki “Son silinen modeller”den geri getirilebilir.</small></p>`}
        </div>
        <aside class="editor__side card">
          <h2>Önizleme</h2>
          <div class="prev" id="prev"></div>
          <ul class="checklist" id="check"></ul>
        </aside>
      </form>`;
    const form = $("#ed");
    const collect = () => {
      const fd = new FormData(form);
      return {
        ...g,
        name: (fd.get("name") || "").trim(), no: (fd.get("no") || "").trim(), collection: fd.get("collection"),
        price: parseMoney(fd.get("price")) ?? 0, meaning: readBi(form, "meaning"), silhouette: fd.get("silhouette"), neckline: fd.get("neckline"),
        features: fd.getAll("features"), fabric: readBi(form, "fabric"), hours: Number(fd.get("hours")) || 0,
        weeks: [Number(fd.get("w0")) || 8, Number(fd.get("w1")) || Number(fd.get("w0")) || 12],
        story: readBi(form, "story"), etsy: normUrl(fd.get("etsy")), shops: Object.fromEntries($$("[data-shop]", form).map((el) => [el.dataset.shop, normUrl(el.value)]).filter(([, v]) => v)), featured: fd.get("featured") === "on", concept: fd.get("concept") === "on", draft: fd.get("draft") === "on", images: g.images,
        model: { height: Number(fd.get("modelH")) || 0, size: (fd.get("modelS") || "").trim() }
      };
    };
    const preview = () => {
      const x = collect();
      $("#prev").innerHTML = `<div class="prev__img">${x.images[0] ? `<img src="${esc(src(x.images[0], 600))}" alt="">` : ""}</div>
        <div class="prev__name">${esc(x.name || "Model adı")}</div><div class="prev__mean">${esc(x.meaning.tr || x.meaning.en || "")}</div><div class="prev__price">Başlangıç ${money(x.price)}</div>`;
      const checks = [
        [x.name, "Model adı"], [x.price > 0, "Fiyat"], [x.images.length >= 1, "En az 1 fotoğraf"], [x.images.length >= 3, "3+ fotoğraf (ön, arka, detay)"],
        [x.images.every((i) => /^assets\//.test(i)), "Gerçek fotoğraflar (örnek görsel yok)"], [x.story.tr, "Türkçe hikâye"], [x.story.en, "İngilizce hikâye"],
        [x.fabric.tr || x.fabric.en, "Kumaş bilgisi"], [x.video, "Video (önerilir)"], [x.etsy, "Etsy ilan linki"]
      ];
      $("#check").innerHTML = checks.map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
    };
    form.addEventListener("input", () => { markDirty(); preview(); });
    form.addEventListener("change", (e) => { if (e.target.name === "collection" && isNew) { form.elements.no.value = nextCode(e.target.value); } preview(); });
    photoManager($("#photos"), g.images, { name: () => form.elements.name.value || "model", onChange: () => { markDirty(); preview(); } });
    videoManager($("#video"), g, { name: () => form.elements.name.value || "model", onChange: () => { markDirty(); preview(); } });
    preview();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const x = collect();
      const msg = $(".savebar .msg");
      const fail = (t, el) => { msg.textContent = t; msg.classList.add("err"); toast(t, true); el?.focus(); };
      if (!x.name) return fail("Model adı gerekli", form.elements.name);
      if (Number.isNaN(x.price)) return fail("Fiyat okunamadı — dolar olarak, sadece rakamla yazın (ör. 1290)", form.elements.price);
      if (x.etsy && !ETSY.test(x.etsy)) { $("#etsy-err").hidden = false; return fail("Etsy linki geçersiz", form.elements.etsy); }
      $("#etsy-err").hidden = true;
      if (x.no && DB.gowns.some((o) => o.no === x.no && o.id !== g.id)) return fail(`${x.no} kodu başka bir modelde kullanılıyor`, form.elements.no);
      if (x.price > 0 && x.price < 100 && !confirm(`Fiyat ${money(x.price)} olarak kaydedilecek. Doğru mu? (Fiyatlar dolar olarak yazılır.)`)) return fail("Fiyatı kontrol edin", form.elements.price);
      if (!x.draft && !(x.price > 0)) return fail("Fiyat girin (taslak olarak kaydetmek için \"Taslak\" kutusunu işaretleyin)", form.elements.price);
      if (!x.images.length) return fail("En az bir fotoğraf ekleyin");
      if (isNew) x.id = "";
      try {
        const btn = $("button[type=submit]", form); btn.disabled = true; btn.textContent = "Kaydediliyor…";
        await post("gown", { gown: x, id: isNew ? "" : g.id, base: isNew ? "" : DB.ver.g[g.id] });
        dirty = false; await reload();
        toast(`"${x.name}" kaydedildi`);
        location.hash = "#modeller";
      } catch (err) { fail(err.message); const btn = $("button[type=submit]", form); btn.disabled = false; btn.textContent = "Kaydet"; }
    });
    $("[data-del]", form)?.addEventListener("click", async () => {
      if (!confirm(`"${g.name}" modeli siteden silinsin mi?\n\nFikrinizi değiştirirseniz Modeller sayfasının altındaki "Son silinen modeller"den geri getirebilirsiniz.`)) return;
      try { await post("gown-delete", { id: g.id, base: DB.ver.g[g.id] }); dirty = false; await reload(); toast("Model silindi — Modeller sayfasının altından geri getirebilirsiniz"); location.hash = "#modeller"; }
      catch (err) { toast(err.message, true); }
    });
  }

  /* ======================================================================
     TASARIMCI
     ====================================================================== */
  function renderDesigner() {
    const d = clone(DB.designer || {});
    d.title ||= {}; d.intro ||= {}; d.bio ||= {}; d.quote ||= {}; d.highlights ||= []; d.press ||= [];
    const photo = d.photo ? [d.photo] : [], photo2 = d.photo2 ? [d.photo2] : [];
    while (d.highlights.length < 3) d.highlights.push({ value: "", label: {} });
    view.innerHTML = `
      <div class="head">
        <div><h1>Tasarımcı sayfası</h1><p>Tasarımcının tanıtım sayfası. Boş bıraktığınız alanlar sitede görünmez; sayfa yarım dolu haliyle de düzgün görünür.</p><div class="meter"><i id="meter"></i></div></div>
        <a class="btn btn--ghost" href="/designer.html" target="_blank" rel="noopener">Sayfayı gör ↗</a>
      </div>
      <form id="df" novalidate>
        <section class="card">
          <h2>Portre</h2><p class="hint">Dikey, sade arka planlı, doğal ışıkta bir portre. İkinci fotoğraf: atölyede çalışırken (makas, iğne, manken başında).</p>
          <div class="grid2"><div class="f"><span>Ana portre</span><div id="p1"></div></div><div class="f"><span>Atölyede çalışırken</span><div id="p2"></div></div></div>
        </section>
        <section class="card">
          <h2>Kimlik</h2>
          <div class="grid2">
            <label class="f"><span>Ad soyad</span><input class="in" name="name" value="${esc(d.name || "Burak Altaş")}"></label>
            <label class="f"><span>Atölyenin kuruluş yılı</span><input class="in" name="since" value="${esc(d.since)}" placeholder="ör. 2012" maxlength="10"></label>
            <div class="f full"><span>Ünvan</span>${bi("title", d.title, { ph: { tr: "Tasarımcı & kurucu", en: "Designer & founder" } })}</div>
            <div class="f full"><span>Tek cümlelik tanıtım</span>${bi("intro", d.intro, { ph: { tr: "ör. İzmir'de 15 yıldır gelinlik tasarlayan…", en: "e.g. Designing wedding gowns in İzmir for 15 years…" } })}</div>
          </div>
        </section>
        <section class="card">
          <h2>Hikâye</h2>
          <p class="hint">Paragrafları boş satırla ayırın. Yardımcı sorular: Gelinlik tasarımına nasıl başladı? Kimden / nerede öğrendi? İlk gelinliği? Neden İzmir? Bir gelinliğe nasıl başlar? Atölyede kaç kişi çalışıyor? Gelinlerine ne söz veriyor?</p>
          ${bi("bio", d.bio, { ta: true, lg: true })}
        </section>
        <section class="card">
          <h2>Alıntı</h2><p class="hint">Tasarımcının kendi sözü — sayfada büyük harflerle öne çıkar.</p>
          ${bi("quote", d.quote, { ta: true, ph: { tr: "ör. Her gelinlik, giyecek kadının hikâyesiyle başlar.", en: "e.g. Every gown begins with the story of the woman who will wear it." } })}
        </section>
        <section class="card">
          <h2>Rakamlarla</h2><p class="hint">Gerçek ve doğrulanabilir rakamlar yazın (ör. "15" — "yıllık deneyim", "1.200+" — "gelin"). Boş satırlar görünmez.</p>
          <div class="rows">${d.highlights.map((h, i) => `<div class="rowcard"><div class="grid2"><label class="f"><span>Rakam</span><input class="in" data-hv="${i}" value="${esc(h.value)}" maxlength="20" placeholder="ör. 15"></label><div class="f"><span>Açıklama</span>${bi(`hl${i}`, h.label, { ph: { tr: "yıllık deneyim", en: "years of experience" } })}</div></div></div>`).join("")}</div>
        </section>
        <section class="card">
          <h2>Basın & yayınlar <em style="font-size:.9rem;color:var(--mute)">(varsa)</em></h2>
          <div class="rows" id="press">${d.press.map((p, i) => `<div class="rowcard"><div class="grid2"><label class="f"><span>Yayın adı</span><input class="in" data-pn="${i}" value="${esc(p.name)}"></label><label class="f"><span>Link</span><input class="in" data-pu="${i}" value="${esc(p.url)}" placeholder="https://…"></label></div><button type="button" class="btn btn--sm btn--danger" data-prm="${i}">Kaldır</button></div>`).join("")}</div>
          <button type="button" class="btn btn--sm btn--ghost" data-padd style="margin-top:12px">+ Yayın ekle</button>
        </section>
        <div class="savebar"><span class="msg">Değişiklik yok</span><button type="submit" class="btn btn--ok">Kaydet</button></div>
      </form>`;
    const form = $("#df");
    const collect = () => {
      const fd = new FormData(form);
      return {
        name: fd.get("name"), since: fd.get("since"), title: readBi(form, "title"), intro: readBi(form, "intro"), bio: readBi(form, "bio"), quote: readBi(form, "quote"),
        photo: photo[0] || "", photo2: photo2[0] || "",
        highlights: d.highlights.map((h, i) => ({ value: $(`[data-hv="${i}"]`).value.trim(), label: readBi(form, `hl${i}`) })),
        press: $$("[data-pn]").map((el) => ({ name: el.value.trim(), url: normUrl($(`[data-pu="${el.dataset.pn}"]`).value) }))
      };
    };
    const meter = () => {
      const x = collect();
      const parts = [x.photo, x.photo2, x.intro.tr, x.intro.en, x.bio.tr, x.bio.en, x.quote.tr, x.since, x.highlights.some((h) => h.value)];
      $("#meter").style.width = (parts.filter(Boolean).length / parts.length) * 100 + "%";
    };
    photoManager($("#p1"), photo, { name: () => "burak-altas-portre", max: 1, onChange: () => { markDirty(); meter(); } });
    photoManager($("#p2"), photo2, { name: () => "burak-altas-atolye", max: 1, onChange: () => { markDirty(); meter(); } });
    form.addEventListener("input", () => { markDirty(); meter(); });
    form.addEventListener("click", (e) => {
      if (e.target.closest("[data-padd]")) { d.press = collect().press.concat({ name: "", url: "" }); DB.designer = { ...collect(), press: d.press }; renderDesigner(); markDirty(); }
      const rm = e.target.closest("[data-prm]");
      if (rm) { const p = collect().press; p.splice(+rm.dataset.prm, 1); DB.designer = { ...collect(), press: p }; renderDesigner(); markDirty(); }
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button[type=submit]", form); btn.disabled = true;
      try { await post("designer", { designer: collect() }); dirty = false; await reload(); toast("Tasarımcı sayfası kaydedildi"); renderDesigner(); }
      catch (err) { toast(err.message, true); btn.disabled = false; }
    });
    meter();
  }

  /* ======================================================================
     YORUMLAR
     ====================================================================== */
  function renderReviews() {
    const R = clone(DB.reviews || []);
    const names = DB.gowns.map((g) => g.name);
    view.innerHTML = `
      <div class="head">
        <div><h1>Gelin yorumları <small>${R.length}</small></h1><p>Instagram'daki "Gelin yorumları" öne çıkanından, gelinin iznini alarak ekleyin. Gerçek yorumlar güveni en çok artıran şeydir.</p></div>
        <button class="btn" data-add>+ Yorum ekle</button>
      </div>
      <form id="rf" novalidate>
        <div class="rows">${R.map((r, i) => `
          <div class="rowcard" data-r="${i}">
            <div class="rowcard__top"><b>${esc(r.name || "Yeni yorum")}</b><div class="row">
              <button type="button" class="icon" data-rup aria-label="Yukarı" ${i === 0 ? "disabled" : ""}>↑</button>
              <button type="button" class="icon" data-rdown aria-label="Aşağı" ${i === R.length - 1 ? "disabled" : ""}>↓</button>
              <button type="button" class="btn btn--sm btn--danger" data-rrm>Sil</button></div></div>
            <div class="grid2">
              <label class="f"><span>Gelinin adı</span><input class="in" data-k="name" value="${esc(r.name)}" placeholder="ör. Elif"></label>
              <label class="f"><span>Giydiği model</span><input class="in" data-k="gown" list="gownnames" value="${esc(r.gown)}"></label>
              <div class="f full"><span>Şehir / ülke</span>${bi(`place${i}`, r.place, { ph: { tr: "ör. Londra, Birleşik Krallık", en: "e.g. London, UK" } })}</div>
              <div class="f full"><span>Yorum</span>${bi(`text${i}`, r.text, { ta: true })}</div>
              <div class="f full"><span>Gelinin fotoğrafı <em>(isteğe bağlı · gelinin izniyle)</em></span><div data-rphoto="${i}"></div><small>Düğünden ya da provadan bir kare. Fotoğraflı yorumlar sitede çok daha güven verir ve ilgili modelin sayfasında "Bu modeli giyen gelinler" bölümünde de görünür.</small></div>
            </div>
          </div>`).join("") || `<p class="note">Henüz yorum yok.</p>`}</div>
        <datalist id="gownnames">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
        <div class="savebar"><span class="msg">Değişiklik yok</span><button type="submit" class="btn btn--ok">Kaydet</button></div>
      </form>`;
    const photos = R.map((r) => (r.photo ? [r.photo] : []));
    const collect = () => $$("[data-r]").map((el, i) => ({ name: $('[data-k="name"]', el).value.trim(), gown: $('[data-k="gown"]', el).value.trim(), place: readBi(el, `place${i}`), text: readBi(el, `text${i}`), photo: photos[i]?.[0] || "" }));
    $$("[data-rphoto]").forEach((box) => {
      const i = +box.dataset.rphoto;
      photoManager(box, photos[i], { name: () => `gelin-${R[i].name || "yorum"}`, max: 1, onChange: markDirty });
    });
    const form = $("#rf");
    form.addEventListener("input", markDirty);
    view.onclick = (e) => {
      if (e.target.closest("[data-add]")) { DB.reviews = collect().concat({ name: "", gown: "", place: {}, text: {} }); renderReviews(); markDirty(); $$("[data-r]").pop()?.scrollIntoView(); return; }
      const card = e.target.closest("[data-r]"); if (!card) return;
      const i = +card.dataset.r, list = collect();
      if (e.target.closest("[data-rrm]")) { if (!confirm(`${list[i].name || "Bu"} yorumu silinsin mi? (Kaydet'e basmadan önce sayfayı yenilerseniz geri gelir.)`)) return; list.splice(i, 1); }
      else if (e.target.closest("[data-rup]")) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      else if (e.target.closest("[data-rdown]")) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      else return;
      DB.reviews = list; renderReviews(); markDirty();
    };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = collect();
      const half = r.findIndex((x) => (x.name || x.text.tr || x.text.en || x.photo) && !(x.name && (x.text.tr || x.text.en)));
      if (half >= 0) { const c = $$("[data-r]")[half]; c.scrollIntoView({ block: "center" }); toast(`${half + 1}. yorumda ${r[half].name ? "yorum metni" : "gelinin adı"} eksik — doldurun ya da yorumu silin`, true); return; }
      const btn = $("button[type=submit]", form); btn.disabled = true;
      try { await post("reviews", { reviews: r.filter((x) => x.name) }); dirty = false; await reload(); toast(`${DB.reviews.length} yorum kaydedildi`); renderReviews(); }
      catch (err) { toast(err.message, true); btn.disabled = false; }
    });
  }

  /* ======================================================================
     AYARLAR
     ====================================================================== */
  function renderSettings() {
    const S = DB.site, A = S.appointments;
    const fld = (name, label, val, opts = {}) => `<label class="f ${opts.full ? "full" : ""}"><span>${label}</span><input class="in" name="${name}" value="${esc(val)}" ${opts.type ? `type="${opts.type}"` : ""} placeholder="${esc(opts.ph || "")}">${opts.hint ? `<small>${opts.hint}</small>` : ""}</label>`;
    view.innerHTML = `
      <div class="head"><div><h1>Ayarlar</h1><p>İletişim bilgileri ve randevu saatleri. Buradaki değişiklikler sitenin her yerine uygulanır.</p></div></div>
      <form id="sf" novalidate>
        <section class="card"><h2>İletişim</h2>
          <div class="grid2">
            ${fld("whatsapp", "WhatsApp numarası", S.whatsapp, { type: "tel", hint: "Nasıl isterseniz yazın (0541 716 98 62 ya da +90 541…) — doğru biçime kendisi çevrilir." })}
            ${fld("phoneDisplay", "Telefon (görünen hali)", S.phoneDisplay, { ph: "+90 541 716 98 62" })}
            ${fld("email", "E-posta", S.email, { type: "email" })}
            ${fld("etsyShop", "Etsy mağaza linki", S.etsyShop, { type: "url" })}
            ${fld("instagram", "Instagram (atölye) linki", S.instagram, { type: "url", hint: "Link ya da @kullanıcıadı yazabilirsiniz." })}
            ${fld("instagramHandle", "Instagram kullanıcı adı", S.instagramHandle, { ph: "@burakaltas_atelier" })}
            ${fld("instagramStudio", "Yeni (influencer) Instagram hesabı", S.instagramStudio, { type: "url", ph: "https://www.instagram.com/…" })}
            ${fld("mapsUrl", "Google Haritalar linki", S.mapsUrl, { type: "url" })}
            ${fld("address", "Adres", S.address, { full: true })}
            <div class="f full"><span>Çalışma saatleri</span>${bi("hours", S.hours)}</div>
          </div>
        </section>
        <section class="card"><h2>Online randevular</h2><p class="hint">Gelinler bu gün ve saatler arasında görüşme seçebilir. Saatler Türkiye saatidir; site her gelin için kendi saat dilimine çevirir.</p>
          <div class="grid2">
            <label class="f"><span>İlk görüşme saati</span><input class="in" name="start" type="number" min="0" max="23" value="${A.start}"></label>
            <label class="f"><span>Son görüşme bitiş saati</span><input class="in" name="end" type="number" min="1" max="24" value="${A.end}"></label>
            <div class="f full"><span>Görüşme günleri</span><div class="chips">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="chip"><input type="checkbox" name="days" value="${d}" ${A.days.includes(d) ? "checked" : ""}><span>${DAYS[d]}</span></label>`).join("")}</div></div>
            ${fld("calcomUser", "Cal.com kullanıcı adı (isteğe bağlı · kurulumu Alim yapar)", A.calcomUser, { hint: "Doldurulursa gelinler takvimden kendileri randevu alır. Boşsa randevu talepleri WhatsApp'a gelir." })}
          </div>
        </section>
        <section class="card"><h2>Kişiselleştirme ücretleri (USD)</h2><p class="hint">Model sayfasındaki "Size özel olsun" seçeneklerinin yanında görünür ve seçildikçe fiyat güncellenir. <b>Boş bırakın</b> = ücret gösterilmez · <b>0</b> = "ücretsiz" yazar · <b>sayı</b> = "+$120" gibi gösterilir.</p>
          <div class="grid2">
            ${[["colour", "Renk değişikliği (fildişi dışında)"], ["sleevesLong", "Uzun kol ekleme"], ["sleevesDetachable", "Takılıp çıkarılabilir kol"], ["trainShorter", "Daha kısa kuyruk"], ["trainCathedral", "Katedral boy kuyruk"], ["neckHigher", "Daha kapalı yaka"], ["neckIllusion", "Tül (illüzyon) yaka"]].map(([k, label]) => `<label class="f"><span>${label}</span>${moneyInput(`ex_${k}`, (S.extras || {})[k] ?? "", { ph: "boş = gösterme" })}</label>`).join("")}
          </div>
        </section>
        <section class="card"><h2>Mağazalar</h2><p class="hint">Gelinliği beğenen kişi bu mağazalardan satın alır. Etsy ana mağazadır (her modelin Etsy linki model sayfasından girilir). Buraya Trendyol gibi diğer mağazalarınızı ekleyin; sitede Etsy düğmesinin altında ve sayfa sonunda görünürler. Bir modelin o mağazadaki ilan linkini model sayfasından ayrıca girebilirsiniz.</p>
          <div class="rows" id="stores">${(S.stores || []).concat({ name: "", url: "" }).map((x, i) => `<div class="grid2"><label class="f"><span>Mağaza adı</span><input class="in" data-sn="${i}" value="${esc(x.name)}" placeholder="ör. Trendyol" maxlength="40"></label><label class="f"><span>Mağaza linki</span><input class="in" data-su="${i}" type="url" inputmode="url" autocapitalize="off" value="${esc(x.url)}" placeholder="https://www.trendyol.com/magaza/…"></label></div>`).join("")}</div>
          <small>Yeni mağaza eklemek için en alttaki boş satırı doldurup kaydedin. Silmek için adını silip kaydedin.</small>
        </section>
        <section class="card"><h2>Canlı sohbet <em class="tech">kurulumu Alim yapar</em></h2><p class="hint">Ücretsiz Tawk.to hesabı açın (README'de adımlar). Sonra tawk.to › Administration › Chat Widget bölümündeki embed kodunda geçen adresi (https://embed.tawk.to/…) olduğu gibi aşağıya yapıştırın. Boş bırakırsanız sitede yalnızca WhatsApp butonu görünür. Mesajlara Tawk.to'nun telefon uygulamasından cevap verirsiniz.</p>
          <div class="grid2">
            ${fld("tawkPropertyId", "Tawk.to adresi ya da Property ID", (S.chat || {}).tawkPropertyId ? `https://embed.tawk.to/${S.chat.tawkPropertyId}/${S.chat.tawkWidgetId || "default"}` : "", { full: true, ph: "https://embed.tawk.to/65xxxxxxxxxxxxxxxxxx/1hxxxxxxx" })}
            ${fld("tawkWidgetTr", "Türkçe widget ID (isteğe bağlı)", (S.chat || {}).tawkWidgetTr, { hint: "Türkçe ziyaretçilere ayrı bir (Türkçe) sohbet penceresi göstermek isterseniz." })}
            <p class="note full">${(S.chat || {}).tawkPropertyId ? "✓ Canlı sohbet açık." : "Canlı sohbet şu an kapalı."}</p>
          </div>
        </section>
        <section class="card"><h2>Ziyaretçi istatistikleri <em class="tech">kurulumu Alim yapar</em></h2><p class="hint">Ücretsiz ve çerezsiz Cloudflare Web Analytics: kaç kişinin geldiğini, hangi ülkelerden ve hangi sayfalara baktığını gösterir; çerez bildirimi gerektirmez. Cloudflare › Analytics &amp; Logs › Web Analytics › siteyi ekleyin, size verilen kodu (ya da token'ı) aşağıya yapıştırın.</p>
          <div class="grid2">
            ${fld("cfToken", "Web Analytics token'ı ya da kodu", (S.analytics || {}).cloudflareToken, { full: true, ph: "ör. 0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d" })}
            <p class="note full">${(S.analytics || {}).cloudflareToken ? "✓ İstatistikler açık." : "İstatistikler şu an kapalı."}</p>
          </div>
        </section>
        <section class="card"><h2>Site</h2>
          <div class="grid2">
            ${fld("domain", "Alan adı", S.domain, { type: "url", hint: "Paylaşım önizlemeleri ve Google için. ör. https://www.burakaltas.com" })}
            <label class="check full"><input type="checkbox" name="showPrices" ${S.showPrices ? "checked" : ""}> Fiyatları sitede göster</label>
          </div>
        </section>
        <div class="savebar"><span class="msg">Değişiklik yok</span><button type="submit" class="btn btn--ok">Kaydet</button></div>
      </form>`;
    const form = $("#sf");
    form.addEventListener("input", markDirty);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const site = Object.fromEntries(["whatsapp", "phoneDisplay", "email", "etsyShop", "instagram", "instagramHandle", "instagramStudio", "mapsUrl", "address", "domain"].map((k) => [k, (fd.get(k) || "").trim()]));
      site.hours = readBi(form, "hours"); site.showPrices = fd.get("showPrices") === "on";
      site.appointments = { start: +fd.get("start"), end: +fd.get("end"), days: fd.getAll("days").map(Number), calcomUser: (fd.get("calcomUser") || "").trim() };
      site.analytics = { cloudflareToken: (fd.get("cfToken") || "").trim() };
      site.extras = Object.fromEntries(["colour", "sleevesLong", "sleevesDetachable", "trainShorter", "trainCathedral", "neckHigher", "neckIllusion"].map((k) => [k, parseMoney(fd.get(`ex_${k}`))]));
      site.stores = $$("[data-sn]").map((el) => ({ name: el.value.trim(), url: normUrl($(`[data-su="${el.dataset.sn}"]`).value) })).filter((x) => x.name);
      const badStore = site.stores.find((x) => x.url && !/^https:\/\/[^\s"'<>]+\.[^\s"'<>]+$/.test(x.url));
      if (badStore) return bad(`su${0}`, `${badStore.name} linki geçersiz görünüyor`);
      const bad = (name, t) => { toast(t, true); const el = form.elements[name]; if (el) { el.focus(); el.scrollIntoView({ block: "center" }); } };
      if (Object.values(site.extras).some((v) => Number.isNaN(v))) {
        const k = Object.keys(site.extras).map((x) => `ex_${x}`).find((n) => Number.isNaN(parseMoney(fd.get(n))));
        return bad(k, "Ücretler dolar olarak, sadece rakamla yazılır (ör. 120)");
      }
      // phone: 0541… / +90 541… / 0090… → 905417169862
      let wa = site.whatsapp.replace(/\D/g, "");
      if (wa.startsWith("00")) wa = wa.slice(2);
      if (/^0[1-9]\d{9}$/.test(wa)) wa = "90" + wa.slice(1);
      if (/^5\d{9}$/.test(wa)) wa = "90" + wa;
      if (!/^\d{10,15}$/.test(wa)) return bad("whatsapp", "WhatsApp numarası okunamadı — ör. 0541 716 98 62");
      site.whatsapp = wa;
      if (site.email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(site.email)) return bad("email", "E-posta adresi eksik görünüyor (ör. ad@alanadi.com)");
      const h = site.instagram.match(/^@?([\w.]{2,30})$/);
      if (h) site.instagram = `https://www.instagram.com/${h[1]}/`;
      for (const k of ["etsyShop", "instagram", "instagramStudio", "mapsUrl", "domain"]) {
        if (!site[k]) continue;
        site[k] = normUrl(site[k]);
        if (!/^https:\/\/[^\s"'<>]+\.[^\s"'<>]+$/.test(site[k])) return bad(k, "Bu link geçersiz görünüyor");
      }
      site.domain = site.domain.replace(/\/+$/, "");
      site.chat = { tawkPropertyId: (fd.get("tawkPropertyId") || "").trim(), tawkWidgetTr: (fd.get("tawkWidgetTr") || "").trim() };
      if (site.appointments.end <= site.appointments.start) { toast("Bitiş saati başlangıçtan sonra olmalı", true); return; }
      const btn = $("button[type=submit]", form); btn.disabled = true;
      try { await post("config", { site }); dirty = false; await reload(); toast("Ayarlar kaydedildi"); renderSettings(); }
      catch (err) { toast(err.message, true); btn.disabled = false; }
    });
  }

  /* ======================================================================
     YAYINLA
     ====================================================================== */
  /* ---------- Launch readiness: what still stands between the site and going live ---------- */
  const CHECKS_KEY = "ba-admin-checks";
  // ticks live on the panel computer, so phone and computer see the same list (old browser ticks are carried over once)
  const manual = () => { let old = {}; try { old = JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}"); } catch {} return { ...old, ...(DB.checks || {}) }; };
  function readiness() {
    const S = DB.site, live = DB.gowns.filter((g) => !g.draft), drafts = DB.gowns.length - live.length, m = manual();
    const n = (arr) => arr.length, names = (arr) => arr.slice(0, 4).map((g) => g.name).join(", ") + (arr.length > 4 ? "…" : "");
    const sample = live.filter((g) => g.images.some((x) => !/^assets\//.test(x)));
    const noEtsy = live.filter((g) => !g.etsy), noEn = live.filter((g) => !(g.story && g.story.en)), noPrice = live.filter((g) => !(g.price > 0));
    const sampleReviews = ["Elif", "Sarah", "Layla", "Anna"].every((nm) => (DB.reviews || []).some((r) => r.name === nm));
    const D = DB.designer || {}, designerOk = !!(D.photo && D.bio && (D.bio.tr || D.bio.en));
    const ok = (x) => (x ? "ok" : "todo");
    const groups = [
      ["Katalog", [
        { st: ok(!n(sample)), t: "Gerçek fotoğraflar", d: n(sample) ? `${n(sample)} modelde örnek (Unsplash) fotoğraf var: ${names(sample)}` : "Tüm modeller kendi fotoğraflarınızla", go: "#modeller" },
        { st: ok(!n(noPrice)), t: "Fiyatlar", d: n(noPrice) ? `${n(noPrice)} modelin fiyatı yok: ${names(noPrice)}` : "Tüm modellerin fiyatı var", go: "#modeller" },
        { st: ok(!n(noEtsy)), t: "Etsy ilan linkleri", d: n(noEtsy) ? `${n(noEtsy)} modelde Etsy linki yok — buton mağaza ana sayfasına gider` : "Her model kendi ilanına gidiyor", go: "#hizli" },
        { st: ok(!n(noEn)), t: "İngilizce açıklamalar", d: n(noEn) ? `${n(noEn)} modelde İngilizce hikâye yok: ${names(noEn)}` : "Tüm modeller iki dilde", go: "#modeller" },
        { st: drafts ? "todo" : "ok", t: "Taslaklar", d: drafts ? `${drafts} taslak kontrol bekliyor (sitede görünmüyorlar)` : "Bekleyen taslak yok", go: "#modeller" },
        { st: live.some((g) => g.video) ? "ok" : "opt", t: "Videolar", d: live.some((g) => g.video) ? `${live.filter((g) => g.video).length} modelin videosu var` : "İsteğe bağlı — hareket halindeki gelinlik en çok satan içerik", go: "#modeller" }
      ]],
      ["İçerik", [
        { st: ok(!sampleReviews), t: "Gelin yorumları", d: sampleReviews ? "Örnek yorumlar (Elif, Sarah, Layla, Anna) duruyor — izin alarak gerçekleriyle değiştirin" : "Gerçek yorumlar girilmiş", go: "#yorumlar" },
        { st: ok(designerOk), t: "Tasarımcı sayfası", d: designerOk ? "Portre ve hikâye girilmiş" : "Tasarımcı portresi ve hikâyesi eksik — sayfa menüde görünmüyor", go: "#tasarimci" }
      ]],
      ["Bilgiler — elle teyit", [
        { k: "email", t: "E-posta adresi", d: `${S.email} — alan adı alınınca bu adres kurulmalı ya da gerçek adres yazılmalı`, go: "#ayarlar" },
        { k: "etsy", t: "Etsy mağaza linki", d: S.etsyShop, go: "#ayarlar" },
        { k: "domain", t: "Alan adı", d: `${S.domain} — satın alındı ve bu adres doğru`, go: "#ayarlar" },
        { k: "policies", t: "Gizlilik & koşullar sayfası okundu ve onaylandı", d: "Kişisel verilerin saklanma süresi, üretim süreleri (satış koşulları mağazalarda)" },
        { k: "measure", t: "Ölçü kartı ifadeleri teyit edildi", d: "Bolluk payı, topuk yüksekliği, \"2 kg / 2 cm değişirse yeniden ölçün\"" },
        { k: "numbers", t: "Ana sayfadaki rakamlar teyit edildi", d: "Örn. işçilik saatleri ve inci sayıları" },
        { k: "consent", t: "Gerçek gelin fotoğrafları için izin alındı", d: "Site ve Instagram için gelinden yazılı onay (kişisel veriler kanunu gereği)" },
        { k: "callfees", t: "Ölçü ve prova görüşmelerinin ücreti netleşti", d: "\"Siparişe dahil\" mi? Şu an yalnızca tasarım görüşmesi \"ücretsiz\" yazıyor" },
        { k: "staff", t: "Kadın personel bilgisi netleşti", d: "Ölçüyü bir kadının alması seçilebiliyor — tasarım görüşmesinde de kadın personel olabilir mi" }
      ]],
      ["İsteğe bağlı", [
        { st: S.chat && S.chat.tawkPropertyId ? "ok" : "opt", t: "Canlı sohbet (Tawk.to)", d: S.chat && S.chat.tawkPropertyId ? "Açık" : "Kapalı — gelinler yalnızca WhatsApp'tan yazabilir", go: "#ayarlar" },
        { st: S.analytics && S.analytics.cloudflareToken ? "ok" : "opt", t: "Ziyaretçi istatistikleri", d: S.analytics && S.analytics.cloudflareToken ? "Açık" : "Kapalı — kaç kişinin geldiğini göremezsiniz", go: "#ayarlar" },
        { st: S.appointments && S.appointments.calcomUser ? "ok" : "opt", t: "Otomatik takvim (Cal.com)", d: S.appointments && S.appointments.calcomUser ? "Açık" : "Kapalı — randevu talepleri WhatsApp'a düşüyor", go: "#ayarlar" },
        { st: (S.stores || []).some((x) => x.url) ? "ok" : "opt", t: "Diğer mağazalar (Trendyol…)", d: (S.stores || []).some((x) => x.url) ? (S.stores || []).filter((x) => x.url).map((x) => x.name).join(", ") : "Mağaza linkleri girilmemiş — sitede yalnızca Etsy görünüyor", go: "#ayarlar" },
        { st: S.extras && Object.values(S.extras).some((v) => v !== null) ? "ok" : "opt", t: "Kişiselleştirme ücretleri", d: S.extras && Object.values(S.extras).some((v) => v !== null) ? "Girilmiş" : "Girilmemiş — seçeneklerde ücret yazmıyor", go: "#ayarlar" }
      ]]
    ].map(([title, items]) => [title, items.map((x) => (x.k ? { ...x, st: m[x.k] ? "ok" : "todo" } : x))]);
    const req = groups.flatMap(([, items]) => items).filter((x) => x.st !== "opt");
    const done = req.filter((x) => x.st === "ok").length;
    const icon = { ok: "✓", todo: "!", opt: "○" };
    return `
      <section class="card ready">
        <div class="ready__head"><h2>Yayına hazırlık</h2><span class="ready__score ${done === req.length ? "is-done" : ""}">${done} / ${req.length}</span></div>
        <p class="hint">${done === req.length ? "Her şey hazır — siteyi yayına alabilirsiniz." : "Siteyi yayına almadan önce tamamlanması gerekenler. Otomatik maddeler siz düzelttikçe kendiliğinden işaretlenir."}</p>
        ${groups.map(([title, items]) => `<h3 class="ready__group">${title}</h3><ul class="ready__list">${items.map((x) => `
          <li class="ready__item is-${x.st}">
            <span class="ready__icon" aria-hidden="true">${icon[x.st]}</span>
            <span class="ready__txt"><b>${esc(x.t)}</b><small>${esc(x.d || "")}</small></span>
            ${x.k ? `<label class="ready__check"><input type="checkbox" data-check="${x.k}" ${m[x.k] ? "checked" : ""}> Tamam</label>` : ""}
            ${x.go && x.st !== "ok" ? `<a class="btn btn--sm btn--ghost" href="${x.go}">Düzelt →</a>` : ""}
          </li>`).join("")}</ul>`).join("")}
      </section>`;
  }

  function renderPublish() {
    view.innerHTML = `
      <div class="head"><div><h1>Yayınla</h1><p>Kaydettiğiniz her şey hemen <a href="/" target="_blank" rel="noopener">önizleme sitesinde</a> görünür. İnternetteki gerçek site henüz açılmadı; açıldığında bu sayfadaki tek bir düğmeyle güncellenecek.</p></div></div>
      ${readiness()}
      ${DB.remote ? `<section class="card"><h2>Siteyi yayına almak</h2><p class="hint">Alan adı ve sunucu hazır olunca yayın, Alim'in bilgisayarından yapılır. Yukarıdaki listede eksik kalanları tamamlamanız yeterli.</p></section>` : `<section class="card">
        <ol class="steps">
          <li><b>Yayın klasörünü hazırlayın</b><p>Sadece sitenin dosyalarını içeren "yayin" klasörü oluşturulur (admin paneli ve notlar dahil edilmez).<br><button class="btn" data-pub style="margin-top:10px">Yayın klasörünü hazırla</button></p></li>
          <li><b>Klasörü açın</b><p><button class="btn btn--ghost" data-open style="margin-top:6px">"yayin" klasörünü göster</button></p></li>
          <li><b>Sunucuya yükleyin</b><p>Sunucu kurulunca bu adım otomatik olacak (deploy/README.md).</p></li>
        </ol>
        <p class="note" id="pubres" hidden></p>
      </section>`}`;
    view.onchange = (e) => {
      const c = e.target.closest("[data-check]"); if (!c) return;
      c.disabled = true;
      post("checks", { k: c.dataset.check, v: c.checked }).then((r) => { DB.checks = r.checks; renderPublish(); }).catch((err) => { toast(err.message, true); c.checked = !c.checked; c.disabled = false; });
    };
    view.onclick = async (e) => {
      if (e.target.closest("[data-pub]")) {
        try { const r = await post("publish", {}); const n = $("#pubres"); n.hidden = false; n.className = "note note--ok"; n.textContent = `Hazır: ${r.gowns} model sayfası dahil. Klasör: ${r.dist}`; }
        catch (err) { toast(err.message, true); }
      }
      if (e.target.closest("[data-open]")) { try { await post("open-folder", {}); } catch (err) { toast(err.message, true); } }
    };
  }

  /* ---------- Router ---------- */
  let lastHash = location.hash;
  /* ======================================================================
     INSTAGRAM — posts from Instagram's own data export become draft gowns
     (the folder is read in this browser; only the chosen photos are uploaded)
     ====================================================================== */
  // Instagram writes text as UTF-8 bytes in Latin-1 escapes ("Ã§" instead of "ç") — undo that
  const fixText = (s) => {
    s = String(s || "");
    if (!/[À-ÿ][\u0080-¿]/.test(s)) return s;
    try { return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(s, (c) => c.charCodeAt(0) & 255)); } catch { return s; }
  };
  const IG_DONE = "ba-ig-done";
  const igDone = () => { let old = []; try { old = JSON.parse(localStorage.getItem(IG_DONE) || "[]"); } catch {} return new Set([...old, ...DB.gowns.map((g) => g.ig).filter(Boolean), ...(DB.trash || []).map((t) => t.ig).filter(Boolean)]); };
  const markDone = (ids) => { try { localStorage.setItem(IG_DONE, JSON.stringify([...new Set([...igDone(), ...ids])])); } catch {} };
  // "Yakamoz 🤍 #gelinlik #bridal" → "Yakamoz"
  const GENERIC = /^(gelinli[kğ]\p{L}*|model\p{L}*|elbise\p{L}*|after|party|bridal|wedding|dress|gown|yeni|new)$/iu;
  const nameFrom = (caption, date) => {
    const line = caption.split("\n").map((l) => l.replace(/[#@][\p{L}\p{N}_.]+/gu, "").trim()).find((l) => /\p{L}/u.test(l)) || "";
    // text before the first dash, comma, full stop or emoji; generic words dropped; at most 3 words
    const words = line.split(/[—–|,.:;!?(]|\s-\s|\p{Extended_Pictographic}/u)
      .map((seg) => seg.replace(/[^\p{L}\p{N}\s'’&-]/gu, " ").split(/\s+/).filter((w) => w && !GENERIC.test(w)).slice(0, 3).join(" "))
      .find(Boolean) || "";
    return words.slice(0, 40).trim() || `Instagram ${date ? date.toLocaleDateString("tr-TR") : ""}`.trim();
  };
  const storyFrom = (caption) => caption.split("\n").map((l) => l.replace(/[#@][\p{L}\p{N}_.]+/gu, "").replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\uFE0F\u200D]/gu, "").trim()).filter(Boolean).join(" ").replace(/\s{2,}/g, " ").slice(0, 1200);

  async function readExport(fileList) {
    const files = [...fileList];
    // paths without the top folder name, so "media/posts/…" in the JSON can be found directly
    const byPath = new Map(files.map((f) => [f.webkitRelativePath.replace(/\\/g, "/").split("/").slice(1).join("/"), f]));
    const find = (uri) => {
      uri = String(uri || "").replace(/\\/g, "/").replace(/^\/+/, "");
      if (byPath.has(uri)) return byPath.get(uri);
      for (const [p, f] of byPath) if (p.endsWith("/" + uri) || uri.endsWith("/" + p)) return f;
      return null;
    };
    const jsons = files.filter((f) => /(^|\/)posts_\d+\.json$/i.test(f.webkitRelativePath.replace(/\\/g, "/")));
    if (!jsons.length) throw new Error("Bu klasörde Instagram gönderi dosyası (posts_1.json) bulunamadı. Arşivi zip'ten çıkarıp ana klasörü seçin; arşivi JSON biçiminde istediğinizden emin olun.");
    const posts = [];
    for (const j of jsons) {
      let data; try { data = JSON.parse(await j.text()); } catch { continue; }
      const list = Array.isArray(data) ? data : data.ig_posts || data.posts || [];
      for (const p of list) {
        const media = (p.media || []).filter((m) => m && m.uri);
        const found = media.map((m) => find(m.uri)).filter(Boolean);
        const images = found.filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
        if (!images.length) continue;
        const ts = p.creation_timestamp || (media[0] && media[0].creation_timestamp) || 0;
        posts.push({ id: `${ts}-${images[0].name}`.replace(/[^w.-]/g, "").slice(0, 80), date: ts ? new Date(ts * 1000) : null, caption: fixText(p.title || (media[0] && media[0].title) || ""), images, videos: found.length - images.length });
      }
    }
    return posts.sort((a, b) => (b.date || 0) - (a.date || 0));
  }

  function renderInstagram() {
    view.innerHTML = `
      <div class="head"><div><h1>Instagram'dan aktar</h1><p>Instagram arşivinizdeki gönderileri seçin; her biri fotoğraflarıyla birlikte <b>taslak model</b> olur. Taslaklar sitede görünmez — Modeller'de kontrol edip yayına alırsınız.</p></div></div>
      <section class="card">
        <h2>1. Arşivi isteyin <em>(bir kez)</em></h2>
        <ol class="steps">
          <li>Instagram › <b>Ayarlar › Hesaplar Merkezi › Bilgilerin ve izinlerin › Bilgilerini indir</b></li>
          <li><b>Bazı bilgi türleri</b> › yalnızca <b>Gönderiler</b> · Biçim: <b>JSON</b> · Medya kalitesi: <b>Yüksek</b></li>
          <li>Instagram birkaç saat içinde e-postayla indirme linki gönderir. Zip dosyasını indirip bir klasöre çıkarın.</li>
        </ol>
      </section>
      <p class="note note--warn igphone" hidden>Bu adım telefonda yapılamaz (telefonlar klasör seçtirmiyor). Arşivi bilgisayarda açıp bu sayfayı bilgisayardan kullanın.</p>
      <section class="card">
        <h2>2. Klasörü seçin</h2>
        <label class="drop" tabindex="0">
          <input type="file" id="igdir" webkitdirectory multiple hidden>
          <b>Instagram arşiv klasörünü seçin</b>
          <small>Zip'ten çıkarılmış ana klasör · dosyalar bu bilgisayarda okunur, yalnızca seçtiğiniz fotoğraflar yüklenir</small>
        </label>
        <div id="igres"></div>
      </section>`;
    const input = $("#igdir"), drop = $(".drop", view), res = $("#igres");
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))) $(".igphone").hidden = false;
    drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", async () => {
      if (!input.files.length) return;
      res.innerHTML = `<p class="note">Arşiv okunuyor…</p>`;
      try { showPosts(await readExport(input.files)); }
      catch (e) { res.innerHTML = `<p class="note note--err">${esc(e.message)}</p>`; }
    });

    function showPosts(posts) {
      const done = igDone(), picked = new Set();
      const urls = [];
      res.innerHTML = `
        <div class="igbar">
          <input class="in" type="search" id="igq" placeholder="Açıklamada ara (ör. prenses, dantel)">
          <label class="f" style="margin:0"><select class="sel" id="igcol">${DB.collections.map((c) => `<option value="${c.id}">${esc(c.name.tr || c.name.en)}</option>`).join("")}</select></label>
          <button type="button" class="btn btn--ok" id="iggo" disabled>Seçilenleri taslak yap</button>
        </div>
        <p class="hint" id="igcount"></p>
        <div class="iggrid" id="iggrid"></div>`;
      const grid = $("#iggrid"), go = $("#iggo");
      const draw = () => {
        urls.splice(0).forEach(URL.revokeObjectURL);
        const q = $("#igq").value.trim().toLocaleLowerCase("tr");
        const shown = posts.filter((p) => !q || p.caption.toLocaleLowerCase("tr").includes(q));
        $("#igcount").textContent = `${posts.length} gönderi · ${shown.length} gösteriliyor · ${picked.size} seçili`;
        grid.innerHTML = shown.map((p) => {
          const u = URL.createObjectURL(p.images[0]); urls.push(u);
          return `<label class="igpost ${picked.has(p.id) ? "is-on" : ""}">
            <input type="checkbox" data-ig="${esc(p.id)}" ${picked.has(p.id) ? "checked" : ""}>
            <img src="${u}" alt="" loading="lazy">
            <span class="igpost__meta">${p.date ? p.date.toLocaleDateString("tr-TR") : ""} · ${p.images.length} foto${p.videos ? ` · ${p.videos} video atlandı` : ""}${done.has(p.id) ? ` · <b>aktarıldı</b>` : ""}${DB.gowns.some((g) => slug(g.name) === slug(nameFrom(p.caption, p.date))) ? ` · <b>bu adla model var</b>` : ""}</span>
            <span class="igpost__cap">${esc(p.caption.slice(0, 140)) || "<i>açıklama yok</i>"}</span>
          </label>`;
        }).join("") || `<p class="note">Eşleşen gönderi yok.</p>`;
        go.disabled = !picked.size;
        go.textContent = picked.size ? `${picked.size} gönderiyi taslak yap` : "Seçilenleri taslak yap";
      };
      $("#igq").addEventListener("input", draw);
      grid.addEventListener("change", (e) => {
        const c = e.target.closest("[data-ig]"); if (!c) return;
        c.checked ? picked.add(c.dataset.ig) : picked.delete(c.dataset.ig);
        c.closest(".igpost").classList.toggle("is-on", c.checked);
        $("#igcount").textContent = `${posts.length} gönderi · ${picked.size} seçili`;
        go.disabled = !picked.size; go.textContent = picked.size ? `${picked.size} gönderiyi taslak yap` : "Seçilenleri taslak yap";
      });
      go.addEventListener("click", async () => {
        const chosen = posts.filter((p) => picked.has(p.id)), collection = $("#igcol").value;
        const total = chosen.reduce((n, p) => n + Math.min(p.images.length, 12), 0);
        if (!confirm(`${chosen.length} gönderi taslak model olacak (${total} fotoğraf yüklenecek). Devam edilsin mi?`)) return;
        go.disabled = true;
        const drafts = [], ids = new Set(DB.gowns.map((g) => g.id));
        const prefix = collection === "afterparty" ? "AP-2" : "BA-1";
        let n = +nextCode(collection).slice(prefix.length), k = 0;
        try {
          for (const p of chosen) {
            const name = nameFrom(p.caption, p.date);
            const images = [];
            for (const f of p.images.slice(0, 12)) {
              go.textContent = `Yükleniyor ${++k} / ${total}…`;
              try { images.push(await processAndUpload(f, name)); } catch (e) { toast(`${f.name}: ${e.message}`, true); }
            }
            if (!images.length) continue;
            let id = slug(name) || "model", i = 2;
            while (ids.has(id)) id = `${slug(name) || "model"}-${i++}`;
            ids.add(id);
            drafts.push({ id, no: prefix + String(n++).padStart(2, "0"), name, collection, meaning: {}, silhouette: collection === "afterparty" ? "mini" : "aline", neckline: "strapless",
              features: [], fabric: {}, hours: 0, price: 0, weeks: [8, 12], etsy: "", images, story: { tr: storyFrom(p.caption), en: "" }, draft: true, ig: p.id });
          }
          if (!drafts.length) throw new Error("Hiç fotoğraf yüklenemedi");
          await post("gowns", { gowns: [...DB.gowns, ...drafts] });
          markDone(chosen.map((p) => p.id));
          await reload();
          toast(`${drafts.length} taslak model oluştu — Modeller'de kontrol edip yayına alın`);
          location.hash = "#modeller";
        } catch (e) { toast(e.message, true); go.disabled = false; go.textContent = `${picked.size} gönderiyi taslak yap`; }
      });
      draw();
    }
  }

  async function route() {
    if (dirty && !confirm("Kaydedilmemiş değişiklikler var. Sayfadan çıkılsın mı?")) { history.replaceState(null, "", lastHash); return; }
    dirty = false; lastHash = location.hash;
    if (!DB) { try { await reload(); } catch { view.innerHTML = `<p class="note">Veriler okunamadı. "Admin Paneli.bat" penceresinin açık olduğundan emin olun.</p>`; return; } }
    const h = decodeURIComponent(location.hash.slice(1)) || "modeller";
    const tab = h.startsWith("model") || h.startsWith("yeni") || h === "hizli" ? "modeller" : h;
    $$(".side__nav a").forEach((a) => (a.dataset.tab === tab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    view.onclick = null; view.onchange = null; view.oninput = null;
    if (h.startsWith("model=")) renderEditor(h.slice(6));
    else if (h.startsWith("yeni")) renderEditor(null, h.split("=")[1]);
    else if (h === "tasarimci") renderDesigner();
    else if (h === "yorumlar") renderReviews();
    else if (h === "ayarlar") renderSettings();
    else if (h === "instagram") renderInstagram();
    else if (h === "hizli") renderQuick();
    else if (h === "yayinla") renderPublish();
    else renderList();
    view.focus({ preventScroll: true }); scrollTo(0, 0);
  }
  addEventListener("hashchange", route);
  route();
})();
