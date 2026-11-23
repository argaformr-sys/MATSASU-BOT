import { auth, db, storage } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { updateEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  DEFAULT_AVATAR_PATH,
  validateUsername,
  normalizeUsername,
  usernameToInternalEmail,
  setGlobalLoading
} from "./utils.js";
import { showNotification } from "./notifications.js";

let selectedPhotoFile = null;
let getUserProfileRef = () => null;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export function initProfileEditor(getUserProfileFn) {
  getUserProfileRef = getUserProfileFn;

  const photoInput = document.getElementById("profile-photo-input");
  const previewImg = document.getElementById("edit-avatar-preview");
  const form = document.getElementById("edit-profile-form");

  photoInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showNotification("Format Tidak Didukung", "Gunakan gambar berformat JPG, PNG, atau WEBP.", "error");
      photoInput.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showNotification("Ukuran Terlalu Besar", "Ukuran foto profil maksimal 2MB.", "error");
      photoInput.value = "";
      return;
    }

    selectedPhotoFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (previewImg && ev.target?.result) {
        previewImg.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  });

  form?.addEventListener("submit", handleSaveProfile);
}

export function populateEditProfileForm(profile) {
  if (!profile) return;
  selectedPhotoFile = null;

  const previewImg = document.getElementById("edit-avatar-preview");
  const displayName = document.getElementById("edit-display-name");
  const usernameInput = document.getElementById("edit-username");
  const genderSelect = document.getElementById("edit-gender");
  const classInput = document.getElementById("edit-class");
  const premStatus = document.getElementById("edit-premium-status");
  const roleStatus = document.getElementById("edit-role-status");

  if (previewImg) previewImg.src = profile.photoURL || DEFAULT_AVATAR_PATH;
  if (displayName) displayName.textContent = profile.username || "Username";
  if (usernameInput) usernameInput.value = profile.username || "";
  if (genderSelect) genderSelect.value = profile.gender || "Laki-laki";
  if (classInput) classInput.value = profile.userClass || "";

  const isPremium = Boolean(profile.isPremium);
  const role = String(profile.role || "MEMBER").toUpperCase();

  if (premStatus) {
    premStatus.textContent = isPremium ? "PREMIUM" : "STANDARD";
    premStatus.className = `status-pill ${isPremium ? "premium" : "standard"}`;
  }

  if (roleStatus) {
    roleStatus.textContent = role;
    roleStatus.className = `role-badge ${role.toLowerCase()}`;
  }
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const profile = getUserProfileRef();
  const currentUser = auth.currentUser;
  if (!profile || !currentUser) return;

  const newUsernameRaw = document.getElementById("edit-username").value;
  const newGender = document.getElementById("edit-gender").value;
  const newClass = document.getElementById("edit-class").value.trim();

  const uCheck = validateUsername(newUsernameRaw);
  if (!uCheck.valid) {
    showNotification("Validasi Gagal", uCheck.message, "error");
    return;
  }

  if (newGender !== "Laki-laki" && newGender !== "Perempuan") {
    showNotification("Validasi Gagal", "Pilih jenis kelamin yang valid.", "error");
    return;
  }

  if (newClass.length < 1 || newClass.length > 30) {
    showNotification("Validasi Gagal", "Kelas wajib diisi (maksimal 30 karakter).", "error");
    return;
  }

  const oldNorm = normalizeUsername(profile.username);
  const newNorm = normalizeUsername(uCheck.value);

  setGlobalLoading(true, "Menyimpan perubahan profil...");
  try {
    // Jika username berubah, cek keunikan & perbarui mapping
    if (oldNorm !== newNorm) {
      const newUsernameRef = doc(db, "usernames", newNorm);
      const snap = await getDoc(newUsernameRef);
      if (snap.exists()) {
        setGlobalLoading(false);
        showNotification("Username Sudah Dipakai", "Pilih username lain yang masih tersedia.", "error");
        return;
      }

      await updateEmail(currentUser, usernameToInternalEmail(uCheck.value));
      await setDoc(newUsernameRef, {
        uid: currentUser.uid,
        username: uCheck.value,
        createdAt: serverTimestamp()
      });
      if (oldNorm) {
        await deleteDoc(doc(db, "usernames", oldNorm)).catch(() => {});
      }
    }

    let photoURL = profile.photoURL || DEFAULT_AVATAR_PATH;

    // Upload foto ke Firebase Storage jika user memilih gambar baru
    if (selectedPhotoFile) {
      const ext = selectedPhotoFile.type.split("/")[1] || "png";
      const storageRef = ref(storage, `avatars/${currentUser.uid}/profile_${Date.now()}.${ext}`);
      await uploadBytes(storageRef, selectedPhotoFile, { contentType: selectedPhotoFile.type });
      photoURL = await getDownloadURL(storageRef);
    }

    await updateDoc(doc(db, "users", currentUser.uid), {
      username: uCheck.value,
      usernameLower: newNorm,
      gender: newGender,
      userClass: newClass,
      photoURL,
      updatedAt: serverTimestamp()
    });

    selectedPhotoFile = null;
    showNotification("Profil Diperbarui", "Perubahan profil berhasil disimpan.", "success");
  } catch (err) {
    let msg = "Gagal menyimpan perubahan profil.";
    if (err.code === "auth/requires-recent-login") {
      msg = "Untuk mengganti username, silakan logout lalu login kembali terlebih dahulu.";
    }
    showNotification("Gagal", msg, "error");
  } finally {
    setGlobalLoading(false);
  }
}
