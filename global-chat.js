import { auth, db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { DEFAULT_AVATAR_PATH, formatTime } from "./utils.js";
import { showNotification } from "./notifications.js";

let unsubscribeChat = null;
let lastSentTimestamp = 0;
let initialLoadDone = false;
let getUserProfileRef = () => null;

const SPAM_COOLDOWN_MS = 2000;
const MAX_MESSAGE_LENGTH = 500;

export function initGlobalChat(getUserProfileFn) {
  getUserProfileRef = getUserProfileFn;

  const form = document.getElementById("global-chat-form");
  const input = document.getElementById("global-chat-input");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawText = input.value.trim();
    if (!rawText) return;

    if (rawText.length > MAX_MESSAGE_LENGTH) {
      showNotification("Pesan Terlalu Panjang", "Maksimal 500 karakter per pesan.", "error");
      return;
    }

    const now = Date.now();
    if (now - lastSentTimestamp < SPAM_COOLDOWN_MS) {
      showNotification("Anti-Spam", "Tunggu 2 detik sebelum mengirim pesan berikutnya.", "error");
      return;
    }

    const currentUser = auth.currentUser;
    const profile = getUserProfileRef();
    if (!currentUser || !profile) {
      showNotification("Sesi Tidak Valid", "Silakan login ulang untuk mengirim pesan.", "error");
      return;
    }

    input.value = "";
    lastSentTimestamp = now;

    try {
      await addDoc(collection(db, "chats", "global", "messages"), {
        uid: currentUser.uid,
        username: profile.username || "Pengguna",
        photoURL: profile.photoURL || DEFAULT_AVATAR_PATH,
        role: profile.isPremium ? "PREMIUM" : profile.role || "MEMBER",
        text: rawText,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      showNotification("Gagal Mengirim", "Pesan tidak dapat dikirim ke Global Chat.", "error");
    }
  });
}

export function subscribeGlobalChat() {
  stopGlobalChatListener();
  initialLoadDone = false;

  const container = document.getElementById("global-chat-messages");
  if (!container) return;

  const q = query(
    collection(db, "chats", "global", "messages"),
    orderBy("createdAt", "asc"),
    limit(80)
  );

  unsubscribeChat = onSnapshot(
    q,
    (snapshot) => {
      const currentUid = auth.currentUser?.uid;
      container.innerHTML = "";

      if (snapshot.empty) {
        container.innerHTML = `<p class="empty-muted">Belum ada pesan di Global Chat. Jadilah yang pertama menyapa!</p>`;
        initialLoadDone = true;
        return;
      }

      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        const isOwn = msg.uid === currentUid;

        const row = document.createElement("div");
        row.className = `gchat-msg-row ${isOwn ? "own" : ""}`;

        const avatar = document.createElement("img");
        avatar.className = "gchat-avatar";
        avatar.src = msg.photoURL || DEFAULT_AVATAR_PATH;
        avatar.alt = msg.username || "User";

        const bubble = document.createElement("div");
        bubble.className = "gchat-bubble";

        const meta = document.createElement("div");
        meta.className = "gchat-meta";

        const userSpan = document.createElement("span");
        userSpan.className = "gchat-username";
        userSpan.textContent = msg.username || "Pengguna";

        const timeSpan = document.createElement("span");
        timeSpan.className = "gchat-time";
        timeSpan.textContent = formatTime(msg.createdAt);

        meta.appendChild(userSpan);
        meta.appendChild(timeSpan);

        // Proteksi XSS: gunakan textContent, bukan innerHTML untuk pesan pengguna
        const textDiv = document.createElement("div");
        textDiv.className = "gchat-text";
        textDiv.textContent = msg.text || "";

        bubble.appendChild(meta);
        bubble.appendChild(textDiv);
        row.appendChild(avatar);
        row.appendChild(bubble);
        container.appendChild(row);
      });

      if (initialLoadDone) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const addedMsg = change.doc.data();
            const chatPageActive = document.getElementById("page-chat")?.classList.contains("active");
            if (addedMsg.uid !== currentUid && !chatPageActive) {
              showNotification("Pesan Baru Global Chat", `${addedMsg.username}: ${addedMsg.text.slice(0, 60)}`, "info");
            }
          }
        });
      }

      initialLoadDone = true;
      container.scrollTop = container.scrollHeight;
    },
    (err) => {
      console.error("Global Chat snapshot error:", err);
    }
  );
}

export function stopGlobalChatListener() {
  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }
}
