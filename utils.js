// =========================================================
// UTILITY HELPERS — Sanitasi, Validasi, Format & Asset Fallback
// =========================================================

export const INTERNAL_AUTH_DOMAIN = "matsasu.app";
export const DEFAULT_AVATAR_PATH = "assets/images/Gambar4.png";
export const AI_MASCOT_PATH = "assets/images/Gambar3.png";
export const CHIBI_MASCOT_PATH = "assets/images/Gambar7.png";

export function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

export function validateUsername(username) {
  const clean = String(username || "").trim();
  if (clean.length < 3 || clean.length > 20) {
    return { valid: false, message: "Username harus terdiri dari 3 hingga 20 karakter." };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return { valid: false, message: "Username hanya boleh berisi huruf, angka, dan underscore (_)." };
  }
  return { valid: true, value: clean };
}

export function validatePassword(password) {
  const raw = String(password || "");
  if (raw.length < 8) {
    return { valid: false, message: "Password minimal 8 karakter." };
  }
  return { valid: true, value: raw };
}

export function usernameToInternalEmail(username) {
  const norm = normalizeUsername(username);
  return `${norm}@${INTERNAL_AUTH_DOMAIN}`;
}

export function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTime(timestamp) {
  if (!timestamp) return "Baru saja";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = String(str || "");
  return div.innerHTML;
}

export function renderSafeMarkdown(rawText) {
  const text = String(rawText || "");
  if (window.marked && window.DOMPurify) {
    const html = window.marked.parse(text, { breaks: true, gfm: true });
    return window.DOMPurify.sanitize(html);
  }
  return `<p>${escapeHTML(text).replace(/\n/g, "<br>")}</p>`;
}

export function attachImageFallbacks() {
  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = "true";
      const svgFallback =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#171321"/>
                <stop offset="100%" stop-color="#8B42C7"/>
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#g)"/>
            <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-weight="bold" font-size="16">MATSASU</text>
          </svg>`
        );
      img.src = svgFallback;
    });
  });
}

export function setGlobalLoading(show, text = "Memuat sistem...") {
  const el = document.getElementById("global-loader");
  const label = document.getElementById("global-loader-text");
  if (!el) return;
  if (label) label.textContent = text;
  el.classList.toggle("hidden", !show);
}
