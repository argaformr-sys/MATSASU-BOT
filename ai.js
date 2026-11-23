import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { GROQ_ENDPOINT, GROQ_API_KEY } from "./ai-config.js";
import { AI_MODES } from "./ai-modes.js";
import { AI_MASCOT_PATH, DEFAULT_AVATAR_PATH, renderSafeMarkdown, escapeHTML } from "./utils.js";
import { showNotification } from "./notifications.js";

let currentModeKey = "CULTUR";
let conversationMessages = [];
let isGenerating = false;
let getUserProfileRef = () => null;

export function initAIAssistant(getUserProfileFn) {
  getUserProfileRef = getUserProfileFn;
  renderModeSelector();
  renderConversation();

  const form = document.getElementById("ai-chat-form");
  const input = document.getElementById("ai-prompt-input");
  const clearBtn = document.getElementById("ai-clear-chat-btn");
  const newBtn = document.getElementById("ai-new-chat-btn");
  const historyToggleBtn = document.getElementById("ai-history-toggle-btn");
  const closeHistoryBtn = document.getElementById("close-ai-history-btn");

  // Auto-resize textarea
  input?.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  });

  // Enter untuk kirim, Shift+Enter untuk baris baru
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form?.requestSubmit();
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const promptText = input.value.trim();
    if (!promptText || isGenerating) return;
    input.value = "";
    input.style.height = "auto";
    await sendPromptToGroq(promptText);
  });

  clearBtn?.addEventListener("click", () => {
    conversationMessages = [];
    renderConversation();
    showNotification("Percakapan Dihapus", "Layar percakapan AI telah dibersihkan.", "info");
  });

  newBtn?.addEventListener("click", () => {
    conversationMessages = [];
    renderConversation();
  });

  historyToggleBtn?.addEventListener("click", async () => {
    const drawer = document.getElementById("ai-history-drawer");
    drawer?.classList.toggle("hidden");
    if (!drawer?.classList.contains("hidden")) {
      await loadAIHistoryList();
    }
  });

  closeHistoryBtn?.addEventListener("click", () => {
    document.getElementById("ai-history-drawer")?.classList.add("hidden");
  });
}

export function refreshAIModesLockState() {
  const profile = getUserProfileRef();
  const mode = AI_MODES[currentModeKey];
  if (mode?.premiumOnly && !profile?.isPremium) {
    currentModeKey = "CULTUR";
  }
  renderModeSelector();
}

