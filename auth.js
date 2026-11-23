import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  validateUsername,
  validatePassword,
  normalizeUsername,
  usernameToInternalEmail,
  DEFAULT_AVATAR_PATH,
  setGlobalLoading
} from "./utils.js";
import { showNotification } from "./notifications.js";

export function initAuthUI() {
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const switchToReg = document.getElementById("switch-to-register");

  const activateTab = (mode) => {
    const isLogin = mode === "login";
    tabLogin?.classList.toggle("active", isLogin);
    tabRegister?.classList.toggle("active", !isLogin);
    loginForm?.classList.toggle("hidden", !isLogin);
    registerForm?.classList.toggle("hidden", isLogin);
  };

  tabLogin?.addEventListener("click", () => activateTab("login"));
  tabRegister?.addEventListener("click", () => activateTab("register"));
  switchToReg?.addEventListener("click", () => activateTab("register"));

  document.querySelectorAll(".toggle-pass-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.type = target.type === "password" ? "text" : "password";
    });
  });

  loginForm?.addEventListener("submit", handleLogin);
  registerForm?.addEventListener("submit", handleRegister);
}

async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("login-username").value;
  const passwordInput = document.getElementById("login-password").value;

  const uCheck = validateUsername(usernameInput);
  if (!uCheck.valid) {
    showNotification("Validasi Gagal", uCheck.message, "error");
    return;
  }

  const pCheck = validatePassword(passwordInput);
  if (!pCheck.valid) {
    showNotification("Validasi Gagal", pCheck.message, "error");
    return;
  }

  setGlobalLoading(true, "Memverifikasi akun...");
  try {
    await setPersistence(auth, browserLocalPersistence);
    const email = usernameToInternalEmail(uCheck.value);
    await signInWithEmailAndPassword(auth, email, pCheck.value);
    showNotification("Login Berhasil", `Selamat datang kembali, ${uCheck.value}.`, "welcome");
  } catch (err) {
    let msg = "Username atau password tidak valid.";
    if (err.code === "auth/too-many-requests") {
      msg = "Terlalu banyak percobaan login. Silakan tunggu beberapa saat.";
    } else if (err.code === "auth/network-request-failed") {
      msg = "Gagal terhubung ke server autentikasi.";
    }
    showNotification("Login Gagal", msg, "error");
  } finally {
    setGlobalLoading(false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const usernameRaw = document.getElementById("reg-username").value;
  const passwordRaw = document.getElementById("reg-password").value;
  const gender = document.getElementById("reg-gender").value.trim();
  const userClass = document.getElementById("reg-class").value.trim();

  const uCheck = validateUsername(usernameRaw);
  if (!uCheck.valid) {
    showNotification("Validasi Gagal", uCheck.message, "error");
    return;
  }

  const pCheck = validatePassword(passwordRaw);
  if (!pCheck.valid) {
    showNotification("Validasi Gagal", pCheck.message, "error");
    return;
  }

  if (gender !== "Laki-laki" && gender !== "Perempuan") {
    showNotification("Validasi Gagal", "Silakan pilih jenis kelamin yang valid.", "error");
    return;
  }

  if (userClass.length < 1 || userClass.length > 30) {
    showNotification("Validasi Gagal", "Kelas wajib diisi (maksimal 30 karakter).", "error");
    return;
  }

  const normUsername = normalizeUsername(uCheck.value);
  setGlobalLoading(true, "Memeriksa ketersediaan username...");

  try {
    // Cek keunikan username pada koleksi usernames
    const usernameRef = doc(db, "usernames", normUsername);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      setGlobalLoading(false);
      showNotification("Username Terdaftar", "Username tersebut sudah digunakan pengguna lain.", "error");
      return;
    }

    await setPersistence(auth, browserLocalPersistence);
    const email = usernameToInternalEmail(uCheck.value);
    const cred = await createUserWithEmailAndPassword(auth, email, pCheck.value);
    const uid = cred.user.uid;

    // Reservasi username unik
    await setDoc(usernameRef, {
      uid,
      username: uCheck.value,
      createdAt: serverTimestamp()
    });

    // Simpan profil pengguna (tanpa menyimpan password mentah)
    await setDoc(doc(db, "users", uid), {
      uid,
      username: uCheck.value,
      usernameLower: normUsername,
      gender,
      userClass,
      photoURL: DEFAULT_AVATAR_PATH,
      coins: 0,
      isPremium: false,
      role: "MEMBER",
      lastDailyCoinDate: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    showNotification("Register Berhasil", `Akun ${uCheck.value} siap digunakan.`, "welcome");
  } catch (err) {
    let msg = "Gagal membuat akun baru.";
    if (err.code === "auth/email-already-in-use") {
      msg = "Username sudah terdaftar di sistem.";
    } else if (err.code === "auth/weak-password") {
      msg = "Password terlalu lemah. Gunakan minimal 8 karakter.";
    }
    showNotification("Register Gagal", msg, "error");
  } finally {
    setGlobalLoading(false);
  }
}

export async function logoutUser() {
  setGlobalLoading(true, "Keluar dari sesi...");
  try {
    await signOut(auth);
    showNotification("Logout Berhasil", "Anda telah keluar dari MATSASU BOT.", "info");
  } catch (err) {
    showNotification("Error", "Gagal melakukan logout.", "error");
  } finally {
    setGlobalLoading(false);
  }
}
