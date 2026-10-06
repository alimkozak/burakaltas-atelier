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
  const VER_OF = { gowns: "data", designer: "data", reviews: "data", config: "config" };
  async function post(route, body) {
    const vk = VER_OF[route];
    const payload = vk && DB.ver ? { ...body, ver: DB.ver[vk] } : body;
    const r = await fetch(`/api/${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && j.login) { dirty = false; location.href = "/giris"; }
    if (r.status === 409) showConflict();
    if (!r.ok) throw new Error(j.error || "Kaydedilemedi");
    if (j.ver) DB.ver = j.ver;
    return j;
  }
  function showConflict() {
    if ($("#conflict")) return;
    const bar = document.createElement("div");
    bar.id = "conflict"; bar.className = "conflict"; bar.setAttribute("role", "alert");
    bar.innerHTML = `<span><b>Bu arada başka biri de kaydetti.</b> Sizin son değişikliğiniz kaydedilmedi; onun işini silmemek için sayfayı yenileyip değişikliğinizi tekrar yapın.</span><button type="button" class="btn btn--sm">Sayfayı yenile</button>`;
    bar.querySelector("button").onclick = () => { dirty = false; location.reload(); };
    document.body.append(bar);
  }
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
            ${max > 1 && i === 0 ? `<span class="photo__tag">Kapak</span>` : ""}${max > 1 && i === 1 ? `<span class="photo__tag">Arka / 2. görsel</span>` : ""}
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
        try {
          for (let k = 0; k < files.length; k++) {
            box.hidden = false; box.textContent = `Yükleniyor ${k + 1} / ${files.length}…`;
            const p = await processAndUpload(files[k], name());
            if (max === 1) list.splice(0, list.length, p); else list.push(p);
          }
          onChange(); draw(); toast("Fotoğraflar eklendi — kaydetmeyi unutmayın");
        } catch (e) { box.hidden = true; toast(e.message, true); }
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
        try {
          if (!file) return;
          if (!VIDEO_TYPES.includes(file.type)) throw new Error(`"${file.name}" bir video değil ya da desteklenmiyor. MP4 ya da MOV yükleyin.`);
          if (file.size > 150 * 1048576) throw new Error(`Video çok büyük (${mb(file.size)}). 1080p ve 10–20 saniye olarak yeniden kaydedin; en fazla 150 MB.`);
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
        finally { if (url) URL.revokeObjectURL(url); }
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
  function renderList() {
    const G = DB.gowns, C = DB.collections;
    view.innerHTML = `
      <div class="head">
        <div><h1>Modeller <small>${G.length} model</small></h1><p>Sıralama sitedeki sırayı belirler. ★ işaretli modeller ana sayfada öne çıkar.</p></div>
        <a class="btn" href="#yeni">+ Yeni model</a>
      </div>
      <div class="toolbar">
        <input type="search" id="q" placeholder="Model adı ya da kodu ile ara…" aria-label="Ara">
        <select id="fc" aria-label="Koleksiyon"><option value="">Tüm koleksiyonlar</option>${C.map((c) => `<option value="${c.id}">${esc(c.name.tr || c.name.en)}</option>`).join("")}</select>
      </div>
      <div class="list" id="list"></div>`;
    const draw = () => {
      const q = $("#q").value.toLocaleLowerCase("tr"), fc = $("#fc").value;
      $("#list").innerHTML = G.map((g, i) => ({ g, i })).filter(({ g }) => (!fc || g.collection === fc) && (!q || `${g.name} ${g.no}`.toLocaleLowerCase("tr").includes(q))).map(({ g, i }) => {
        const col = C.find((c) => c.id === g.collection);
        const warn = [!g.etsy && "Etsy linki yok", !(g.story?.en) && "İngilizce açıklama yok", g.images.some((x) => !/^assets\//.test(x)) && "Örnek fotoğraf"].filter(Boolean);
        return `<div class="item" data-i="${i}">
          ${g.images[0] ? `<img src="${esc(src(g.images[0], 200))}" alt="" loading="lazy">` : `<div class="noimg"></div>`}
          <div>
            <div class="item__name">${esc(g.name)} ${g.featured ? `<span class="pill pill--gold">★ öne çıkan</span>` : ""}</div>
            <div class="item__meta"><span>${esc(g.no)}</span><span>${esc(col ? col.name.tr || col.name.en : g.collection)}</span><span>${L.silhouette[g.silhouette] || ""}</span><span>${money(g.price)}</span>${warn.map((w) => `<span class="pill pill--warn">${w}</span>`).join("")}</div>
          </div>
          <div class="item__acts">
            <button class="icon" data-up title="Yukarı taşı" aria-label="Yukarı taşı" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="icon" data-down title="Aşağı taşı" aria-label="Aşağı taşı" ${i === G.length - 1 ? "disabled" : ""}>↓</button>
            <button class="icon" data-star title="Öne çıkar" aria-label="Öne çıkar" aria-pressed="${!!g.featured}">${g.featured ? "★" : "☆"}</button>
            <a class="btn btn--sm btn--ghost" href="/gown-${esc(g.id)}.html" target="_blank" rel="noopener">Önizle ↗</a>
            <button class="btn btn--sm btn--ghost" data-dup>Kopyala</button>
            <a class="btn btn--sm" href="#model=${encodeURIComponent(g.id)}">Düzenle</a>
          </div>
        </div>`;
      }).join("") || `<p class="note">Eşleşen model yok.</p>`;
    };
    $("#q").addEventListener("input", draw); $("#fc").addEventListener("change", draw); draw();
    $("#list").onclick = async (e) => {
      const it = e.target.closest(".item"); if (!it) return;
      const i = +it.dataset.i, list = clone(G);
      if (e.target.closest("[data-up]")) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      else if (e.target.closest("[data-down]")) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      else if (e.target.closest("[data-star]")) list[i].featured = !list[i].featured;
      else if (e.target.closest("[data-dup]")) { location.hash = `#yeni=${encodeURIComponent(G[i].id)}`; return; }
      else return;
      try { await post("gowns", { gowns: list }); await reload(); renderList(); toast("Kaydedildi · site güncellendi"); }
      catch (err) { toast(err.message, true); }
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
        <div><h1>${isNew ? "Yeni model" : esc(g.name)}</h1><p>${isNew ? "Alanları doldurup fotoğrafları ekleyin. Kaydedince model sitede hemen yayına hazır olur." : `Kod ${esc(g.no)} · <a href="/gown-${esc(g.id)}.html" target="_blank" rel="noopener">sitede gör ↗</a>`}</p></div>
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
              <label class="f"><span>Başlangıç fiyatı (USD) *</span><input class="in" name="price" type="number" min="0" step="10" value="${esc(g.price)}" placeholder="ör. 1290"><small>Etsy'deki fiyatla aynı ya da daha yüksek olmalı.</small></label>
              <div class="f full"><span>Adın anlamı <em>(isteğe bağlı)</em></span>${bi("meaning", g.meaning, { ph: { tr: "ör. denizde ay parıltısı", en: "e.g. moonlight on the sea" } })}</div>
            </div>
          </section>

          <section class="card">
            <h2>Fotoğraflar *</h2><p class="hint">İlk fotoğraf kapaktır; ikincisi, fareyle üzerine gelince görünen (arka görünüm için ideal). Sürükleyerek ya da oklarla sıralayın. En az 3 fotoğraf önerilir: ön, arka, detay.</p>
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
            <h2>Satış</h2><p class="hint">Etsy'de bu modelin ilanını açın ve linkini yapıştırın (Etsy › ilan › Paylaş › "Share & Save" linki önerilir — %4 ücret iadesi). Boşsa buton mağaza ana sayfasına gider.</p>
            <div class="grid2">
              <label class="f full"><span>Etsy ilan linki</span><input class="in" name="etsy" type="url" value="${esc(g.etsy)}" placeholder="https://www.etsy.com/listing/…"></label>
              <label class="check"><input type="checkbox" name="featured" ${g.featured ? "checked" : ""}> Ana sayfada öne çıkar ★</label>
              <label class="check full"><input type="checkbox" name="concept" ${g.concept ? "checked" : ""}> Henüz dikilmedi — görseller çizim ya da görselleştirme <small style="display:block;color:var(--mute);margin-left:26px">Sitede “Tasarım · sipariş üzerine dikilir” etiketi ve açıklaması çıkar. Yapay zekâyla üretilmiş görsel kullanıyorsanız Etsy ilanında da belirtin.</small></label>
            </div>
          </section>
          <div class="savebar">
            <span class="msg">${isNew ? "Yeni model — henüz kaydedilmedi" : "Değişiklik yok"}</span>
            <div class="row">
              ${isNew ? "" : `<button type="button" class="btn btn--danger" data-del>Modeli sil</button>`}
              <button type="submit" class="btn btn--ok">Kaydet</button>
            </div>
          </div>
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
        price: Number(fd.get("price")) || 0, meaning: readBi(form, "meaning"), silhouette: fd.get("silhouette"), neckline: fd.get("neckline"),
        features: fd.getAll("features"), fabric: readBi(form, "fabric"), hours: Number(fd.get("hours")) || 0,
        weeks: [Number(fd.get("w0")) || 8, Number(fd.get("w1")) || Number(fd.get("w0")) || 12],
        story: readBi(form, "story"), etsy: (fd.get("etsy") || "").trim(), featured: fd.get("featured") === "on", concept: fd.get("concept") === "on", images: g.images,
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
      if (!(x.price > 0)) return fail("Fiyat girin", form.elements.price);
      if (!x.images.length) return fail("En az bir fotoğraf ekleyin");
      if (isNew) {
        let idc = slug(x.name) || "model", n = 2;
        while (DB.gowns.some((o) => o.id === idc)) idc = `${slug(x.name)}-${n++}`;
        x.id = idc;
      }
      const list = clone(DB.gowns);
      if (isNew) list.push(x); else list[list.findIndex((o) => o.id === g.id)] = x;
      try {
        const btn = $("button[type=submit]", form); btn.disabled = true; btn.textContent = "Kaydediliyor…";
        await post("gowns", { gowns: list });
        dirty = false; await reload();
        toast(`"${x.name}" kaydedildi · site güncellendi`);
        location.hash = "#modeller";
      } catch (err) { fail(err.message); const btn = $("button[type=submit]", form); btn.disabled = false; btn.textContent = "Kaydet"; }
    });
    $("[data-del]", form)?.addEventListener("click", async () => {
      if (!confirm(`"${g.name}" modeli siteden silinsin mi? Bu işlem geri alınabilir: .yedek klasöründe yedek tutulur.`)) return;
      try { await post("gowns", { gowns: DB.gowns.filter((o) => o.id !== g.id) }); dirty = false; await reload(); toast("Model silindi"); location.hash = "#modeller"; }
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
        <div><h1>Tasarımcı sayfası</h1><p>Burak'ın tanıtım sayfası. Boş bıraktığınız alanlar sitede görünmez; sayfa yarım dolu haliyle de düzgün görünür.</p><div class="meter"><i id="meter"></i></div></div>
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
          <h2>Alıntı</h2><p class="hint">Burak'ın kendi sözü — sayfada büyük harflerle öne çıkar.</p>
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
        press: $$("[data-pn]").map((el) => ({ name: el.value.trim(), url: $(`[data-pu="${el.dataset.pn}"]`).value.trim() }))
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
      try { await post("designer", { designer: collect() }); dirty = false; await reload(); toast("Tasarımcı sayfası kaydedildi"); renderDesigner(); }
      catch (err) { toast(err.message, true); }
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
      if (e.target.closest("[data-rrm]")) list.splice(i, 1);
      else if (e.target.closest("[data-rup]")) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      else if (e.target.closest("[data-rdown]")) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      else return;
      DB.reviews = list; renderReviews(); markDirty();
    };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try { const r = collect(); await post("reviews", { reviews: r }); dirty = false; await reload(); toast(`${DB.reviews.length} yorum kaydedildi`); renderReviews(); }
      catch (err) { toast(err.message, true); }
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
            ${fld("whatsapp", "WhatsApp numarası", S.whatsapp, { hint: "Ülke koduyla, boşluksuz: 905417169862" })}
            ${fld("phoneDisplay", "Telefon (görünen hali)", S.phoneDisplay, { ph: "+90 541 716 98 62" })}
            ${fld("email", "E-posta", S.email, { type: "email" })}
            ${fld("etsyShop", "Etsy mağaza linki", S.etsyShop, { type: "url" })}
            ${fld("instagram", "Instagram (atölye) linki", S.instagram, { type: "url" })}
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
            ${fld("calcomUser", "Cal.com kullanıcı adı (isteğe bağlı)", A.calcomUser, { hint: "Doldurursanız gelinler takvimden kendileri rezervasyon yapar (README'de kurulum adımları). Boşsa talepler WhatsApp'a gelir." })}
          </div>
        </section>
        <section class="card"><h2>Kişiselleştirme ücretleri (USD)</h2><p class="hint">Model sayfasındaki "Size özel olsun" seçeneklerinin yanında görünür ve seçildikçe fiyat güncellenir. <b>Boş bırakın</b> = ücret gösterilmez · <b>0</b> = "ücretsiz" yazar · <b>sayı</b> = "+$120" gibi gösterilir.</p>
          <div class="grid2">
            ${[["colour", "Renk değişikliği (fildişi dışında)"], ["sleevesLong", "Uzun kol ekleme"], ["sleevesDetachable", "Takılıp çıkarılabilir kol"], ["trainShorter", "Daha kısa kuyruk"], ["trainCathedral", "Katedral boy kuyruk"]].map(([k, label]) => `<label class="f"><span>${label}</span><input class="in" name="ex_${k}" type="number" min="0" step="10" value="${(S.extras || {})[k] ?? ""}" placeholder="boş = gösterme"></label>`).join("")}
          </div>
        </section>
        <section class="card"><h2>Canlı sohbet</h2><p class="hint">Ücretsiz Tawk.to hesabı açın (README'de adımlar). Sonra tawk.to › Administration › Chat Widget bölümündeki embed kodunda geçen adresi (https://embed.tawk.to/…) olduğu gibi aşağıya yapıştırın. Boş bırakırsanız sitede yalnızca WhatsApp butonu görünür. Mesajlara Tawk.to'nun telefon uygulamasından cevap verirsiniz.</p>
          <div class="grid2">
            ${fld("tawkPropertyId", "Tawk.to adresi ya da Property ID", (S.chat || {}).tawkPropertyId ? `https://embed.tawk.to/${S.chat.tawkPropertyId}/${S.chat.tawkWidgetId || "default"}` : "", { full: true, ph: "https://embed.tawk.to/65xxxxxxxxxxxxxxxxxx/1hxxxxxxx" })}
            ${fld("tawkWidgetTr", "Türkçe widget ID (isteğe bağlı)", (S.chat || {}).tawkWidgetTr, { hint: "Türkçe ziyaretçilere ayrı bir (Türkçe) sohbet penceresi göstermek isterseniz." })}
            <p class="note full">${(S.chat || {}).tawkPropertyId ? "✓ Canlı sohbet açık." : "Canlı sohbet şu an kapalı."}</p>
          </div>
        </section>
        <section class="card"><h2>Ziyaretçi istatistikleri</h2><p class="hint">Ücretsiz ve çerezsiz Cloudflare Web Analytics: kaç kişinin geldiğini, hangi ülkelerden ve hangi sayfalara baktığını gösterir; çerez bildirimi gerektirmez. Cloudflare › Analytics &amp; Logs › Web Analytics › siteyi ekleyin, size verilen kodu (ya da token'ı) aşağıya yapıştırın.</p>
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
      site.extras = Object.fromEntries(["colour", "sleevesLong", "sleevesDetachable", "trainShorter", "trainCathedral"].map((k) => [k, fd.get(`ex_${k}`)]));
      site.chat = { tawkPropertyId: (fd.get("tawkPropertyId") || "").trim(), tawkWidgetTr: (fd.get("tawkWidgetTr") || "").trim() };
      if (site.appointments.end <= site.appointments.start) { toast("Bitiş saati başlangıçtan sonra olmalı", true); return; }
      try { await post("config", { site }); dirty = false; await reload(); toast("Ayarlar kaydedildi"); renderSettings(); }
      catch (err) { toast(err.message, true); }
    });
  }

  /* ======================================================================
     YAYINLA
     ====================================================================== */
  function renderPublish() {
    view.innerHTML = `
      <div class="head"><div><h1>Yayınla</h1><p>Panelde yaptığınız her şey bu bilgisayarda kayıtlı. İnternetteki siteyi güncellemek için yayın klasörünü hazırlayıp Netlify'a yükleyin.</p></div></div>
      <section class="card">
        <ol class="steps">
          <li><b>Yayın klasörünü hazırlayın</b><p>Sadece sitenin dosyalarını içeren "yayin" klasörü oluşturulur (admin paneli ve notlar dahil edilmez).<br><button class="btn" data-pub style="margin-top:10px">Yayın klasörünü hazırla</button></p></li>
          <li><b>Klasörü açın</b><p><button class="btn btn--ghost" data-open style="margin-top:6px">"yayin" klasörünü göster</button></p></li>
          <li><b>Netlify'a sürükleyin</b><p><a href="https://app.netlify.com/drop" target="_blank" rel="noopener">app.netlify.com/drop</a> adresini açın ve "yayin" klasörünü sayfaya sürükleyip bırakın. İlk seferden sonra: Netlify'da sitenizi açın › Deploys › klasörü "Drag and drop" alanına bırakın — adres aynı kalır.</p></li>
        </ol>
        <p class="note" id="pubres" hidden></p>
      </section>`;
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
  async function route() {
    if (dirty && !confirm("Kaydedilmemiş değişiklikler var. Sayfadan çıkılsın mı?")) { history.replaceState(null, "", lastHash); return; }
    dirty = false; lastHash = location.hash;
    if (!DB) { try { await reload(); } catch { view.innerHTML = `<p class="note">Veriler okunamadı. "Admin Paneli.bat" penceresinin açık olduğundan emin olun.</p>`; return; } }
    const h = decodeURIComponent(location.hash.slice(1)) || "modeller";
    const tab = h.startsWith("model") || h.startsWith("yeni") ? "modeller" : h;
    $$(".side__nav a").forEach((a) => (a.dataset.tab === tab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    view.onclick = null;
    if (h.startsWith("model=")) renderEditor(h.slice(6));
    else if (h.startsWith("yeni")) renderEditor(null, h.split("=")[1]);
    else if (h === "tasarimci") renderDesigner();
    else if (h === "yorumlar") renderReviews();
    else if (h === "ayarlar") renderSettings();
    else if (h === "yayinla") renderPublish();
    else renderList();
    view.focus({ preventScroll: true }); scrollTo(0, 0);
  }
  addEventListener("hashchange", route);
  route();
})();
