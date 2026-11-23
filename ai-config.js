// =========================================================
// GROQ API CONFIGURATION
// CATATAN KEAMANAN: Karena aplikasi ini berjalan tanpa backend server (static frontend),
// API key yang ditanam di sisi klien dapat dilihat melalui DevTools browser.
// Untuk skala produksi publik yang ketat, gunakan serverless proxy (Cloudflare Workers / Firebase Functions).
// =========================================================

export const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_API_KEY = "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";

// Model ID Groq aktif dan valid
export const GROQ_MODELS = {
  STANDARD_FAST: "llama-3.1-8b-instant",
  STANDARD_VERSATILE: "llama-3.3-70b-versatile",
  PREMIUM_REASONING: "llama-3.3-70b-versatile"
};
