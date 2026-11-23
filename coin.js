import { db } from "./firebase-config.js";
import { doc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getTodayDateKey } from "./utils.js";
import { showNotification } from "./notifications.js";

const TARGET_COINS = 7;
const ACTIVITY_SECONDS_REQUIRED = 120; // 2 menit

let activityInterval = null;
let elapsedSeconds = 0;
let activityRewardClaimedThisSession = false;

export function stopCoinActivityTimer() {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
}

export async function checkDailyLoginCoin(userProfile) {
  if (!userProfile || !userProfile.uid) return;
  if (userProfile.isPremium || (userProfile.coins || 0) >= TARGET_COINS) {
    const statusEl = document.getElementById("daily-login-status");
    if (statusEl) statusEl.textContent = "Selesai";
    return;
  }

  const today = getTodayDateKey();
  const statusEl = document.getElementById("daily-login-status");

  if (userProfile.lastDailyCoinDate === today) {
    if (statusEl) statusEl.textContent = "Sudah Diklaim";
    return;
  }

  try {
    const userRef = doc(db, "users", userProfile.uid);
    await updateDoc(userRef, {
      coins: increment(1),
      lastDailyCoinDate: today,
      updatedAt: serverTimestamp()
    });
    if (statusEl) statusEl.textContent = "Diklaim (+1)";
    showNotification("Coin Diperoleh", "+1 Coin dari Login Harian berhasil ditambahkan.", "success");
  } catch (err) {
    console.error("Daily coin update error:", err);
  }
}

export function startTwoMinuteActivityTracker(getUserProfileFn) {
  stopCoinActivityTimer();
  elapsedSeconds = 0;
  activityRewardClaimedThisSession = false;

  const timerDisplay = document.getElementById("activity-timer-display");
  const progressBar = document.getElementById("activity-progress-bar");

  activityInterval = setInterval(async () => {
    const profile = getUserProfileFn();
    if (!profile) return;

    if (profile.isPremium || (profile.coins || 0) >= TARGET_COINS) {
      if (timerDisplay) timerDisplay.textContent = "MAX";
      if (progressBar) progressBar.style.width = "100%";
      stopCoinActivityTimer();
      return;
    }

    if (activityRewardClaimedThisSession) {
      if (timerDisplay) timerDisplay.textContent = "Selesai";
      if (progressBar) progressBar.style.width = "100%";
      stopCoinActivityTimer();
      return;
    }

    // Hanya hitung waktu ketika tab aktif & terlihat
    if (document.visibilityState === "visible") {
      elapsedSeconds += 1;
    }

    const remaining = Math.max(0, ACTIVITY_SECONDS_REQUIRED - elapsedSeconds);
    const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
    const secs = String(remaining % 60).padStart(2, "0");
    if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;

    const pct = Math.min(100, Math.round((elapsedSeconds / ACTIVITY_SECONDS_REQUIRED) * 100));
    if (progressBar) progressBar.style.width = `${pct}%`;

    if (elapsedSeconds >= ACTIVITY_SECONDS_REQUIRED && !activityRewardClaimedThisSession) {
      activityRewardClaimedThisSession = true;
      stopCoinActivityTimer();
      try {
        await updateDoc(doc(db, "users", profile.uid), {
          coins: increment(1),
          updatedAt: serverTimestamp()
        });
        showNotification("Coin Diperoleh", "+1 Coin dari aktivitas aktif 2 menit di MATSASU BOT.", "success");
      } catch (err) {
        console.error("Activity coin error:", err);
      }
    }
  }, 1000);
}

export function renderCoinProgress(profile) {
  const coins = Math.min(TARGET_COINS, Number(profile?.coins || 0));
  const isPremium = Boolean(profile?.isPremium);

  const heading = document.getElementById("coin-progress-title");
  const bar = document.getElementById("coin-progress-bar");
  const subinfo = document.getElementById("coin-remaining-text");
  const activateBtn = document.getElementById("open-premium-modal-btn");

  if (heading) heading.textContent = `${coins} / ${TARGET_COINS} COIN`;
  if (bar) bar.style.width = `${Math.round((coins / TARGET_COINS) * 100)}%`;

  if (isPremium) {
    if (subinfo) subinfo.textContent = "Status MATSASU PREMIUM telah aktif pada akun Anda.";
    activateBtn?.classList.add("hidden");
  } else if (coins >= TARGET_COINS) {
    if (subinfo) subinfo.textContent = "Target 7 Coin tercapai! Anda dapat mengaktifkan MATSASU PREMIUM.";
    activateBtn?.classList.remove("hidden");
  } else {
    const left = TARGET_COINS - coins;
    if (subinfo) subinfo.textContent = `Sisa ${left} Coin lagi menuju pembukaan akses MATSASU PREMIUM.`;
    activateBtn?.classList.add("hidden");
  }
}
