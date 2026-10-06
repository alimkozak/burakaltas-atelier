/* ==========================================================================
   Cloudflare Quick Tunnel — a temporary https link to a server on this PC.
   Used by onizleme.js (site preview) and admin.js in remote mode.
   No account needed; the link changes every time and dies with the window.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const { spawn, exec } = require("child_process");

function findCloudflared() {
  const tries = [
    process.env.CLOUDFLARED,
    "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
    "C:\\Program Files\\cloudflared\\cloudflared.exe",
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "cloudflared.exe")
  ].filter(Boolean);
  return tries.find((p) => fs.existsSync(p)) || "cloudflared";
}

// Copies text to the clipboard on Windows (silently does nothing elsewhere)
function copy(text) {
  if (process.platform !== "win32") return;
  const c = exec("clip");
  c.stdin.end(text);
}

/* startTunnel(port, onUrl): starts the tunnel and calls onUrl("https://….trycloudflare.com") once */
function startTunnel(port, onUrl) {
  console.log("  İnternet linki hazırlanıyor (10–20 saniye)…");
  const cf = spawn(findCloudflared(), ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`], { windowsHide: true });
  let shown = false;
  const watch = (buf) => {
    const m = !shown && /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(buf.toString());
    if (!m) return;
    shown = true;
    onUrl(m[0]);
  };
  cf.stdout.on("data", watch);
  cf.stderr.on("data", watch);
  cf.on("error", () => {
    console.log(`\n  ! cloudflared bulunamadı. Kurmak için PowerShell'de şunu çalıştırın:\n    winget install --id Cloudflare.cloudflared\n  Şimdilik yalnızca bu bilgisayarda açık: http://localhost:${port}\n`);
  });
  cf.on("exit", (code) => { if (shown || code) console.log("\n  Tünel kapandı. Linki yenilemek için bu dosyayı yeniden çalıştırın."); process.exit(0); });
  const stop = () => { cf.kill(); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  return cf;
}

module.exports = { startTunnel, copy };
