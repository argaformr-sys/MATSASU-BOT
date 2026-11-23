import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { initAuthUI, logoutUser } from "./auth.js";
import { initNotifications } from "./notifications.js";
import { initHomeNavigation, renderHomeProfile } from "./home.js";
import { initAIAssistant, refreshAIModesLockState } from "./ai.js";
import { initQuranFeature } from "./quran.js";
import { initGlobalChat, subscribeGlobalChat, stopGlobalChatListener } from "./global-chat.js";
import { initProfileEditor, populateEditProfileForm } from "./profile.js";
import { checkDailyLoginCoin, startTwoMinuteActivityTracker, stopCoinActivityTimer } from "./coin.js";
import { initPremiumSystem, checkAutoShowPremiumModal } from "./premium.js";
import { attachImageFallbacks, setGlobalLoading } from "./utils.js";

let currentUserProfile = null;
let unsubscribeUserDoc = null;
let dailyLoginCheckedForUid = null;

const PAGE_TITLES = {
  home: "Home",
  ai: "AI Assistant",
  quran: "Al Quran",
  chat: "Global Chat",
  profile: "Edit Profile"
};

function getCurrentUserProfile() {
  return currentUserProfile;
}

function navigateToPage(pageKey) {
  if (!PAGE_TITLES[pageKey]) pageKey = "home";

  document.querySelectorAll(".page-section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === `page-${pageKey}`);
  });

  document.querySelectorAll(".sidebar-nav .nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageKey);
  });

  const headerTitle = document.getElementById("header-page-title");
  if (headerTitle) headerTitle.textContent = PAGE_TITLES[pageKey];

  closeMobileSidebar();
}

function openMobileSidebar() {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("sidebar-backdrop")?.classList.add("active");
}

function closeMobileSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebar-backdrop")?.classList.remove("active");
}

function bindShellEvents() {
  document.getElementById("open-sidebar-btn")?.addEventListener("click", openMobileSidebar);
  document.getElementById("close-sidebar-btn")?.addEventListener("click", closeMobileSidebar);
  document.getElementById("sidebar-backdrop")?.addEventListener("click", closeMobileSidebar);

  document.querySelectorAll(".sidebar-nav .nav-item[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateToPage(btn.dataset.page);
    });
  });

  document.getElementById("header-profile-btn")?.addEventListener("click", () => {
    navigateToPage("profile");
  });

  document.getElementById("sidebar-logout-btn")?.addEventListener("click", async () => {
    closeMobileSidebar();
    await logoutUser();
  });
}

function bootstrap() {
  attachImageFallbacks();
  initNotifications();
  initAuthUI();
  bindShellEvents();
  initHomeNavigation(navigateToPage);
  initAIAssistant(getCurrentUserProfile);
  initQuranFeature(getCurrentUserProfile);
  initGlobalChat(getCurrentUserProfile);
  initProfileEditor(getCurrentUserProfile);
  initPremiumSystem(getCurrentUserProfile, () => {
    refreshAIModesLockState();
  });

  const authView = document.getElementById("auth-view");
  const appShell = document.getElementById("app-shell");

  setGlobalLoading(true, "Memeriksa sesi pengguna...");

  onAuthStateChanged(auth, (user) => {
    if (unsubscribeUserDoc) {
      unsubscribeUserDoc();
      unsubscribeUserDoc = null;
    }

    if (!user) {
      currentUserProfile = null;
      dailyLoginCheckedForUid = null;
      stopCoinActivityTimer();
      stopGlobalChatListener();
      appShell?.classList.add("hidden");
      authView?.classList.remove("hidden");
      setGlobalLoading(false);
      return;
    }

    // Pengguna terautentikasi -> tampilkan Home & sinkronisasi Firestore
    authView?.classList.add("hidden");
    appShell?.classList.remove("hidden");
    navigateToPage("home");
    subscribeGlobalChat();
    startTwoMinuteActivityTracker(getCurrentUserProfile);

    unsubscribeUserDoc = onSnapshot(
      doc(db, "users", user.uid),
      async (docSnap) => {
        setGlobalLoading(false);
        if (!docSnap.exists()) return;

        currentUserProfile = { uid: user.uid, ...docSnap.data() };
        renderHomeProfile(currentUserProfile);
        populateEditProfileForm(currentUserProfile);
        refreshAIModesLockState();
        checkAutoShowPremiumModal(currentUserProfile);

        if (dailyLoginCheckedForUid !== user.uid) {
          dailyLoginCheckedForUid = user.uid;
          await checkDailyLoginCoin(currentUserProfile);
        }
      },
      (err) => {
        setGlobalLoading(false);
        console.error("User profile listener error:", err);
      }
    );
  });
}

document.addEventListener("DOMContentLoaded", bootstrap);
