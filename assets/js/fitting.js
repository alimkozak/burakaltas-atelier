/* ==========================================================================
   ONLINE FITTING ROOM — appointments + measurement card
   Booking: Cal.com inline embed when SITE.appointments.calcomUser is set,
   otherwise a built-in request flow that sends the chosen slot to WhatsApp.
   ========================================================================== */
(() => {
  "use strict";
  const BA = window.BA, S = window.SITE, A = S.appointments;
  const { $, $$, t, L, esc, isoDate, wa, store, toast, onLang, fmtDate, byId, params, ICON } = BA;
  const lang = BA.lang;
  const loc = () => (lang() === "tr" ? "tr-TR" : "en-GB");
  const F = (o, vars) => { let s = L(o); if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b); return s; };

  /* ---------- Strings used only on this page ---------- */
  const TX = {
    free: { en: "Free", tr: "Ücretsiz" },
    min: { en: "{n} min", tr: "{n} dk" },
    step2: { en: "2. Pick a day", tr: "2. Gün seçin" },
    step3: { en: "3. Pick a time", tr: "3. Saat seçin" },
    step4: { en: "4. Your details", tr: "4. Bilgileriniz" },
    yourTime: { en: "shown in your local time · {tz}", tr: "kendi saatinizle · {tz}" },
    atelierTime: { en: "İzmir {time}", tr: "İzmir {time}" },
    night: { en: "early / late for you", tr: "sizin için erken / geç" },
    pickFirst: { en: "Choose a day and a time first.", tr: "Önce bir gün ve saat seçin." },
    phonePh: { en: "+ country code, e.g. +44 7700 900123", tr: "+ ülke kodu, ör. +49 151 2345678" },
    errEmail: { en: "That email doesn't look right.", tr: "E-posta adresi hatalı görünüyor." },
    gownsMsg: { en: "Gowns I love", tr: "Beğendiğim modeller" },
    cityTime: { en: "{city} time", tr: "{city} saati" },
    name: { en: "Name", tr: "Ad soyad" },
    phone: { en: "WhatsApp number", tr: "WhatsApp numarası" },
    email: { en: "Email", tr: "E-posta" },
    wedding: { en: "Wedding date", tr: "Düğün tarihi" },
    gowns: { en: "Gowns you love (optional)", tr: "Beğendiğiniz modeller (isteğe bağlı)" },
    gownsPh: { en: "e.g. Yakamoz, Sedef — or describe your idea", tr: "ör. Yakamoz, Sedef — ya da fikrinizi yazın" },
    via: { en: "Meet via", tr: "Görüşme uygulaması" },
    viaWa: { en: "WhatsApp video", tr: "WhatsApp görüntülü" },
    viaMeet: { en: "Google Meet", tr: "Google Meet" },
    viaZoom: { en: "Zoom", tr: "Zoom" },
    request: { en: "Request this appointment", tr: "Bu randevuyu talep et" },
    confirmNote: { en: "We confirm every appointment personally on WhatsApp, usually within a few hours.", tr: "Her randevuyu WhatsApp'tan bizzat onaylıyoruz, genellikle birkaç saat içinde." },
    errName: { en: "Please tell us your name.", tr: "Lütfen adınızı yazın." },
    errPhone: { en: "We need a number to confirm your appointment.", tr: "Randevuyu onaylamak için bir numara gerekli." },
    errSlot: { en: "Please choose a day and time first.", tr: "Lütfen önce gün ve saat seçin." },
    doneTitle: { en: "One last step: <em>press Send</em>", tr: "Son adım: <em>Gönder'e basın</em>" },
    doneText: { en: "Your request is ready in WhatsApp — it only reaches us once you press Send there. We'll then confirm the time and send you the meeting link.", tr: "Talebiniz WhatsApp'ta hazır — bize ulaşması için orada \"Gönder\"e basmanız yeterli. Ardından saati onaylayıp görüşme linkini size göndereceğiz." },
    doneAgain: { en: "Open WhatsApp again", tr: "WhatsApp'ı tekrar aç" },
    doneNext: { en: "Meanwhile: prepare your measurement card", tr: "Bu arada: ölçü kartınızı hazırlayın" },
    another: { en: "Book another appointment", tr: "Başka randevu al" },
    waHead: { en: "Hello Burak Altaş Atelier! I'd like to book an online appointment:", tr: "Merhaba Burak Altaş Atelier! Online randevu almak istiyorum:" },
    calNote: { en: "Times are shown in your time zone. You'll receive the video link and reminders by email.", tr: "Saatler sizin saat diliminizde gösterilir. Görüntülü görüşme linki ve hatırlatmalar e-postanıza gelir." },
    calBooked: { en: "Booked! Check your email for the video link.", tr: "Randevunuz alındı! Görüntülü görüşme linki e-postanızda." },
    noSlots: { en: "No times left on this day — please choose another.", tr: "Bu günde uygun saat kalmadı — lütfen başka bir gün seçin." },
    staff: { en: "Who would you like to take your measurements?", tr: "Ölçülerinizi kimin almasını istersiniz?" },
    staffAny: { en: "No preference", tr: "Fark etmez" },
    staffF: { en: "A woman", tr: "Kadın" },
    staffM: { en: "A man", tr: "Erkek" },
    staffMsg: { en: "Measurements taken by", tr: "Ölçüyü alacak kişi" },
  };

  /* ---------- Appointment types ---------- */
  const TYPES = [
    { id: "consult", n: "01", name: { en: "Design consultation", tr: "Tasarım görüşmesi" }, price: TX.free,
      desc: { en: "Meet Burak, talk through your day and choose a gown — or design your own. Bring inspiration photos.", tr: "Burak'la tanışın, gününüzü anlatın ve modelinizi seçin — ya da kendinizinkini tasarlayın. İlham fotoğraflarınızı getirin." } },
    { id: "measure", n: "02", name: { en: "Measurement session", tr: "Ölçü görüşmesi" },
      desc: { en: "We guide you and a helper through every measurement live, and check each number together.", tr: "Size ve yardımcınıza tüm ölçülerde canlı eşlik ediyor, her rakamı birlikte kontrol ediyoruz." } },
    { id: "fitting", n: "03", name: { en: "Fitting & approval", tr: "Prova & onay" },
      desc: { en: "See your gown on the atelier mannequin and approve the details before the final hand-finishing.", tr: "Gelinliğinizi atölye mankeninde görün, son el işçiliğinden önce detayları onaylayın." } }
  ];
  let type = TYPES.some((x) => x.id === params.get("type")) ? params.get("type") : "consult";
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const city = () => (userTz.includes("/") ? userTz.split("/").pop().replace(/_/g, " ") : userTz);

  function renderTypes() {
    $("#appt-types").innerHTML = TYPES.map((x) => `
      <label class="appt">
        <input type="radio" name="appt" value="${x.id}" ${x.id === type ? "checked" : ""}>
        <span class="appt__in">
          <span class="appt__top"><span class="appt__n">${x.n}</span><span class="appt__meta">${F(TX.min, { n: A.types[x.id].minutes })}${x.price ? " · " + L(x.price) : ""}</span></span>
          <b class="appt__name">${L(x.name)}</b>
          <span class="appt__desc">${L(x.desc)}</span>
        </span>
      </label>`).join("");
  }
  document.addEventListener("change", (e) => {
    if (e.target.name === "appt") { type = e.target.value; slot = null; renderBooking(); }
  });

  /* ---------- Booking: Cal.com ---------- */
  const calInited = new Set();
  function loadCal() {
    if (window.Cal) return;
    (function (C, Aa, Ll) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = Aa; cal.loaded = true; } if (ar[0] === Ll) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
  }
  function renderCal() {
    loadCal();
    const ns = "ba_" + type, id = "cal-" + type + "-" + Date.now();
    const prof = store.get("ba-enquiry", {});
    const g = gownsPrefill();
    $("#booking").innerHTML = `<div class="cal-inline" id="${id}"></div><p class="small mt-s">${L(TX.calNote)}</p>`;
    if (!calInited.has(ns)) {
      window.Cal("init", ns, { origin: "https://cal.com" });
      window.Cal.ns[ns]("ui", { theme: "light", hideEventTypeDetails: false, layout: "month_view", styles: { branding: { brandColor: "#1b1714" } }, cssVarsPerTheme: { light: { "cal-brand": "#1b1714" } } });
      window.Cal.ns[ns]("on", { action: "bookingSuccessfulV2", callback: () => toast(L(TX.calBooked)) });
      calInited.add(ns);
    }
    window.Cal.ns[ns]("inline", {
      elementOrSelector: "#" + id,
      calLink: `${A.calcomUser}/${A.types[type].cal}`,
      config: { layout: "month_view", theme: "light", ...(prof.name && { name: prof.name }), ...(prof.email && { email: prof.email }), ...(g && { notes: g }) }
    });
  }

  /* ---------- Booking: built-in request flow ---------- */
  let slot = null, day = null;
  const hm = (d, tz) => d.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const dayLabel = (d, tz, opts) => d.toLocaleDateString(loc(), { timeZone: tz, ...opts });
  // Compare per instant, so DST changes (e.g. Europe on 25 Oct) are handled slot by slot
  const stamp = (d, tz) => d.toLocaleString("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const differs = (d) => stamp(d, userTz) !== stamp(d, A.timezone);
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function days() {
    const nowA = new Date(Date.now() + A.utcOffset * 3600e3);
    const out = [];
    for (let i = 1; i <= A.daysAhead; i++) {
      const d = new Date(Date.UTC(nowA.getUTCFullYear(), nowA.getUTCMonth(), nowA.getUTCDate() + i));
      if (A.days.includes(d.getUTCDay())) out.push(d);
    }
    return out;
  }
  function slotsFor(d) {
    const step = A.types[type].minutes > 30 ? 60 : 30;
    const out = [];
    for (let m = A.start * 60; m + A.types[type].minutes <= A.end * 60; m += step) {
      const at = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, m) - A.utcOffset * 3600e3);
      if (at - Date.now() < 12 * 3600e3) continue;
      const localH = +at.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: userTz });
      out.push({ at, night: localH < 7 || localH >= 22 });
    }
    return out;
  }
  function gownsPrefill() {
    const ids = [...new Set([params.get("g"), ...store.get("ba-shortlist", [])].filter((x) => x && byId(x)))];
    return ids.map((id) => byId(id).name).join(", ");
  }
  function pickHtml() {
    const ds = days();
    if (!day || !ds.some((d) => +d === +day)) day = ds[0];
    const sl = slotsFor(day);
    return `
      <h3 class="bk__h" id="bk-days">${L(TX.step2)}</h3>
      <div class="days" role="group" aria-labelledby="bk-days">
        ${ds.map((d) => `<button type="button" class="day" aria-pressed="${+d === +day}" data-day="${+d}" aria-label="${esc(dayLabel(d, "UTC", { weekday: "long", day: "numeric", month: "long" }))}">
          <span aria-hidden="true">${dayLabel(d, "UTC", { weekday: "short" })}</span><b aria-hidden="true">${dayLabel(d, "UTC", { day: "numeric" })}</b><span aria-hidden="true">${dayLabel(d, "UTC", { month: "short" })}</span></button>`).join("")}
      </div>
      <h3 class="bk__h" id="bk-slots">${L(TX.step3)} <small>${F(TX.yourTime, { tz: esc(F(TX.cityTime, { city: city() })) })}</small></h3>
      <div class="slots" role="group" aria-labelledby="bk-slots">
        ${sl.length ? sl.map((s) => `<button type="button" class="slot ${s.night ? "is-night" : ""}" data-slot="${+s.at}" aria-pressed="${!!slot && +slot === +s.at}" ${s.night ? `title="${esc(L(TX.night))}"` : ""}>
          <b>${hm(s.at, userTz)}</b>${differs(s.at) ? `<span>${F(TX.atelierTime, { time: hm(s.at, A.timezone) })}</span>` : ""}</button>`).join("") : `<p class="small">${L(TX.noSlots)}</p>`}
      </div>`;
  }
  function renderPick() {
    const p = $("#bk-pick"); if (p) p.innerHTML = pickHtml();
    const s = $("#bk-sum"); if (s) s.innerHTML = summary();
    const st = $("#bk-staff"); if (st) st.hidden = type !== "measure";
  }
  function renderRequest() {
    // Keep whatever the bride already typed when the language (or anything else) re-renders the form
    const old = $("#bk-form") ? Object.fromEntries(new FormData($("#bk-form"))) : null;
    const prof = store.get("ba-enquiry", {});
    const val = (k, fallback) => esc(old ? old[k] ?? "" : fallback || "");
    $("#booking").innerHTML = `
      <div class="bk">
        <div class="bk__pick" id="bk-pick">${pickHtml()}</div>
        <form class="bk__form" novalidate id="bk-form">
          <h3 class="bk__h">${L(TX.step4)}</h3>
          <div class="bk__sum" id="bk-sum" aria-live="polite">${summary()}</div>
          <label class="field"><span>${L(TX.name)} *</span><input class="input" name="name" autocomplete="name" value="${val("name", prof.name)}" aria-describedby="bk-err-name"><small class="field__err" id="bk-err-name" role="alert"></small></label>
          <label class="field"><span>${L(TX.phone)} *</span><input class="input" name="phone" type="tel" autocomplete="tel" placeholder="${esc(L(TX.phonePh))}" value="${val("phone", prof.phone)}" aria-describedby="bk-err-phone"><small class="field__err" id="bk-err-phone" role="alert"></small></label>
          <label class="field"><span>${L(TX.email)}</span><input class="input" name="email" type="email" autocomplete="email" value="${val("email", prof.email)}" aria-describedby="bk-err-email"><small class="field__err" id="bk-err-email" role="alert"></small></label>
          <label class="field"><span>${L(TX.wedding)}</span><input class="input" name="wedding" type="date" value="${val("wedding", isoDate(prof.date) || isoDate(store.get("ba-wedding", "")))}"></label>
          <label class="field"><span>${L(TX.gowns)}</span><input class="input" name="gowns" placeholder="${esc(L(TX.gownsPh))}" value="${val("gowns", gownsPrefill())}"></label>
          <fieldset class="field" style="border:0;padding:0;margin:0"><legend>${L(TX.via)}</legend>
            <div class="chips mt-s">${["viaWa", "viaMeet", "viaZoom"].map((k) => `<label class="chip"><input type="radio" name="via" value="${k}" ${(old ? old.via : "viaWa") === k ? "checked" : ""}><span>${L(TX[k])}</span></label>`).join("")}</div>
          </fieldset>
          <fieldset class="field" id="bk-staff" style="border:0;padding:0;margin:0" ${type === "measure" ? "" : "hidden"}><legend>${L(TX.staff)}</legend>
            <div class="chips mt-s">${["staffAny", "staffF", "staffM"].map((k) => `<label class="chip"><input type="radio" name="staff" value="${k}" ${((old && old.staff) || "staffAny") === k ? "checked" : ""}><span>${L(TX[k])}</span></label>`).join("")}</div>
          </fieldset>
          <small class="field__err" id="bk-err-slot" role="alert"></small>
          <button class="btn btn--wa btn--block" type="submit">${ICON.wa} ${L(TX.request)}</button>
          <p class="small">${L(TX.confirmNote)}</p>
        </form>
      </div>`;
  }
  function summary() {
    const ty = TYPES.find((x) => x.id === type);
    if (!slot) return `<span class="small">${L(TX.pickFirst)}</span>`;
    return `<b>${L(ty.name)}</b> · ${F(TX.min, { n: A.types[type].minutes })}<br>
      ${slot.toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long", timeZone: userTz })} · <b>${hm(slot, userTz)}</b>
      ${differs(slot) ? `<br><span class="small">${F(TX.atelierTime, { time: hm(slot, A.timezone) })} (GMT+${A.utcOffset})</span>` : ""}`;
  }
  function composeRequest(f) {
    const ty = TYPES.find((x) => x.id === type);
    const lines = [L(TX.waHead),
      `• ${L(ty.name)} (${F(TX.min, { n: A.types[type].minutes })})`,
      `• ${slot.toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: A.timezone })} — ${hm(slot, A.timezone)} (İzmir)` + (differs(slot) ? ` / ${hm(slot, userTz)} (${F(TX.cityTime, { city: city() })})` : ""),
      `• ${L(TX.name)}: ${f.name}`,
      `• ${L(TX.phone)}: ${f.phone}`];
    if (f.email) lines.push(`• ${L(TX.email)}: ${f.email}`);
    if (f.wedding) lines.push(`• ${L(TX.wedding)}: ${fmtDate(new Date(f.wedding + "T00:00:00"))}`);
    if (f.gowns) lines.push(`• ${L(TX.gownsMsg)}: ${f.gowns}`);
    lines.push(`• ${L(TX.via)}: ${L(TX[f.via])}`);
    if (type === "measure" && f.staff && f.staff !== "staffAny") lines.push(`• ${L(TX.staffMsg)}: ${L(TX[f.staff])}`);
    return lines.join("\n");
  }
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-day]");
    if (d) { day = new Date(+d.dataset.day); slot = null; renderPick(); $(`[data-day="${+day}"]`)?.focus(); return; }
    const s = e.target.closest("[data-slot]");
    if (s) {
      slot = new Date(+s.dataset.slot);
      $$("[data-slot]").forEach((b) => b.setAttribute("aria-pressed", String(b === s)));
      $("#bk-sum").innerHTML = summary(); $("#bk-err-slot").textContent = "";
      if (matchMedia("(max-width: 899px)").matches) $("#bk-sum").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (e.target.closest("[data-again]")) { slot = null; renderBooking(); $("#book").scrollIntoView({ block: "start" }); }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "bk-form") return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const el = e.target.elements;
    let first = null;
    const err = (id, msg, input) => {
      $("#" + id).textContent = msg;
      if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg && !first) first = input || $("[data-slot]") || $("[data-day]");
    };
    err("bk-err-slot", slot ? "" : L(TX.errSlot));
    err("bk-err-name", f.name.trim() ? "" : L(TX.errName), el.name);
    err("bk-err-phone", f.phone.replace(/\D/g, "").length >= 7 ? "" : L(TX.errPhone), el.phone);
    err("bk-err-email", !f.email || EMAIL.test(f.email.trim()) ? "" : L(TX.errEmail), el.email);
    if (first) { first.focus(); return; }
    const prof = store.get("ba-enquiry", {});
    store.set("ba-enquiry", { ...prof, name: f.name, phone: f.phone, email: f.email, date: isoDate(f.wedding) });
    if (isoDate(f.wedding)) store.set("ba-wedding", f.wedding);
    const msg = composeRequest(f);
    window.open(wa(msg), "_blank", "noopener");
    $("#booking").innerHTML = `
      <div class="bk-done" tabindex="-1" id="bk-done">
        <p class="display h3">${L(TX.doneTitle)}</p>
        <div class="bk__sum">${summary()}</div>
        <p class="lede">${L(TX.doneText)}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          <a class="btn btn--wa" href="${wa(msg)}" target="_blank" rel="noopener">${ICON.wa} ${L(TX.doneAgain)}</a>
          <a class="btn btn--ghost" href="#measure-card">${L(TX.doneNext)}</a>
        </div>
        <button type="button" class="link" data-again>${L(TX.another)}</button>
      </div>`;
    $("#bk-done").scrollIntoView({ block: "center" });
    $("#bk-done").focus({ preventScroll: true });
  });
  function renderBooking() { A.calcomUser ? renderCal() : $("#bk-form") ? renderPick() : renderRequest(); }

  /* ---------- Preparation checklist ---------- */
  const PREP = [
    { en: "A soft tape measure in centimetres (or inches)", tr: "Santimetreli (ya da inçli) bir terzi mezurası" },
    { en: "A friend or family member to hold the tape", tr: "Mezurayı tutacak bir arkadaş ya da aile üyesi" },
    { en: "A thin ribbon or elastic to tie round your waist", tr: "Belinize bağlamak için ince bir kurdele ya da lastik" },
    { en: "The bra or shapewear you'll wear on the day", tr: "Düğünde giyeceğiniz sütyen ya da korse" },
    { en: "Your wedding shoes — or a heel of the same height", tr: "Düğün ayakkabınız — ya da aynı topuk yüksekliğinde bir ayakkabı" },
    { en: "At most one thin, fitted layer over the bra (e.g. leggings and a fitted top) — enough for modest brides, still accurate", tr: "Sütyenin üzerine en fazla tek kat ince ve vücuda oturan kıyafet (ör. tayt ve dar bir üst) — kapalı gelinler için de yeterli, ölçü yine doğru çıkar" },
    { en: "Hair tied up so we can see neck and shoulders", tr: "Boyun ve omuzlar görünsün diye toplanmış saç" },
    { en: "Phone on a stand at waist height, about 2 m away", tr: "Bel hizasında, yaklaşık 2 m uzakta sabitlenmiş telefon" },
    { en: "Bright light in front of you, a plain wall behind", tr: "Önünüzde aydınlık bir ışık, arkanızda düz bir duvar" },
    { en: "This measurement card open — or printed", tr: "Bu ölçü kartı açık — ya da yazdırılmış" }
  ];
  function renderPrep() {
    const done = store.get("ba-prep", []);
    $("#checklist").innerHTML = PREP.map((p, i) => `<li><label class="check"><input type="checkbox" data-prep="${i}" ${done.includes(i) ? "checked" : ""}> <span>${L(p)}</span></label></li>`).join("");
  }
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-prep]");
    if (!c) return;
    const done = new Set(store.get("ba-prep", []));
    c.checked ? done.add(+c.dataset.prep) : done.delete(+c.dataset.prep);
    store.set("ba-prep", [...done]);
  });

  /* ---------- Measurement card ---------- */
  // Reviewed with a bridal pattern-maker and a QA pass: a ribbon marks the waist first, rows follow
  // the order a helper measures in (front → sides & arms → back → legs → in shoes), rows appear only
  // when the chosen silhouette / sleeves need them, and plausibility checks warn — they never block.
  const MX = {
    title: { en: "Measurement card", tr: "Ölçü kartı" },
    unit: { en: "Unit", tr: "Birim" },
    inch: { en: "inch", tr: "inç" },
    done: { en: "{n} / {t} measured", tr: "{n} / {t} ölçü alındı" },
    progLabel: { en: "Measurements taken", tr: "Alınan ölçüler" },
    saved: { en: "Saved on this device · {time}", tr: "Bu cihaza kaydedildi · {time}" },
    notSaved: { en: "Not saved — this browser doesn't allow it (private window?). Send or print before closing.", tr: "Kaydedilemedi — tarayıcı izin vermiyor (gizli sekme?). Kapatmadan önce gönderin ya da yazdırın." },
    sendWa: { en: "Send on WhatsApp", tr: "WhatsApp'tan gönder" },
    sendMail: { en: "Send by email", tr: "E-postayla gönder" },
    copy: { en: "Copy as text", tr: "Metni kopyala" },
    copied: { en: "Copied — paste it into a message or email.", tr: "Kopyalandı — bir mesaja ya da e-postaya yapıştırın." },
    mailLong: { en: "The card is copied — please paste it into the email.", tr: "Kart kopyalandı — lütfen e-postaya yapıştırın." },
    mailPaste: { en: "(My measurement card is copied — pasting it below.)", tr: "(Ölçü kartım kopyalandı — aşağıya yapıştırıyorum.)" },
    print: { en: "Print / PDF", tr: "Yazdır / PDF" },
    blank: { en: "Blank template", tr: "Boş şablon" },
    clear: { en: "Clear the card", tr: "Kartı temizle" },
    clearAsk: { en: "Clear everything on this card (measurements, name and notes) on this device?", tr: "Bu cihazdaki kartın tamamı (ölçüler, ad ve notlar) silinsin mi?" },
    cleared: { en: "Card cleared.", tr: "Kart temizlendi." },
    undo: { en: "Undo", tr: "Geri al" },
    sentNote: { en: "Your card is ready in WhatsApp — it reaches us only once you press Send there.", tr: "Kartınız WhatsApp'ta hazır — bize ulaşması için orada Gönder'e basın." },
    again: { en: "Open again", tr: "Tekrar aç" },
    figHint: { en: "Select a measurement to see it on the figure", tr: "Figürde görmek için bir ölçü seçin" },
    figLabel: { en: "Body diagram with numbered measurement lines", tr: "Numaralı ölçü çizgileriyle vücut şeması" },
    fromBack: { en: "measured from the back", tr: "arkadan ölçülür" },
    igNote: { en: "You opened this inside Instagram. Your card is saved only in Instagram's browser, and printing may not work there. To keep it, tap ⋯ (top right) › “Open in browser”.", tr: "Bu sayfayı Instagram'ın içinden açtınız. Kartınız yalnızca Instagram'ın tarayıcısında kalır, yazdırma da çalışmayabilir. Kalıcı olsun diye sağ üstteki ⋯ › “Tarayıcıda aç”a dokunun." },
    // before you start
    rulesTitle: { en: "Before you start — read once", tr: "Başlamadan önce — bir kez okuyun" },
    rules: [
      { en: "<b>Tie a thin ribbon or elastic snugly round your natural waist</b> (bend sideways — it settles in the crease) and leave it on. Every length that ends “at the waist” ends at this ribbon.", tr: "<b>Doğal belinize ince bir kurdele ya da lastik bağlayın</b> (yana eğildiğinizde oluşan kıvrıma oturur) ve ölçü bitene kadar çıkarmayın. “Bele kadar” denen tüm boy ölçüleri bu kurdelede biter." },
      { en: "Wear the bra or shapewear you'll wear on the day, with at most one thin fitted layer on top.", tr: "Düğünde giyeceğiniz sütyen ya da korseyi giyin; üzerine en fazla tek kat ince ve vücuda oturan bir kıyafet." },
      { en: "Stand naturally: feet hip-width apart, arms relaxed, looking ahead. Don't hold your breath or pull your tummy in.", tr: "Doğal durun: ayaklar kalça genişliğinde, kollar serbest, bakışınız karşıda. Nefesinizi tutmayın, karnınızı içe çekmeyin." },
      { en: "Keep the tape flat and level — snug against the body, not digging in. Measure the body itself; don't add extra room.", tr: "Mezura düz ve yere paralel olsun; vücuda otursun ama tene batmasın. Vücudun kendisini ölçün, fazladan pay eklemeyin." },
      { en: "Your helper places and reads the tape while you stay still. Take every measurement twice; if the two differ by more than 1 cm, measure a third time.", tr: "Mezurayı yardımcınız yerleştirip okusun, siz kıpırdamadan durun. Her ölçüyü iki kez alın; iki sonuç arasında 1 cm'den fazla fark varsa bir kez daha ölçün." },
      { en: "When you send the card, add three photos in fitted clothes — front, side and back, arms slightly away from the body.", tr: "Kartı gönderirken vücuda oturan kıyafetle önden, yandan ve arkadan çekilmiş üç fotoğraf ekleyin; kollar gövdeden hafifçe ayrık." },
      { en: "If your weight changes by more than about 2 kg, or your bust or waist by more than 2 cm before the wedding, please re-measure and let us know.", tr: "Düğüne kadar kilonuz yaklaşık 2 kg'dan, göğüs ya da bel ölçünüz 2 cm'den fazla değişirse lütfen yeniden ölçüp bize bildirin." }
    ],
    // about you / your gown
    about: { en: "About you", tr: "Hakkınızda" },
    gownSec: { en: "Your gown — shows only the measurements it needs", tr: "Gelinliğiniz — yalnızca gereken ölçüler görünür" },
    name: { en: "Name", tr: "Ad soyad" },
    wedding: { en: "Wedding date", tr: "Düğün tarihi" },
    by: { en: "Who is measuring?", tr: "Ölçüyü kim alıyor?" },
    sil: { en: "Silhouette", tr: "Siluet" },
    slv: { en: "Sleeves", tr: "Kollar" },
    neck: { en: "Neckline", tr: "Yaka" },
    gloves: { en: "I'd like gloves", tr: "Eldiven istiyorum" },
    noshoes: { en: "Shoes not chosen yet — I'm measuring lengths barefoot", tr: "Ayakkabı henüz seçilmedi — boy ölçülerini çıplak ayakla alıyorum" },
    under: { en: "Under the gown I'll wear", tr: "Gelinliğin altına giyeceğim" },
    bra: { en: "Bra size (e.g. EU 75B / UK 34B)", tr: "Sütyen bedeni (ör. 75B)" },
    size: { en: "Usual dress size", tr: "Normalde giydiğiniz beden" },
    sizeShort: { en: "Dress size", tr: "Beden" },
    notes: { en: "Notes for the atelier", tr: "Atölyeye notlar" },
    notesPh: { en: "Posture, one shoulder higher, a measurement you're unsure of, pregnancy — anything we should know…", tr: "Duruş, bir omuz daha yüksek, emin olmadığınız bir ölçü, hamilelik — bilmemiz gereken her şey…" },
    choose: { en: "— choose —", tr: "— seçin —" },
    shoesBare: { en: "Measure these barefoot — the heel height you write below is taken into account.", tr: "Bunları çıplak ayakla ölçün — aşağıya yazdığınız topuk yüksekliği hesaba katılır." },
    onlyIf: { en: "only {c}", tr: "yalnızca {c}" },
    // validation
    notNum: { en: "Numbers only, e.g. 86 or 86.5", tr: "Yalnızca rakam yazın, ör. 86 ya da 86,5" },
    odd: { en: "Outside the usual range — please measure once more. If it's right, keep it and add a note.", tr: "Alışılmışın dışında bir değer — lütfen bir kez daha ölçün. Doğruysa öyle bırakın ve not ekleyin." },
    looksIn: { en: "Looks like inches ({v} in = {cm} cm).", tr: "İnç yazmış olabilirsiniz ({v} inç = {cm} cm)." },
    looksCm: { en: "Looks like centimetres ({v} cm).", tr: "Santimetre yazmış olabilirsiniz ({v} cm)." },
    looksMm: { en: "Millimetres? That would be {cm} cm.", tr: "Milimetre mi? {cm} cm olur." },
    useIt: { en: "Use {x}", tr: "{x} yap" },
    half: { en: "Did the tape go all the way round? This looks like half a circumference.", tr: "Mezura vücudun etrafında tam tur döndü mü? Bu değer yarım tur gibi görünüyor." },
    // cross-checks
    xSwapUB: { en: "Your under-bust is larger than your bust — could the two be swapped?", tr: "Göğüs altı ölçünüz göğüs ölçünüzden büyük görünüyor — iki değer yer değiştirmiş olabilir mi?" },
    xUB: { en: "Bust and under-bust are unusually close or far apart — please check both.", tr: "Göğüs ile göğüs altı arasındaki fark alışılmadık — lütfen ikisini de kontrol edin." },
    xWaistHip: { en: "Waist and hip look unusual together — please check both are full circles at the right height.", tr: "Bel ve basen birlikte alışılmadık görünüyor — ikisinin de doğru yükseklikte tam tur alındığını kontrol edin." },
    xHighHip: { en: "High hip usually lies between waist and hip — please check.", tr: "Üst basen genellikle bel ile basen arasında olur — lütfen kontrol edin." },
    xOrder: { en: "This should be longer than the measurement before it — both start at the same shoulder point.", tr: "Bu ölçü bir öncekinden uzun olmalı — ikisi de aynı omuz noktasından başlar." },
    xHwaist: { en: "Compare with “Shoulder to waist”: hollow to waist is usually a few cm shorter.", tr: "“Omuz – bel” ile karşılaştırın: boyun çukuru – bel genellikle birkaç cm daha kısadır." },
    xHollowSum: { en: "Hollow to floor should be about hollow to waist + waist to floor ({sum} cm). Please re-check these three.", tr: "Boyun çukuru – yer, yaklaşık boyun çukuru – bel ile bel – yer toplamı ({sum} cm) olmalı. Lütfen bu üçünü tekrar kontrol edin." },
    xHollowHeight: { en: "This doesn't quite match your height and heel — please re-measure standing straight in the shoes.", tr: "Bu değer boyunuz ve topuk yüksekliğinizle tam uyuşmuyor — lütfen ayakkabıyla dik durarak yeniden ölçün." },
    xKneeFloor: { en: "Waist to knee and waist to floor don't fit together — please check both.", tr: "Bel – diz ile bel – yer birbirini tutmuyor — lütfen ikisini de kontrol edin." },
    xApex: { en: "Unusual compared with your bust — measure straight across between the two bust points.", tr: "Göğüs ölçünüze göre alışılmadık — iki göğüs ucu arasını düz çizgiyle ölçün." },
    xArmhole: { en: "The armhole is usually at least 4 cm bigger than the upper arm — please check both.", tr: "Kol oyuntusu genellikle kol çevresinden en az 4 cm büyüktür — lütfen ikisini de kontrol edin." },
    xArmOrder: { en: "Arm measurements usually get smaller from upper arm to elbow to wrist — please check.", tr: "Kol ölçüleri genellikle üst koldan dirseğe ve bileğe doğru küçülür — lütfen kontrol edin." },
    xBack: { en: "Back width is usually narrower than shoulder width — please check both.", tr: "Sırt genişliği genellikle omuz genişliğinden dardır — lütfen ikisini de kontrol edin." },
    xKnee: { en: "The knee is usually smaller than the thigh — please check both.", tr: "Diz çevresi genellikle uyluktan küçüktür — lütfen ikisini de kontrol edin." },
    xSide: { en: "Underarm to waist looks long compared with shoulder to waist — hold the ruler right under the arm.", tr: "Koltuk altı – bel, omuz – bele göre uzun görünüyor — cetveli tam koltuk altına tutun." },
    // sending
    fixFirst: { en: "Please correct the highlighted field first.", tr: "Lütfen önce işaretli alanı düzeltin." },
    empty: { en: "Please fill in at least one measurement first.", tr: "Lütfen önce en az bir ölçü girin." },
    askMissing: { en: "{n} of {t} measurements are still empty.", tr: "{t} ölçüden {n} tanesi henüz boş." },
    askOdd: { en: "Some values look unusual (they'll be marked ⚠).", tr: "Bazı değerler alışılmışın dışında (⚠ ile işaretlenecek)." },
    askSend: { en: "Send anyway?", tr: "Yine de gönderilsin mi?" },
    msgHead: { en: "Hello! Here is my measurement card:", tr: "Merhaba! Ölçü kartım:" },
    msgBy: { en: "Measured by", tr: "Ölçüyü alan" },
    msgOn: { en: "Measured on", tr: "Ölçüm tarihi" },
    msgGown: { en: "Gown", tr: "Gelinlik" },
    msgBare: { en: "Shoes not chosen yet — lengths measured barefoot", tr: "Ayakkabı henüz seçilmedi — boy ölçüleri çıplak ayakla alındı" },
    msgUnit: { en: "All values in cm", tr: "Tüm değerler cm" },
    msgMissing: { en: "Not measured yet", tr: "Henüz ölçülmedi" },
    msgOdd: { en: "⚠ = unusual value, I've double-checked it", tr: "⚠ = alışılmadık değer, tekrar kontrol ettim" },
    printDate: { en: "Date", tr: "Tarih" },
    first: { en: "1st", tr: "1." },
    second: { en: "2nd", tr: "2." },
    group: {
      start: { en: "First, your height", tr: "Önce boyunuz" },
      circ: { en: "Circumferences", tr: "Çevre ölçüleri" },
      front: { en: "Front bodice", tr: "Ön beden" },
      arms: { en: "Sides & arms", tr: "Yanlar & kollar" },
      back: { en: "Back — turn around", tr: "Arka — arkanızı dönün" },
      legs: { en: "Legs & skirt", tr: "Bacak & etek" },
      shoes: { en: "In your wedding shoes", tr: "Düğün ayakkabılarınızla" }
    }
  };
  const OPT = {
    by: [["", MX.choose], ["self", { en: "Myself", tr: "Kendim" }], ["helper", { en: "A helper (friend / family)", tr: "Yardımcım (arkadaş / aile)" }], ["atelier", { en: "On video with the atelier", tr: "Atölyeyle görüntülü görüşmede" }]],
    sil: [["unsure", { en: "Not sure yet", tr: "Henüz bilmiyorum" }], ["ballgown", { en: "Ball gown", tr: "Prenses" }], ["aline", { en: "A-line", tr: "A kesim" }], ["mermaid", { en: "Mermaid", tr: "Balık" }], ["column", { en: "Column", tr: "Düz kesim" }], ["mini", { en: "Short dress", tr: "Kısa elbise" }]],
    slv: [["unsure", { en: "Not sure yet", tr: "Henüz bilmiyorum" }], ["none", { en: "Strapless", tr: "Straplez (askısız)" }], ["straps", { en: "Straps", tr: "Askılı" }], ["short", { en: "Short sleeves", tr: "Kısa kol" }], ["three", { en: "¾ sleeves", tr: "¾ kol" }], ["long", { en: "Long sleeves", tr: "Uzun kol" }]],
    neck: [["unsure", { en: "Not sure yet", tr: "Henüz bilmiyorum" }], ["open", { en: "Open (sweetheart, V, off-shoulder…)", tr: "Açık (kalp, V, düşük omuz…)" }], ["high", { en: "High neck / choker", tr: "Dik yaka / gerdanlık" }]],
    under: [["", MX.choose], ["built", { en: "The gown's built-in support", tr: "Gelinliğin kendi desteği / korsesi" }], ["strapless", { en: "A strapless bra", tr: "Straplez sütyen" }], ["bra", { en: "My own bra", tr: "Kendi sütyenim" }], ["shape", { en: "Shapewear / corset", tr: "Korse / toparlayıcı" }], ["unsure", { en: "Not sure yet", tr: "Henüz bilmiyorum" }]]
  };
  const optLabel = (k, v) => { const o = OPT[k].find((x) => x[0] === v); return o && v && v !== "unsure" ? L(o[1]) : ""; };
  // When a row is needed — "not sure yet" keeps every row that might be needed
  const in_ = (v, list) => list.includes(v);
  const WHEN = {
    neck: { t: (o) => o.neck !== "open", c: { en: "for a high neckline or choker", tr: "dik yaka ya da gerdanlıkta" } },
    sleeves: { t: (o) => in_(o.slv, ["unsure", "short", "three", "long"]), c: { en: "with sleeves", tr: "kollu modelde" } },
    straps: { t: (o) => o.slv !== "none", c: { en: "with straps or sleeves", tr: "askılı ya da kollu modelde" } },
    elbow: { t: (o) => in_(o.slv, ["unsure", "three", "long"]), c: { en: "for ¾ or long sleeves", tr: "¾ ya da uzun kolda" } },
    long: { t: (o) => in_(o.slv, ["unsure", "long"]), c: { en: "for long sleeves", tr: "uzun kolda" } },
    wrist: { t: (o) => in_(o.slv, ["unsure", "long"]) || o.gloves, c: { en: "for long sleeves or gloves", tr: "uzun kol ya da eldivende" } },
    legs: { t: (o) => in_(o.sil, ["unsure", "mermaid", "column", "mini"]), c: { en: "for mermaid, column or short", tr: "balık, düz kesim ya da kısa elbisede" } },
    mermaid: { t: (o) => in_(o.sil, ["unsure", "mermaid"]), c: { en: "for mermaid", tr: "balık modelde" } },
    mini: { t: (o) => o.sil === "mini", c: { en: "for a short dress", tr: "kısa elbisede" } }
  };

  const E = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  const P = (d) => `<path d="${d}"/>`;
  // ids of the first 24 rows are unchanged, so cards saved before this version still load
  const MEASURES = [
    { id: "height", g: "start", min: 140, max: 200, fig: P("M192 16v424"), lx: 195, ly: 110,
      name: { en: "Height (barefoot)", tr: "Boy (çıplak ayak)" },
      how: { en: "Barefoot, back and heels against a wall, looking ahead. Your helper rests a book flat on your head, marks the wall and measures from the floor to the mark.", tr: "Çıplak ayakla, sırtınız ve topuklarınız duvarda, karşıya bakın. Yardımcınız başınıza düz bir kitap koyup duvara işaret koysun ve yerden işarete kadar ölçsün." },
      tip: { en: "Measure even if you know it — the height on an ID is often a few cm off.", tr: "Bilseniz de ölçün — kimlikteki boy çoğu zaman birkaç cm farklıdır." } },
    { id: "bust", g: "circ", min: 70, max: 180, fig: E(100, 140, 37, 5), lx: 18, ly: 143,
      name: { en: "Bust", tr: "Göğüs" },
      how: { en: "Round the fullest part of the bust, usually across the bust points. Keep the tape level all the way round — it mustn't ride up at the back. Arms down. Snug, without flattening.", tr: "Göğsün en dolgun yerinden, genellikle göğüs uçlarının üzerinden tam bir tur alın. Mezura sırtta yukarı kaymasın, her yerde yere paralel olsun. Kollar aşağıda. Oturtun ama göğsü bastırmayın." },
      tip: { en: "Wear the bra you'll wear on the day — it changes this number.", tr: "Düğünde giyeceğiniz sütyenle ölçün — bu rakamı değiştirir." } },
    { id: "underbust", g: "circ", min: 60, max: 160, fig: E(100, 156, 31, 4), lx: 24, ly: 160,
      name: { en: "Under-bust", tr: "Göğüs altı" },
      how: { en: "Directly under the bust where the bra band sits. Tape level and firm on the ribcage, no finger room. Read at the end of a normal breath out.", tr: "Göğsün hemen altından, sütyen bandının oturduğu yerden. Mezura yere paralel, kaburgaya tam otursun, parmak payı bırakmayın. Normal bir nefes verişin sonunda okuyun." } },
    { id: "waist", g: "circ", min: 50, max: 165, fig: E(100, 182, 22, 4), lx: 36, ly: 185,
      name: { en: "Waist", tr: "Bel" },
      how: { en: "Over the waist ribbon, level, snug but not pulling. Don't pull your tummy in; read after a normal breath out.", tr: "Bel kurdelesinin üzerinden, yere paralel; oturtun ama sıkmayın. Karnınızı içe çekmeyin, normal bir nefes verdikten sonra okuyun." },
      tip: { en: "Measure where the ribbon is — not where your jeans sit.", tr: "Kurdelenin olduğu yeri ölçün — pantolonun oturduğu yeri değil." } },
    { id: "highhip", g: "circ", min: 60, max: 180, fig: E(100, 206, 30, 5), lx: 26, ly: 209,
      name: { en: "High hip", tr: "Üst basen" },
      how: { en: "About 10 cm below the waist ribbon, across the top of the hip bones; tape level.", tr: "Bel kurdelesinin yaklaşık 10 cm altından, kalça kemiklerinin üzerinden; mezura yere paralel." } },
    { id: "hip", g: "circ", min: 70, max: 190, fig: E(100, 232, 38, 6), lx: 18, ly: 236,
      name: { en: "Hip", tr: "Basen" },
      how: { en: "Feet together. Slide the tape up and down while watching in a side mirror to find the fullest part of the seat; keep it level and leave it there.", tr: "Ayaklar bitişik. Yandan aynaya bakarak mezurayı aşağı yukarı kaydırın, basenin en dolgun yerini bulun; yere paralel tutun ve orada bırakın." } },
    { id: "waisthip", g: "circ", min: 14, max: 30, fig: P("M126 182v50"), lx: 129, ly: 214,
      name: { en: "Waist to hip depth", tr: "Bel – basen arası" },
      how: { en: "With the tape still round your hips, measure straight down your side from the waist ribbon to the hip tape.", tr: "Mezura basende dururken, yan taraftan bel kurdelesinden basen mezurasına kadar dik olarak ölçün." },
      tip: { en: "Tells us where your hip measurement was taken — key for mermaid and column gowns.", tr: "Basen ölçüsünün nereden alındığını gösterir — balık ve düz kesim için çok önemli." } },
    { id: "neck", g: "circ", min: 28, max: 50, when: "neck", fig: E(100, 72, 8, 2.5), lx: 111, ly: 64,
      name: { en: "Neck", tr: "Boyun çevresi" },
      how: { en: "Round the base of the neck where a necklace would sit, with one finger under the tape.", tr: "Kolyenin oturduğu yerden, boyun dibinden; mezuranın altında bir parmak boşluk bırakın." },
      tip: { en: "Needed for high necklines and chokers.", tr: "Dik yaka ve gerdanlık modeller için gerekli." } },
    { id: "shbp", g: "front", min: 20, max: 36, fig: P("M93 74L88 140"), lx: 74, ly: 116,
      name: { en: "Shoulder to bust point", tr: "Omuz – göğüs ucu" },
      how: { en: "Start at the high shoulder point, where the shoulder meets the neck (a T-shirt's shoulder seam starts here). Measure straight down to the bust point.", tr: "Omzun boyunla birleştiği en yüksek noktadan başlayın (tişörtün omuz dikişinin başladığı yer). Düz aşağı, göğüs ucuna kadar ölçün." } },
    { id: "apex", g: "front", min: 13, max: 27, fig: P("M87 140h26"), lx: 95, ly: 136,
      name: { en: "Bust point to bust point", tr: "Göğüs ucu arası" },
      how: { en: "Straight across from one bust point to the other, wearing the bra for the day.", tr: "Düğün sütyeniniz üzerindeyken, bir göğüs ucundan diğerine düz çizgiyle." } },
    { id: "shub", g: "front", min: 26, max: 48, fig: P("M94 74L89 156"), lx: 78, ly: 166,
      name: { en: "Shoulder to under-bust", tr: "Omuz – göğüs altı" },
      how: { en: "From the same high shoulder point, over the bust point, down to the under-bust line.", tr: "Aynı omuz noktasından, göğüs ucunun üzerinden göğüs altı çizgisine." } },
    { id: "shwaist", g: "front", min: 35, max: 58, fig: P("M95 74L91 182"), lx: 82, ly: 196,
      name: { en: "Shoulder to waist (front)", tr: "Omuz – bel (ön)" },
      how: { en: "From the same high shoulder point, over the bust point, down to the waist ribbon.", tr: "Aynı omuz noktasından, göğüs ucunun üzerinden bel kurdelesine." } },
    { id: "hwaist", g: "front", min: 28, max: 48, fig: P("M100 77v105"), lx: 103, ly: 118,
      name: { en: "Hollow to waist", tr: "Boyun çukuru – bel" },
      how: { en: "From the hollow between the collarbones, straight down the centre front to the waist ribbon.", tr: "Köprücük kemiklerinin arasındaki çukurdan, ön ortadan düz aşağı bel kurdelesine kadar." } },
    { id: "front", g: "front", min: 26, max: 45, when: "straps", fig: P("M68 112h64"), lx: 134, ly: 112,
      name: { en: "Front chest width", tr: "Ön göğüs genişliği" },
      how: { en: "About 5 cm below the collarbone, across the chest from one armpit crease (where the arm meets the body) to the other, arms relaxed.", tr: "Köprücük kemiğinin yaklaşık 5 cm altından, kolun gövdeyle birleştiği çizgiden (koltuk altı kıvrımı) diğerine; kollar serbest." } },
    { id: "side", g: "arms", min: 15, max: 28, fig: P("M134 133L122 182"), lx: 134, ly: 162,
      name: { en: "Underarm to waist", tr: "Koltuk altı – bel" },
      how: { en: "Hold a ruler flat under the armpit without pushing up. Measure from its top edge straight down the side to the waist ribbon.", tr: "Koltuk altına bir cetveli yukarı bastırmadan düz tutun. Üst kenarından yan taraftan düz aşağı bel kurdelesine kadar ölçün." },
      tip: { en: "Sets the top edge of a strapless or corset bodice.", tr: "Straplez ve korseli bedenin üst kenarını belirler." } },
    { id: "armhole", g: "arms", min: 32, max: 60, when: "sleeves", fig: E(64, 111, 5, 21), lx: 46, ly: 100,
      name: { en: "Armhole", tr: "Kol oyuntusu" },
      how: { en: "Arm relaxed at the side. Start on the shoulder-bone tip, take the tape down the front, snugly under the armpit and up the back to the start.", tr: "Kol yanda serbest. Omuz kemiğinin ucundan başlayın; mezurayı önden aşağı, koltuk altından oturtarak geçirip arkadan başlangıç noktasına getirin." } },
    { id: "upperarm", g: "arms", min: 20, max: 55, when: "sleeves", fig: E(59, 140, 6.5, 2.2), lx: 38, ly: 133,
      name: { en: "Upper arm", tr: "Kol çevresi" },
      how: { en: "Round the fullest part of the upper arm, arm hanging relaxed. Snug, not tight.", tr: "Üst kolun en dolgun yerinden, kol serbestçe aşağıdayken. Oturtun, sıkmayın." } },
    { id: "shelbow", g: "arms", min: 28, max: 42, when: "sleeves", fig: P("M61 90L55 180"), lx: 40, ly: 163,
      name: { en: "Shoulder to elbow", tr: "Omuz – dirsek" },
      how: { en: "From the shoulder-bone tip to the point of the elbow, arm slightly bent.", tr: "Omuz kemiğinin ucundan dirsek ucuna, kol hafif bükülü." } },
    { id: "elbow", g: "arms", min: 18, max: 42, when: "elbow", fig: E(55, 182, 6.5, 2.2), lx: 34, ly: 190,
      name: { en: "Elbow", tr: "Dirsek çevresi" },
      how: { en: "Round the elbow with the arm bent, so the sleeve can still move.", tr: "Kol bükülüyken dirsek çevresinden; böylece kol rahat hareket eder." } },
    { id: "arm", g: "arms", min: 50, max: 70, when: "long", fig: P("M60 90L55 182L50 250"), lx: 28, ly: 224,
      name: { en: "Arm length", tr: "Kol boyu" },
      how: { en: "From the shoulder-bone tip, over the slightly bent elbow, down to the wrist bone.", tr: "Omuz kemiğinin ucundan, hafif bükülü dirseğin üzerinden bilek kemiğine." } },
    { id: "wrist", g: "arms", min: 13, max: 24, when: "wrist", fig: E(50, 250, 5.5, 2), lx: 30, ly: 256,
      name: { en: "Wrist", tr: "Bilek" },
      how: { en: "Round the wrist, just over the wrist bone.", tr: "Bilek kemiğinin hemen üzerinden." },
      tip: { en: "For long sleeves and gloves.", tr: "Uzun kol ve eldiven için." } },
    { id: "shoulder", g: "back", back: true, min: 32, max: 50, fig: P("M60 87h80"), lx: 142, ly: 86,
      name: { en: "Shoulder width", tr: "Omuz genişliği" },
      how: { en: "Across the back from one shoulder-bone tip to the other, following the curve of the upper back. Lift the arm slightly to feel the bony tip.", tr: "Sırttan, bir omuz kemiğinin ucundan diğerine, sırtın üst kavisini izleyerek. Kolunuzu hafifçe kaldırınca kemik ucunu hissedersiniz." } },
    { id: "back", g: "back", back: true, min: 28, max: 48, when: "straps", fig: P("M68 124h64"), lx: 134, ly: 128,
      name: { en: "Back width", tr: "Sırt genişliği" },
      how: { en: "Arms hanging relaxed. About 10 cm below the neck bone, across the shoulder blades from where one arm meets the body to the same point on the other side.", tr: "Kollar serbestçe aşağıda. Ense kemiğinin yaklaşık 10 cm altından, kürek kemiklerinin üzerinden, kolun gövdeye birleştiği çizgiden diğerine." } },
    { id: "backlen", g: "back", back: true, min: 33, max: 50, fig: P("M105 64v118"), lx: 108, ly: 150,
      name: { en: "Back length", tr: "Sırt boyu" },
      how: { en: "Tilt your head forward to find the bone that stands out at the base of the neck, then look ahead again. Measure from that bone down the spine to the waist ribbon.", tr: "Başınızı öne eğip boyun dibinde belirginleşen kemiği bulun, sonra yeniden karşıya bakın. Bu kemikten omurga boyunca bel kurdelesine kadar ölçün." } },
    { id: "thigh", g: "legs", min: 40, max: 85, when: "legs", fig: E(82, 272, 18, 4), lx: 44, ly: 276,
      name: { en: "Thigh", tr: "Uyluk çevresi" },
      how: { en: "Round the fullest part of the thigh, just below the seat, feet slightly apart.", tr: "Uyluğun en dolgun yerinden, kalça kıvrımının hemen altından; ayaklar hafif aralık." } },
    { id: "kneegirth", g: "legs", min: 28, max: 55, when: "mermaid", fig: E(85, 345, 12, 3), lx: 54, ly: 349,
      name: { en: "Knee", tr: "Diz çevresi" },
      how: { en: "Round the knee, standing straight.", tr: "Dik dururken diz çevresinden." } },
    { id: "knee", g: "legs", min: 50, max: 68, when: "legs", fig: P("M146 182v163"), lx: 149, ly: 268,
      name: { en: "Waist to knee", tr: "Bel – diz" },
      how: { en: "From the waist ribbon at the side, straight down to the middle of the knee.", tr: "Yanda bel kurdelesinden düz aşağı, dizin ortasına kadar." },
      tip: { en: "Sets where a mermaid skirt flares out.", tr: "Balık eteğin nereden açılacağını belirler." } },
    { id: "shorthem", g: "legs", min: 35, max: 75, when: "mini", fig: P("M156 182v118"), lx: 159, ly: 296,
      name: { en: "Waist to desired hem", tr: "Bel – istenen etek boyu" },
      how: { en: "From the waist ribbon straight down to where you'd like the hem of your short dress to end.", tr: "Bel kurdelesinden düz aşağı, kısa elbisenizin bitmesini istediğiniz yere kadar." } },
    { id: "floor", g: "shoes", min: 90, max: 130, fig: P("M166 182v258"), lx: 169, ly: 330,
      name: { en: "Waist to floor", tr: "Bel – yer" },
      how: { en: "In your wedding shoes, on a hard floor (not carpet). From the waist ribbon at centre front straight down until the tape just touches the floor.", tr: "Düğün ayakkabılarınızla, halı olmayan sert bir zeminde. Ön ortada bel kurdelesinden düz aşağı, mezura yere yeni değene kadar." } },
    { id: "hollow", g: "shoes", min: 120, max: 175, fig: P("M178 74v366"), lx: 181, ly: 236,
      name: { en: "Hollow to floor", tr: "Boyun çukuru – yer" },
      how: { en: "In your wedding shoes on a hard floor. Hold the tape's end in the hollow between your collarbones and let it fall straight down; your helper kneels and reads where it touches the floor. Stand tall and don't look down.", tr: "Düğün ayakkabılarınızla, sert bir zeminde. Mezuranın ucunu köprücük kemiklerinizin arasındaki çukura tutup düz aşağı sarkıtın; yardımcınız diz çöküp yere değdiği yeri okusun. Dik durun, aşağı bakmayın." },
      tip: { en: "The most important length for a gown.", tr: "Gelinlik için en önemli boy ölçüsü." } },
    { id: "heel", g: "shoes", min: 0, max: 15, fig: P("M202 426v14M198 426h8M198 440h8"), lx: 197, ly: 420,
      name: { en: "Heel height", tr: "Topuk yüksekliği" },
      how: { en: "Stand the shoe on a table. Measure at the back, from the table straight up to where your heel rests. For a platform, subtract the platform height at the front.", tr: "Ayakkabıyı masaya koyun. Arkadan, masadan topuğunuzun oturduğu yere kadar dik ölçün. Platformlu ayakkabıda öndeki platform yüksekliğini çıkarın." },
      tip: { en: "Shoes not chosen yet? Tick the box above and write the heel height you're planning.", tr: "Ayakkabınız henüz yok mu? Yukarıdaki kutuyu işaretleyin ve düşündüğünüz topuk yüksekliğini yazın." } }
  ];
  const byM = Object.fromEntries(MEASURES.map((m) => [m.id, m]));
  const GKEYS = Object.keys(MX.group);
  const num = (i) => String(i + 1).padStart(2, "0");
  const BODY = `<g class="body"><ellipse cx="100" cy="38" rx="17" ry="21"/><path d="M93 58v14M107 58v14"/>
    <path d="M93 72C80 76 66 80 60 90c2 20 4 32 6 42 4 18 10 34 12 50-6 16-14 32-16 50l2 18h72l2-18c-2-18-10-34-16-50 2-16 8-32 12-50 2-10 4-22 6-42-6-10-20-14-33-18"/>
    <path d="M60 90c-6 30-10 80-12 120-1 20-2 36-4 48M66 132c-2 28-4 58-6 82-1 16-2 30-4 42"/>
    <path d="M140 90c6 30 10 80 12 120 1 20 2 36 4 48M134 132c2 28 4 58 6 82 1 16 2 30 4 42"/>
    <path d="M64 250c2 60 8 120 14 190M136 250c-2 60-8 120-14 190M100 262c-1 58-3 118-6 178M100 262c1 58 3 118 6 178"/></g>`;
  const figure = (list = MEASURES) => `<svg class="mfig" viewBox="0 0 215 460" role="img" aria-label="${esc(L(MX.figLabel))}">${BODY}
    ${list.map((m) => `<g class="mline${m.back ? " mline--back" : ""}" data-fig="${m.id}">${m.fig}<text x="${m.lx}" y="${m.ly}">${MEASURES.indexOf(m) + 1}</text></g>`).join("")}</svg>`;

  /* Numbers: "86", "86,5", "86.5 cm", "34 1/2", "34½", "34 in", full-width digits, and 5'6" for height */
  const VULGAR = { "¼": " 1/4", "½": " 1/2", "¾": " 3/4", "⅓": " 1/3", "⅔": " 2/3", "⅛": " 1/8", "⅜": " 3/8", "⅝": " 5/8", "⅞": " 7/8" };
  function parseMeasure(raw, id, unit) {
    let s = String(raw).replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (c) => VULGAR[c]).normalize("NFKC").replace(/⁄/g, "/").replace(/[’′]/g, "'").replace(/[”″]/g, '"').trim().toLowerCase();
    if (id === "height") {
      const f = /^(\d)\s*(?:'|ft)\s*(\d{1,2}(?:[.,]\d+)?)?\s*(?:"|''|in)?$/.exec(s);
      if (f) return Math.round(((+f[1] * 12) + parseFloat((f[2] || "0").replace(",", "."))) * 254) / 100;
    }
    let u = unit;
    const suf = /\s*(cm|santim|santimetre|inç|inch|inches|in|")$/.exec(s);
    if (suf) { u = suf[1] === "cm" || suf[1].startsWith("santim") ? "cm" : "in"; s = s.slice(0, suf.index).trim(); }
    s = s.replace(/,/g, ".");
    const m = /^(\d{1,3}(?:\.\d*)?)(?:[\s-]+(\d{1,2})\/(\d{1,2}))?$/.exec(s);
    if (!m) return NaN;
    let v = parseFloat(m[1]);
    if (m[2]) { if (+m[3] === 0 || +m[2] >= +m[3]) return NaN; v += m[2] / m[3]; }
    const cm = u === "in" ? v * 2.54 : v;
    return cm >= 0 ? Math.round(cm * 100) / 100 : NaN;
  }
  const CANON = /^\d+(\.\d+)?$/;
  const fmt = (n, d = 1) => (+n).toLocaleString(loc(), { maximumFractionDigits: d, useGrouping: false });

  // Stored data is untrusted (it may be edited, old or corrupted): normalise its shape
  const isRealDate = (v) => { const d = isoDate(v || ""); return d && !isNaN(Date.parse(d + "T00:00:00")) ? d : ""; };
  const loadCard = () => {
    const c = store.get("ba-measure", {});
    const obj = (o) => (o && typeof o === "object" && !Array.isArray(o) ? o : {});
    const v = {}, p = {}, o = {};
    for (const m of MEASURES) {
      const x = obj(obj(c).v)[m.id];
      if (typeof x !== "string" || x === "") continue;
      // older versions could store "85." or "85 cm" — re-read them as centimetres
      const n = CANON.test(x) ? +x : parseMeasure(x, m.id, "cm");
      v[m.id] = isNaN(n) ? x.slice(0, 20) : String(n);
    }
    for (const k of ["name", "wedding", "bra", "size", "notes"]) { const x = obj(obj(c).p)[k]; if (typeof x === "string") p[k] = x.slice(0, k === "notes" ? 600 : 80); }
    if ("wedding" in p) p.wedding = isRealDate(p.wedding);
    const oo = obj(obj(c).o);
    for (const k of ["by", "sil", "slv", "neck", "under"]) if (OPT[k].some((x) => x[0] === oo[k])) o[k] = oo[k];
    o.gloves = oo.gloves === true; o.noshoes = oo.noshoes === true;
    return { unit: obj(c).unit === "in" ? "in" : "cm", v, p, o, sentAt: typeof obj(c).sentAt === "string" ? obj(c).sentAt : "" };
  };
  let card = loadCard();
  // Details the bride already typed elsewhere on the site start the card — only until she edits them
  const seedCard = () => {
    if (card.p.name === undefined) card.p.name = String(store.get("ba-enquiry", {}).name || "");
    if (card.p.wedding === undefined) card.p.wedding = isRealDate(store.get("ba-wedding", ""));
    if (!card.o.sil) { const g = byId(params.get("g") || ""); card.o.sil = g && OPT.sil.some((x) => x[0] === g.silhouette) ? g.silhouette : "unsure"; }
    for (const k of ["slv", "neck"]) if (!card.o[k]) card.o[k] = "unsure";
  };
  let savedOk = true, savedAt = null;
  const save = () => { savedOk = store.set("ba-measure", card); savedAt = new Date(); showSaved(); };
  const showSaved = () => $$("[data-msaved]").forEach((el) => {
    el.classList.toggle("is-err", !savedOk);
    el.textContent = !savedOk ? L(MX.notSaved) : savedAt ? F(MX.saved, { time: savedAt.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit" }) }) : "";
  });

  const visible = (m) => !m.when || WHEN[m.when].t(card.o);
  const isNum = (id) => CANON.test(card.v[id] || "");
  const cmOf = (id) => (isNum(id) ? +card.v[id] : NaN);
  const isEmpty = (id) => !card.v[id];
  const inRange = (m) => { const v = cmOf(m.id); return v >= m.min && v <= m.max; };
  const shown = (id) => (!card.v[id] ? "" : !isNum(id) ? card.v[id] : fmt(card.unit === "in" ? cmOf(id) / 2.54 : cmOf(id)));
  const unitLabel = () => (card.unit === "in" ? L(MX.inch) : "cm");
  const rowsShown = () => MEASURES.filter(visible);
  const filled = () => rowsShown().filter((m) => isNum(m.id)).length;

  // Cross-checks between measurements (cm). Shown under the later field; warn only.
  const RULES = [
    { on: "underbust", d: ["bust", "underbust"], t: (v) => (v.underbust >= v.bust ? MX.xSwapUB : v.bust - v.underbust < 4 || v.bust - v.underbust > 35 ? MX.xUB : null) },
    { on: "highhip", d: ["waist", "highhip", "hip"], t: (v) => (v.highhip < v.waist - 2 || v.highhip > v.hip + 3 ? MX.xHighHip : null) },
    { on: "hip", d: ["waist", "hip"], t: (v) => (v.waist / v.hip > 1.1 || v.waist / v.hip < 0.6 ? MX.xWaistHip : null) },
    { on: "apex", d: ["bust", "apex"], t: (v) => (v.apex / v.bust < 0.13 || v.apex / v.bust > 0.3 ? MX.xApex : null) },
    { on: "shub", d: ["shbp", "shub"], t: (v) => (v.shub <= v.shbp ? MX.xOrder : null) },
    { on: "shwaist", d: ["shub", "shwaist"], t: (v) => (v.shwaist <= v.shub ? MX.xOrder : null) },
    { on: "hwaist", d: ["shwaist", "hwaist"], t: (v) => (v.shwaist - v.hwaist < 2 || v.shwaist - v.hwaist > 15 ? MX.xHwaist : null) },
    { on: "side", d: ["shwaist", "side"], t: (v) => (v.side > v.shwaist - 10 ? MX.xSide : null) },
    { on: "upperarm", d: ["armhole", "upperarm"], t: (v) => (v.armhole < v.upperarm + 4 ? MX.xArmhole : null) },
    { on: "elbow", d: ["upperarm", "elbow"], t: (v) => (v.elbow > v.upperarm ? MX.xArmOrder : null) },
    { on: "wrist", d: ["elbow", "wrist"], t: (v) => (v.wrist >= v.elbow ? MX.xArmOrder : null) },
    { on: "back", d: ["shoulder", "back"], t: (v) => (v.back > v.shoulder + 2 ? MX.xBack : null) },
    { on: "kneegirth", d: ["thigh", "kneegirth"], t: (v) => (v.kneegirth >= v.thigh ? MX.xKnee : null) },
    { on: "floor", d: ["knee", "floor"], t: (v) => (v.floor - v.knee < 38 || v.floor - v.knee > 65 ? MX.xKneeFloor : null) },
    { on: "hollow", d: ["hwaist", "floor", "hollow"], t: (v) => (Math.abs(v.hollow - (v.hwaist + v.floor)) > 4 ? [MX.xHollowSum, { sum: fmt(v.hwaist + v.floor) }] : null) },
    { on: "hollow", d: ["height", "hollow"], t: (v, o) => {
      const heel = o.noshoes ? 0 : v.heel;
      if (heel === undefined) return null;
      return Math.abs(v.hollow - (0.815 * v.height + heel)) > 7 ? MX.xHollowHeight : null;
    } }
  ];
  const HALF = ["bust", "underbust", "waist", "highhip", "hip", "thigh"];
  // What to say about one field: an error (not a number), a fixable unit slip, out of range, or a cross-check
  function issue(m) {
    if (isEmpty(m.id)) return null;
    if (!isNum(m.id)) return { lvl: "err", text: L(MX.notNum) };
    const c = cmOf(m.id), ok = (x) => x >= m.min && x <= m.max;
    if (!ok(c)) {
      // e.g. bust "44": inches (112 cm) or half a circle (88 cm)? say both, offer the inch fix
      if (card.unit === "cm" && c < m.min && ok(c * 2.54)) return { lvl: "warn", text: F(MX.looksIn, { v: fmt(c), cm: fmt(c * 2.54) }) + (HALF.includes(m.id) && ok(c * 2) ? " " + L(MX.half) : ""), fix: c * 2.54 };
      if (card.unit === "in" && c > m.max && ok(c / 2.54)) return { lvl: "warn", text: F(MX.looksCm, { v: fmt(c / 2.54) }), fix: c / 2.54 };
      if (c > m.max && ok(c / 10)) return { lvl: "warn", text: F(MX.looksMm, { cm: fmt(c / 10) }), fix: c / 10 };
      if (HALF.includes(m.id) && c < m.min && ok(c * 2)) return { lvl: "warn", text: L(MX.half) };
      return { lvl: "warn", text: L(MX.odd) };
    }
    const v = {};
    for (const x of MEASURES) if (visible(x) && isNum(x.id)) v[x.id] = cmOf(x.id);
    for (const r of RULES) {
      if (r.on !== m.id || !r.d.every((id) => id in v)) continue;
      const res = r.t(v, card.o);
      if (res) return { lvl: "warn", text: Array.isArray(res) ? F(res[0], res[1]) : L(res) };
    }
    return null;
  }
  const flagged = () => rowsShown().filter((m) => { const i = issue(m); return i && i.lvl === "warn"; });
  const broken = () => rowsShown().filter((m) => { const i = issue(m); return i && i.lvl === "err"; });

  /* ---------- Rendering ---------- */
  const sel = (k, label) => `<label class="field"><span>${L(label)}</span><select class="select" data-mo="${k}">${OPT[k].map(([v, l]) => `<option value="${v}" ${card.o[k] === v || (!card.o[k] && !v) ? "selected" : ""}>${esc(L(l))}</option>`).join("")}</select></label>`;
  const actions = (where) => `
    <div class="mcard__acts">
      <button type="button" class="btn btn--wa btn--sm" data-msend>${ICON.wa} ${L(MX.sendWa)}</button>
      ${where === "end" ? `<button type="button" class="btn btn--ghost btn--sm" data-mmail>${L(MX.sendMail)}</button><button type="button" class="btn btn--ghost btn--sm" data-mcopy>${L(MX.copy)}</button>` : ""}
      <button type="button" class="btn btn--ghost btn--sm" data-mprint>${ICON.print} ${L(MX.print)}</button>
      <button type="button" class="btn btn--ghost btn--sm" data-mblank>${L(MX.blank)}</button>
    </div>`;
  const prog = () => `<div class="mcard__prog" role="progressbar" aria-label="${esc(L(MX.progLabel))}" aria-valuemin="0"><span class="mprog-t"></span><i><b class="mprog-b"></b></i></div>`;

  function renderCard() {
    seedCard();
    const rows = (g) => MEASURES.filter((m) => m.g === g).map((m) => {
      const i = MEASURES.indexOf(m);
      return `
      <div class="mrow" data-m="${m.id}">
        <span class="mrow__n" aria-hidden="true">${num(i)}</span>
        <div class="mrow__txt">
          <label for="m-${m.id}"><b>${L(m.name)}</b><span class="sr-only"> (${unitLabel()})</span>${m.back ? ` <small class="mrow__back">${L(MX.fromBack)}</small>` : ""}</label>
          <p id="h-${m.id}">${L(m.how)}${m.tip ? `<span class="mrow__tip">${L(m.tip)}</span>` : ""}</p>
          <div class="mrow__warn" id="w-${m.id}"></div>
        </div>
        <div class="mrow__in"><input class="input" id="m-${m.id}" data-mv="${m.id}" inputmode="decimal" enterkeyhint="next" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" maxlength="12" value="${esc(shown(m.id))}" aria-describedby="h-${m.id} w-${m.id}"><span aria-hidden="true">${unitLabel()}</span></div>
      </div>`;
    }).join("");
    const ig = /Instagram|FBAN|FBAV/.test(navigator.userAgent);
    $("#mcard").innerHTML = `
      <div class="mcard__bar">
        <div class="mcard__unit" role="group" aria-label="${esc(L(MX.unit))}">
          <button type="button" data-unit="cm" aria-pressed="${card.unit === "cm"}">cm</button><button type="button" data-unit="in" aria-pressed="${card.unit === "in"}">${L(MX.inch)}</button>
        </div>
        ${prog()}
        ${actions("top")}
        <p class="mcard__saved" data-msaved aria-live="polite"></p>
      </div>
      ${ig ? `<p class="mcard__note">${L(MX.igNote)}</p>` : ""}
      <div class="mcard__grid">
        <div class="mcard__figwrap">
          ${figure()}
          <p class="mcard__cap" id="mcap">${L(MX.figHint)}</p>
        </div>
        <div class="mcard__list">
          <details class="mcard__rules" open>
            <summary>${L(MX.rulesTitle)}</summary>
            <ol>${MX.rules.map((r) => `<li>${L(r)}</li>`).join("")}</ol>
          </details>
          <fieldset class="mcard__about">
            <legend class="mcard__group">${L(MX.about)}</legend>
            <label class="field"><span>${L(MX.name)}</span><input class="input" data-mp="name" autocomplete="name" maxlength="80" value="${esc(card.p.name || "")}"></label>
            <label class="field"><span>${L(MX.wedding)}</span><input class="input" type="date" data-mp="wedding" value="${esc(card.p.wedding || "")}"></label>
            ${sel("by", MX.by)}
            ${sel("under", MX.under)}
            <label class="field"><span>${L(MX.bra)}</span><input class="input" data-mp="bra" maxlength="40" value="${esc(card.p.bra || "")}"></label>
            <label class="field"><span>${L(MX.size)}</span><input class="input" data-mp="size" maxlength="40" placeholder="EU 38 / UK 10 / US 6" value="${esc(card.p.size || "")}"></label>
          </fieldset>
          <fieldset class="mcard__about">
            <legend class="mcard__group">${L(MX.gownSec)}</legend>
            ${sel("sil", MX.sil)}
            ${sel("slv", MX.slv)}
            ${sel("neck", MX.neck)}
            <div class="mcard__checks">
              <label class="check"><input type="checkbox" data-mo="gloves" ${card.o.gloves ? "checked" : ""}> <span>${L(MX.gloves)}</span></label>
              <label class="check"><input type="checkbox" data-mo="noshoes" ${card.o.noshoes ? "checked" : ""}> <span>${L(MX.noshoes)}</span></label>
            </div>
          </fieldset>
          ${GKEYS.map((g) => `<section class="mgroup" data-mg="${g}"><h3 class="mcard__group">${L(MX.group[g])}</h3>${g === "shoes" ? `<p class="mgroup__note" data-mbare>${L(MX.shoesBare)}</p>` : ""}${rows(g)}</section>`).join("")}
          <label class="field mt-m"><span>${L(MX.notes)}</span><textarea class="textarea" data-mp="notes" maxlength="600" placeholder="${esc(L(MX.notesPh))}">${esc(card.p.notes || "")}</textarea></label>
          <div class="mcard__end">
            ${prog()}
            ${actions("end")}
            <p class="mcard__status" id="mstatus" aria-live="polite"></p>
            <button type="button" class="link mcard__clear" data-mclear>${L(MX.clear)}</button>
          </div>
        </div>
      </div>`;
    applyVisibility();
    MEASURES.forEach((m) => showIssue(m));
    progress(); showSaved();
    if (card.sentAt && Date.now() - Date.parse(card.sentAt) < 6 * 3600e3) status(L(MX.sentNote), [L(MX.again), "data-msend"]);
  }
  function applyVisibility() {
    for (const m of MEASURES) { const r = $(`.mrow[data-m="${m.id}"]`); if (r) r.hidden = !visible(m); }
    $$(".mgroup").forEach((s) => (s.hidden = !$$(".mrow:not([hidden])", s).length));
    const bare = $("[data-mbare]"); if (bare) bare.hidden = !card.o.noshoes;
    $$(".mfig .mline").forEach((g) => g.classList.toggle("is-off", !visible(byM[g.dataset.fig])));
  }
  function showIssue(m) {
    const el = $("#w-" + m.id); if (!el) return;
    const i = issue(m);
    el.className = "mrow__warn" + (i ? ` is-${i.lvl}` : "");
    el.innerHTML = i ? `${esc(i.text)}${i.fix !== undefined ? ` <button type="button" class="link" data-mfix="${m.id}" data-cm="${Math.round(i.fix * 100) / 100}">${esc(F(MX.useIt, { x: card.unit === "in" ? `${fmt(i.fix / 2.54)} ${L(MX.inch)}` : `${fmt(i.fix)} cm` }))}</button>` : ""}` : "";
    $("#m-" + m.id)?.setAttribute("aria-invalid", String(!!i && i.lvl === "err"));
    $(`.mrow[data-m="${m.id}"]`)?.classList.toggle("has-warn", !!i);
  }
  function progress() {
    const n = filled(), t = rowsShown().length;
    $$(".mprog-t").forEach((el) => (el.textContent = F(MX.done, { n, t })));
    $$(".mprog-b").forEach((el) => (el.style.width = (t ? (n / t) * 100 : 0) + "%"));
    $$(".mcard__prog").forEach((el) => { el.setAttribute("aria-valuemax", t); el.setAttribute("aria-valuenow", n); });
  }
  let statusT;
  function status(text, btn, ms) {
    const el = $("#mstatus"); if (!el) return;
    el.innerHTML = `${esc(text)}${btn ? ` <button type="button" class="link" ${btn[1]}>${esc(btn[0])}</button>` : ""}`;
    clearTimeout(statusT); if (ms) statusT = setTimeout(() => (el.textContent = ""), ms);
  }
  function highlight(id) {
    $$(".mfig .mline").forEach((g) => g.classList.toggle("is-on", g.dataset.fig === id));
    $$(".mrow").forEach((r) => r.classList.toggle("is-on", r.dataset.m === id));
    const m = byM[id];
    if (m) $("#mcap").innerHTML = `<b>${num(MEASURES.indexOf(m))} · ${L(m.name)}</b>${m.back ? ` <small>(${L(MX.fromBack)})</small>` : ""}<br>${L(m.how)}`;
  }
  const focusField = (id) => { const el = $("#m-" + id); if (!el) return; el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); el.focus({ preventScroll: true }); };

  /* ---------- The message the atelier receives ---------- */
  function composeMsg() {
    const other = lang() === "tr" ? "en" : "tr";
    const o = card.o, lines = [L(MX.msgHead)];
    if (card.p.name) lines.push(`${L(MX.name)}: ${card.p.name}`);
    if (card.p.wedding) lines.push(`${L(MX.wedding)}: ${fmtDate(new Date(card.p.wedding + "T00:00:00"))}`);
    if (o.by) lines.push(`${L(MX.msgBy)}: ${optLabel("by", o.by)}`);
    lines.push(`${L(MX.msgOn)}: ${fmtDate(new Date())}`);
    const gown = [optLabel("sil", o.sil), optLabel("slv", o.slv), optLabel("neck", o.neck), o.gloves ? L(MX.gloves) : ""].filter(Boolean).join(" · ");
    if (gown) lines.push(`${L(MX.msgGown)}: ${gown}`);
    if (o.under) lines.push(`${L(MX.under)}: ${optLabel("under", o.under)}`);
    if (card.p.bra) lines.push(`${L(MX.bra).replace(/ \(.*\)/, "")}: ${card.p.bra}`);
    if (card.p.size) lines.push(`${L(MX.sizeShort)}: ${card.p.size}`);
    if (o.noshoes) lines.push(L(MX.msgBare));
    lines.push("", `${L(MX.msgUnit)}${card.unit === "in" ? ` (${L(MX.inch)})` : ""}:`);
    const odd = new Set(flagged().map((m) => m.id));
    const missing = [];
    for (const m of rowsShown()) {
      const i = MEASURES.indexOf(m);
      // English messages carry the Turkish name too, so the atelier reads every line at a glance
      const name = lang() === "tr" ? m.name.tr : `${m.name.en} / ${m.name[other]}`;
      if (!isNum(m.id)) { missing.push(`${num(i)} ${lang() === "tr" ? m.name.tr : m.name.en}`); continue; }
      const c = cmOf(m.id);
      lines.push(`${num(i)} ${name}: ${fmt(c)}${card.unit === "in" ? ` (${fmt(c / 2.54)} ${L(MX.inch)})` : ""}${odd.has(m.id) ? " ⚠" : ""}`);
    }
    if (missing.length) lines.push("", `${L(MX.msgMissing)}: ${missing.join(", ")}`);
    if (odd.size) lines.push("", L(MX.msgOdd));
    if (card.p.notes) lines.push("", `${L(MX.notes)}: ${card.p.notes}`);
    return lines.join("\n");
  }
  // Blocks only on text that isn't a number; missing or unusual values ask once
  function readyToSend() {
    const bad = broken();
    if (bad.length) { toast(L(MX.fixFirst)); focusField(bad[0].id); return false; }
    if (!filled()) { toast(L(MX.empty)); focusField(rowsShown()[0].id); return false; }
    const miss = rowsShown().length - filled(), odd = flagged().length;
    if (!miss && !odd) return true;
    return confirm([miss ? F(MX.askMissing, { n: miss, t: rowsShown().length }) : "", odd ? L(MX.askOdd) : "", L(MX.askSend)].filter(Boolean).join("\n\n"));
  }
  const coarse = () => matchMedia("(pointer: coarse)").matches;
  // On phones open WhatsApp in place: no blank tab left behind in Safari or Instagram's browser
  const openOut = (url) => (coarse() ? (location.href = url) : window.open(url, "_blank", "noopener"));
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); return ok;
  }

  /* ---------- Events (delegated once; the card re-renders on language change) ---------- */
  const inCard = (el) => el && el.closest && el.closest("#mcard");
  document.addEventListener("input", (e) => {
    if (!inCard(e.target)) return;
    const mv = e.target.closest("[data-mv]"), mp = e.target.closest("[data-mp]");
    if (mv) {
      const id = mv.dataset.mv, raw = mv.value.trim();
      const n = raw === "" ? NaN : parseMeasure(raw, id, card.unit);
      card.v[id] = raw === "" ? "" : isNaN(n) ? raw.slice(0, 20) : String(n);
      // While typing, only clear a warning — new ones appear when she leaves the field
      if (!issue(byM[id])) showIssue(byM[id]);
      progress();
    }
    if (mp) card.p[mp.dataset.mp] = mp.dataset.mp === "wedding" ? isRealDate(mp.value) : mp.value;
    if (mv || mp) save();
  });
  document.addEventListener("change", (e) => {
    if (!inCard(e.target)) return;
    if (e.target.closest("[data-mv]")) MEASURES.forEach(showIssue);
    const mo = e.target.closest("[data-mo]");
    if (mo) {
      card.o[mo.dataset.mo] = mo.type === "checkbox" ? mo.checked : mo.value;
      save(); applyVisibility(); MEASURES.forEach(showIssue); progress();
    }
  });
  document.addEventListener("keydown", (e) => {
    const mv = e.target.closest && e.target.closest("[data-mv]");
    if (!mv || e.key !== "Enter") return;
    e.preventDefault();
    const list = $$(".mrow:not([hidden]) [data-mv]"), i = list.indexOf(mv);
    if (list[i + 1]) list[i + 1].focus(); else $('[data-mp="notes"]')?.focus();
  });
  document.addEventListener("focusin", (e) => { const r = inCard(e.target) && e.target.closest(".mrow"); if (r) highlight(r.dataset.m); });
  document.addEventListener("mouseover", (e) => {
    const r = e.target.closest && e.target.closest(".mrow");
    // Hover never steals the highlight from the field she's typing in
    if (r && matchMedia("(hover: hover)").matches && !document.activeElement?.matches?.("[data-mv]")) highlight(r.dataset.m);
  });
  let undoCard = null;
  document.addEventListener("click", (e) => {
    if (!inCard(e.target)) return;
    const row = e.target.closest(".mrow");
    if (row && !e.target.closest("button")) highlight(row.dataset.m);
    const u = e.target.closest("[data-unit]");
    if (u && u.dataset.unit !== card.unit) {
      card.unit = u.dataset.unit === "in" ? "in" : "cm"; save(); renderCard();
      $(`[data-unit="${card.unit}"]`)?.focus(); return;
    }
    const fx = e.target.closest("[data-mfix]");
    if (fx) { const id = fx.dataset.mfix; card.v[id] = String(+fx.dataset.cm); save(); $("#m-" + id).value = shown(id); MEASURES.forEach(showIssue); progress(); $("#m-" + id).focus(); return; }
    if (e.target.closest("[data-msend]")) {
      if (!readyToSend()) return;
      card.sentAt = new Date().toISOString(); save();
      status(L(MX.sentNote), [L(MX.again), "data-msend"]);
      openOut(wa(composeMsg()));
      return;
    }
    if (e.target.closest("[data-mmail]")) {
      if (!readyToSend()) return;
      const text = composeMsg(), subject = `${L(MX.title)}${card.p.name ? ` — ${card.p.name}` : ""}`;
      let url = `mailto:${S.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      // Many mail apps cut links longer than ~2,000 characters: copy the card and ask her to paste it
      if (url.length > 1900) { copyText(text); toast(L(MX.mailLong)); url = `mailto:${S.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(L(MX.mailPaste) + "\n\n")}`; }
      location.href = url;
      return;
    }
    if (e.target.closest("[data-mcopy]")) { copyText(composeMsg()).then((ok) => toast(ok ? L(MX.copied) : L(MX.fixFirst))); return; }
    if (e.target.closest("[data-mprint]")) return printCard(false);
    if (e.target.closest("[data-mblank]")) return printCard(true);
    if (e.target.closest("[data-mclear]") && confirm(L(MX.clearAsk))) {
      undoCard = JSON.parse(JSON.stringify(card));
      card = { unit: card.unit, v: {}, p: { name: "", wedding: "" }, o: {}, sentAt: "" }; save(); renderCard();
      status(L(MX.cleared), [L(MX.undo), "data-mundo"], 10000);
      return;
    }
    if (e.target.closest("[data-mundo]") && undoCard) { card = undoCard; undoCard = null; save(); renderCard(); }
  });
  // The same card open in another tab: take its newer copy unless she's typing here
  addEventListener("storage", (e) => {
    if (e.key !== "ba-measure" || inCard(document.activeElement)) return;
    card = loadCard(); renderCard();
  });

  /* ---------- Print: a clean, single A4 page (filled or blank) ---------- */
  function printCard(blank, viaBrowser) {
    const both = (o) => `${L(o)}${o.en !== o.tr ? ` <i>/ ${lang() === "tr" ? o.en : o.tr}</i>` : ""}`;
    // first sentence only (no regex look-behind: iOS before 16.4 can't parse it)
    const short = (m) => { const t = L(m.how), k = t.indexOf(". "); return k > 0 ? t.slice(0, k + 1) : t; };
    const list = blank ? MEASURES : rowsShown();
    const val = (m) => (blank || !isNum(m.id) ? "" : `${fmt(card.unit === "in" ? cmOf(m.id) / 2.54 : cmOf(m.id))}`);
    const box = (on, label) => `<span class="pc__box">${on ? "☒" : "☐"} ${esc(label)}</span>`;
    const pick = (k) => OPT[k].filter(([v]) => v && v !== "unsure").map(([v, l]) => box(!blank && card.o[k] === v, L(l))).join(" ");
    const p = (k) => (blank ? "" : esc(card.p[k] || ""));
    $("#print-card").innerHTML = `
      <header class="pc__head">
        <div><span class="logo__mono">B<i>A</i></span><span class="pc__brand">Burak Altaş Atelier</span></div>
        <div class="pc__title">${L(MX.title)}</div>
      </header>
      <div class="pc__meta">
        <span>${L(MX.name)}: <b>${p("name")}</b></span>
        <span>${L(MX.wedding)}: <b>${!blank && card.p.wedding ? fmtDate(new Date(card.p.wedding + "T00:00:00")) : ""}</b></span>
        <span>${L(MX.unit)}: <b>${blank ? `cm / ${L(MX.inch)}` : unitLabel()}</b></span>
        <span>${L(MX.printDate)}: <b>${blank ? "" : fmtDate(new Date())}</b></span>
      </div>
      <div class="pc__opts">
        <div><b>${L(MX.sil)}:</b> ${pick("sil")}</div>
        <div><b>${L(MX.slv)}:</b> ${pick("slv")}</div>
        <div><b>${L(MX.neck)}:</b> ${pick("neck")} · ${box(!blank && card.o.gloves, L(MX.gloves))} · ${box(!blank && card.o.noshoes, L(MX.msgBare))}</div>
      </div>
      <div class="pc__body">
        <div class="pc__side">
          <div class="pc__fig">${figure(list)}</div>
          <ol class="pc__rules">${MX.rules.slice(0, 5).map((r) => `<li>${L(r)}</li>`).join("")}</ol>
          <div class="pc__foot">
            <span>${L(MX.under)}: <b>${blank ? "" : esc(optLabel("under", card.o.under))}</b></span>
            <span>${L(MX.bra).replace(/ \(.*\)/, "")}: <b>${p("bra")}</b></span>
            <span>${L(MX.size)}: <b>${p("size")}</b></span>
            <span>${L(MX.msgBy)}: <b>${blank ? "" : esc(optLabel("by", card.o.by))}</b></span>
            <div class="pc__notes">${L(MX.notes)}:<div>${p("notes")}</div></div>
          </div>
          <p class="pc__contact">WhatsApp ${esc(S.phoneDisplay)}<br>${esc(S.instagramHandle)}<br>${esc(S.domain.replace(/^https?:\/\//, ""))}</p>
        </div>
        <table class="pc__table${blank ? " pc__table--blank" : ""}"><thead><tr><th></th><th></th>${blank ? `<th>${L(MX.first)}</th><th>${L(MX.second)}</th>` : `<th>${unitLabel()}</th>`}</tr></thead><tbody>
          ${list.map((m) => `<tr><td class="pc__n">${num(MEASURES.indexOf(m))}</td><td><b>${both(m.name)}</b>${m.when && blank ? ` <em class="pc__if">(${esc(F(MX.onlyIf, { c: L(WHEN[m.when].c) }))})</em>` : ""}<br><span>${esc(short(m))}</span></td>${blank ? `<td class="pc__v"></td><td class="pc__v"></td>` : `<td class="pc__v">${val(m)}</td>`}</tr>`).join("")}
        </tbody></table>
      </div>`;
    document.body.classList.add("is-printing");
    if (!viaBrowser) setTimeout(() => window.print(), 50);
  }
  // Ctrl+P / browser menu: print the filled card rather than the page with its input fields
  addEventListener("beforeprint", () => { if (!document.body.classList.contains("is-printing") && $("#mcard")) printCard(false, true); });
  const endPrint = () => document.body.classList.remove("is-printing");
  addEventListener("afterprint", endPrint);
  matchMedia("print").addEventListener?.("change", (q) => { if (!q.matches) setTimeout(endPrint, 300); });

  /* ---------- Boot ---------- */
  onLang(() => { renderTypes(); renderBooking(); renderPrep(); renderCard(); BA.observeReveals(); });
  if (location.hash === "#measure-card") setTimeout(() => $("#measure-card").scrollIntoView(), 300);
})();
