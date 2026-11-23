import { CHIBI_MASCOT_PATH } from "./utils.js";

const notifHistory = [];

export function initNotifications() {
  const btn = document.getElementById("header-notif-btn");
  const popover = document.getElementById("notif-popover");
  const clearBtn = document.getElementById("clear-notif-btn");

  btn?.addEventListener("click", (e) => {
    e.stopPropagation();
    popover?.classList.toggle("hidden");
    document.getElementById("notif-dot")?.classList.add("hidden");
  });

  clearBtn?.addEventListener("click", () => {
    notifHistory.length = 0;
    renderNotifList();
  });

  document.addEventListener("click", (e) => {
    if (popover && !popover.contains(e.target) && e.target !== btn) {
      popover.classList.add("hidden");
    }
  });

  window.addEventListener("offline", () => {
    showNotification("Koneksi Terputus", "Periksa koneksi internet Anda.", "error");
  });

  window.addEventListener("online", () => {
    showNotification("Koneksi Pulih", "Terhubung kembali ke layanan MATSASU BOT.", "success");
  });
}

export function showNotification(title, message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-item ${type}`;

  if (type === "welcome") {
    const img = document.createElement("img");
    img.src = CHIBI_MASCOT_PATH;
    img.alt = "MATSASU Mascot";
    img.className = "toast-chibi";
    toast.appendChild(img);
  } else {
    const iconWrap = document.createElement("div");
    iconWrap.className = "toast-icon-wrap";
    iconWrap.innerHTML = getToastSvg(type);
    toast.appendChild(iconWrap);
  }

  const body = document.createElement("div");
  body.className = "toast-body";

  const titleEl = document.createElement("div");
  titleEl.className = "toast-title";
  titleEl.textContent = title;

  const msgEl = document.createElement("div");
  msgEl.className = "toast-msg";
  msgEl.textContent = message;

  body.appendChild(titleEl);
  body.appendChild(msgEl);
  toast.appendChild(body);
  container.appendChild(toast);

  notifHistory.unshift({
    title,
    message,
    time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  });
  if (notifHistory.length > 20) notifHistory.pop();
  renderNotifList();
  document.getElementById("notif-dot")?.classList.remove("hidden");

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 260);
  }, 4200);
}

function renderNotifList() {
  const list = document.getElementById("notif-list");
  if (!list) return;

  if (notifHistory.length === 0) {
    list.innerHTML = `<div class="notif-empty">Belum ada notifikasi baru.</div>`;
    return;
  }

  list.innerHTML = "";
  notifHistory.forEach((item) => {
    const row = document.createElement("div");
    row.className = "notif-entry";

    const strong = document.createElement("strong");
    strong.textContent = `${item.title} (${item.time})`;

    const span = document.createElement("span");
    span.textContent = item.message;

    row.appendChild(strong);
    row.appendChild(span);
    list.appendChild(row);
  });
}

function getToastSvg(type) {
  if (type === "error") {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }
  if (type === "success") {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
}