function renderModeSelector() {
  const container = document.getElementById("ai-modes-bar");
  if (!container) return;

  const profile = getUserProfileRef();
  const isPremium = Boolean(profile?.isPremium);
  container.innerHTML = "";

  Object.values(AI_MODES).forEach((mode) => {
    const locked = mode.premiumOnly && !isPremium;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ai-mode-card ${currentModeKey === mode.id ? "active" : ""} ${locked ? "locked" : ""}`;

    const top = document.createElement("div");
    top.className = "mode-card-top";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = mode.name;
    top.appendChild(nameSpan);

    if (mode.premiumOnly) {
      const tag = document.createElement("span");
      tag.className = "mode-tag-prem";
      tag.textContent = locked ? "LOCKED" : "PREMIUM";
      top.appendChild(tag);
    }

    const sub = document.createElement("span");
    sub.className = "mode-card-sub";
    sub.textContent = mode.shortTitle;

    btn.appendChild(top);
    btn.appendChild(sub);

    btn.addEventListener("click", () => {
      if (locked) {
        showNotification(
          "Mode Premium Terkunci",
          `Mode ${mode.name} memerlukan MATSASU PREMIUM (7 Coin).`,
          "error"
        );
        return;
      }
      currentModeKey = mode.id;
      updateActiveModeHeader();
      renderModeSelector();
    });

    container.appendChild(btn);
  });

  updateActiveModeHeader();
}

function updateActiveModeHeader() {
  const mode = AI_MODES[currentModeKey] || AI_MODES.CULTUR;
  const badge = document.getElementById("ai-active-mode-badge");
  const desc = document.getElementById("ai-mode-desc");
  if (badge) badge.textContent = mode.name;
  if (desc) desc.textContent = mode.description;
}

async function sendPromptToGroq(userText, isRegenerate = false) {
  const profile = getUserProfileRef();
  const mode = AI_MODES[currentModeKey] || AI_MODES.CULTUR;

  if (mode.premiumOnly && !profile?.isPremium) {
    showNotification("Akses Ditolak", "Aktifkan MATSASU PREMIUM untuk memakai mode ini.", "error");
    return;
  }

  if (!isRegenerate) {
    conversationMessages.push({ role: "user", content: userText });
  }

  renderConversation();
  setGeneratingState(true);

  const apiMessages = [
    { role: "system", content: mode.systemInstruction },
    ...conversationMessages.slice(-12).map((m) => ({
      role: m.role,
      content: m.content
    }))
  ];

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: mode.model,
        messages: apiMessages,
        temperature: mode.temperature,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("Respons kosong dari layanan Groq AI.");
    }

    conversationMessages.push({
      role: "assistant",
      content: reply,
      mode: mode.name
    });

    renderConversation();
    await saveConversationToFirestore(userText, reply, mode.name);
  } catch (err) {
    showNotification("AI Error", err.message || "Gagal berkomunikasi dengan Groq API.", "error");
  } finally {
    setGeneratingState(false);
  }
}

function setGeneratingState(loading) {
  isGenerating = loading;
  const thinkingBar = document.getElementById("ai-thinking-bar");
  const sendBtn = document.getElementById("ai-send-btn");
  thinkingBar?.classList.toggle("hidden", !loading);
  if (sendBtn) sendBtn.disabled = loading;
}

function renderConversation() {
  const container = document.getElementById("ai-messages-container");
  if (!container) return;

  const profile = getUserProfileRef();
  const userAvatar = profile?.photoURL || DEFAULT_AVATAR_PATH;

  if (conversationMessages.length === 0) {
    container.innerHTML = `
      <div class="ai-empty-state">
        <img src="${AI_MASCOT_PATH}" alt="MATSASU AI" />
        <h4>MATSASU AI Siap Membantu</h4>
        <p>Pilih mode spesialis di atas (CULTUR, FEXA, ROBI, atau mode Premium HARIRI &amp; SONNET) lalu ajukan pertanyaan atau kode Anda.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  conversationMessages.forEach((msg, index) => {
    const isUser = msg.role === "user";
    const turn = document.createElement("div");
    turn.className = `chat-turn ${isUser ? "user" : "ai"}`;

    const avatar = document.createElement("img");
    avatar.className = "turn-avatar";
    avatar.src = isUser ? userAvatar : AI_MASCOT_PATH;
    avatar.alt = isUser ? "User" : "MATSASU AI";

    const bubble = document.createElement("div");
    bubble.className = "turn-bubble";

    if (isUser) {
      bubble.innerHTML = `<p>${escapeHTML(msg.content).replace(/\n/g, "<br>")}</p>`;
    } else {
      const mdDiv = document.createElement("div");
      mdDiv.className = "markdown-body";
      mdDiv.innerHTML = renderSafeMarkdown(msg.content);
      bubble.appendChild(mdDiv);

      const footer = document.createElement("div");
      footer.className = "bubble-footer-actions";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "bubble-action-btn";
      copyBtn.textContent = "Salin Jawaban";
      copyBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(msg.content);
        showNotification("Disalin", "Jawaban AI disalin ke clipboard.", "success");
      });
      footer.appendChild(copyBtn);

      if (index === conversationMessages.length - 1) {
        const regenBtn = document.createElement("button");
        regenBtn.type = "button";
        regenBtn.className = "bubble-action-btn";
        regenBtn.textContent = "Regenerate";
        regenBtn.addEventListener("click", async () => {
          if (isGenerating) return;
          conversationMessages.pop();
          const lastUserMsg = [...conversationMessages].reverse().find((m) => m.role === "user");
          if (lastUserMsg) {
            await sendPromptToGroq(lastUserMsg.content, true);
          }
        });
        footer.appendChild(regenBtn);
      }

      bubble.appendChild(footer);
    }

    turn.appendChild(avatar);
    turn.appendChild(bubble);
    container.appendChild(turn);
  });

  if (window.hljs) {
    container.querySelectorAll("pre code").forEach((block) => {
      window.hljs.highlightElement(block);
    });
  }

  container.scrollTop = container.scrollHeight;
}

async function saveConversationToFirestore(promptText, replyText, modeName) {
  const profile = getUserProfileRef();
  if (!profile?.uid) return;

  try {
    const colRef = collection(db, "ai_history", profile.uid, "conversations");
    await addDoc(colRef, {
      mode: modeName,
      prompt: promptText.slice(0, 1000),
      reply: replyText.slice(0, 4000),
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Gagal menyimpan riwayat AI:", err);
  }
}

async function loadAIHistoryList() {
  const listEl = document.getElementById("ai-history-list");
  const profile = getUserProfileRef();
  if (!listEl || !profile?.uid) return;

  listEl.innerHTML = `<p class="empty-muted">Memuat riwayat...</p>`;
  try {
    const q = query(
      collection(db, "ai_history", profile.uid, "conversations"),
      orderBy("createdAt", "desc"),
      limit(15)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      listEl.innerHTML = `<p class="empty-muted">Belum ada riwayat tersimpan.</p>`;
      return;
    }

    listEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item-btn";

      const title = document.createElement("strong");
      title.textContent = data.prompt || "Percakapan";

      const meta = document.createElement("span");
      meta.textContent = `Mode: ${data.mode || "AI"}`;

      btn.appendChild(title);
      btn.appendChild(meta);
      btn.addEventListener("click", () => {
        conversationMessages = [
          { role: "user", content: data.prompt },
          { role: "assistant", content: data.reply, mode: data.mode }
        ];
        renderConversation();
        document.getElementById("ai-history-drawer")?.classList.add("hidden");
      });
      listEl.appendChild(btn);
    });
  } catch (err) {
    listEl.innerHTML = `<p class="empty-muted">Gagal memuat riwayat.</p>`;
  }
}
