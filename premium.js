import { db } from "./firebase-config.js";
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from "./notifications.js";
import { setGlobalLoading } from "./utils.js";

let modalShownForSession = false;

export function initPremiumSystem(getUserProfileFn, onPremiumActivated) {
  const modal = document.getElementById("premium-modal");
  const openBtn = document.getElementById("open-premium-modal-btn");
  const closeBtn = document.getElementById("close-premium-modal-btn");
  const activateBtn = document.getElementById("activate-premium-btn");

  openBtn?.addEventListener("click", () => {
    modal?.classList.remove("hidden");
  });

  closeBtn?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });

  activateBtn?.addEventListener("click", async () => {
    const profile = getUserProfileFn();
    if (!profile) return;

    if ((profile.coins || 0) < 7) {
      showNotification("Coin Belum Cukup", "Kumpulkan 7 Coin terlebih dahulu untuk mengaktifkan Premium.", "error");
      return;
    }

    setGlobalLoading(true, "Mengaktifkan MATSASU PREMIUM...");
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        isPremium: true,
        updatedAt: serverTimestamp()
      });
      modal?.classList.add("hidden");
      showNotification("Premium Terbuka", "MATSASU PREMIUM aktif! Mode HARIRI & SONNET kini terbuka.", "welcome");
      if (typeof onPremiumActivated === "function") {
        onPremiumActivated();
      }
    } catch (err) {
      showNotification("Aktivasi Gagal", "Tidak dapat memperbarui status Premium.", "error");
    } finally {
      setGlobalLoading(false);
    }
  });
}

export function checkAutoShowPremiumModal(profile) {
  if (!profile) return;
  if (!profile.isPremium && (profile.coins || 0) >= 7 && !modalShownForSession) {
    modalShownForSession = true;
    document.getElementById("premium-modal")?.classList.remove("hidden");
  }
}
