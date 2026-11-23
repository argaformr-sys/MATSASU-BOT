import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from "./notifications.js";

// Menggunakan API resmi publik EQuran.id v2 (data Kemenag RI terpercaya)
const QURAN_API_BASE = "https://equran.id/api/v2";

let allSurahs = [];
let currentSurahNumber = 1;
let arabicFontSize = 28;
let savedBookmarksMap = new Map();
let getUserProfileRef = () => null;

export async function initQuranFeature(getUserProfileFn) {
  getUserProfileRef = getUserProfileFn;

  const searchInput = document.getElementById("quran-search-input");
  const backBtn = document.getElementById("quran-back-btn");
  const prevBtn = document.getElementById("prev-surah-btn");
  const nextBtn = document.getElementById("next-surah-btn");
  const jumpSelect = document.getElementById("ayah-jump-select");
  const decFontBtn = document.getElementById("arabic-font-dec");
  const incFontBtn = document.getElementById("arabic-font-inc");
  const bookmarksBtn = document.getElementById("quran-bookmarks-btn");
  const closeBookmarksBtn = document.getElementById("close-bookmarks-btn");

  searchInput?.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = allSurahs.filter(
      (s) =>
        s.namaLatin.toLowerCase().includes(q) ||
        s.arti.toLowerCase().includes(q) ||
        String(s.nomor) === q
    );
    renderSurahGrid(filtered);
  });

  backBtn?.addEventListener("click", showSurahListView);

  prevBtn?.addEventListener("click", () => {
    if (currentSurahNumber > 1) {
      openSurahReader(currentSurahNumber - 1);
    }
  });

  nextBtn?.addEventListener("click", () => {
    if (currentSurahNumber < 114) {
      openSurahReader(currentSurahNumber + 1);
    }
  });

  jumpSelect?.addEventListener("change", () => {
    const ayahNum = jumpSelect.value;
    if (!ayahNum) return;
    const el = document.getElementById(`ayah-item-${ayahNum}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  decFontBtn?.addEventListener("click", () => {
    arabicFontSize = Math.max(20, arabicFontSize - 2);
    applyArabicFontSize();
  });

  incFontBtn?.addEventListener("click", () => {
    arabicFontSize = Math.min(44, arabicFontSize + 2);
    applyArabicFontSize();
  });

  bookmarksBtn?.addEventListener("click", async () => {
    await loadUserBookmarks();
    renderBookmarksView();
  });

  closeBookmarksBtn?.addEventListener("click", showSurahListView);

  await fetchSurahList();
}

export async function loadUserBookmarks() {
  const profile = getUserProfileRef();
  savedBookmarksMap.clear();
  if (!profile?.uid) return;

  try {
    const snap = await getDocs(collection(db, "bookmarks", profile.uid, "verses"));
    snap.forEach((docSnap) => {
      savedBookmarksMap.set(docSnap.id, docSnap.data());
    });
  } catch (err) {
    console.error("Error loading Quran bookmarks:", err);
  }
}

async function fetchSurahList() {
  const grid = document.getElementById("quran-surah-list-view");
  if (!grid) return;

  grid.innerHTML = `<p class="empty-muted">Memuat 114 Surah Al-Qur'an...</p>`;
  try {
    const res = await fetch(`${QURAN_API_BASE}/surat`);
    if (!res.ok) throw new Error("Gagal mengambil daftar surah.");
    const json = await res.json();
    allSurahs = json.data || [];
    renderSurahGrid(allSurahs);
  } catch (err) {
    grid.innerHTML = `<p class="empty-muted">Gagal memuat daftar surah. Periksa koneksi internet Anda.</p>`;
  }
}

function renderSurahGrid(list) {
  const grid = document.getElementById("quran-surah-list-view");
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<p class="empty-muted">Surah tidak ditemukan.</p>`;
    return;
  }

  grid.innerHTML = "";
  list.forEach((surah) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "surah-card";

    card.innerHTML = `
      <div class="surah-left">
        <div class="surah-num-badge">${surah.nomor}</div>
        <div>
          <div class="surah-latin">${surah.namaLatin}</div>
          <div class="surah-meta">${surah.arti} • ${surah.jumlahAyat} Ayat</div>
        </div>
      </div>
      <div class="surah-arabic-name">${surah.nama}</div>
    `;

    card.addEventListener("click", () => openSurahReader(surah.nomor));
    grid.appendChild(card);
  });
}

function showSurahListView() {
  document.getElementById("quran-surah-list-view")?.classList.remove("hidden");
  document.getElementById("quran-reader-view")?.classList.add("hidden");
  document.getElementById("quran-bookmarks-view")?.classList.add("hidden");
}

async function openSurahReader(surahNumber) {
  currentSurahNumber = surahNumber;
  document.getElementById("quran-surah-list-view")?.classList.add("hidden");
  document.getElementById("quran-bookmarks-view")?.classList.add("hidden");
  const readerView = document.getElementById("quran-reader-view");
  const ayahListEl = document.getElementById("quran-ayah-list");
  readerView?.classList.remove("hidden");

  if (ayahListEl) {
    ayahListEl.innerHTML = `<p class="empty-muted">Memuat ayat surah ke-${surahNumber}...</p>`;
  }

  await loadUserBookmarks();

  try {
    const res = await fetch(`${QURAN_API_BASE}/surat/${surahNumber}`);
    if (!res.ok) throw new Error("Gagal memuat isi surah.");
    const json = await res.json();
    const surah = json.data;

    document.getElementById("reader-surah-title").textContent = `${surah.nomor}. ${surah.namaLatin} (${surah.nama})`;
    document.getElementById("reader-surah-subtitle").textContent = `${surah.arti} • ${surah.jumlahAyat} Ayat • ${surah.tempatTurun}`;

    const bismillah = document.getElementById("bismillah-banner");
    if (bismillah) {
      bismillah.classList.toggle("hidden", surah.nomor === 1 || surah.nomor === 9);
    }

    const prevBtn = document.getElementById("prev-surah-btn");
    const nextBtn = document.getElementById("next-surah-btn");
    if (prevBtn) prevBtn.disabled = surah.nomor <= 1;
    if (nextBtn) nextBtn.disabled = surah.nomor >= 114;

    const jumpSelect = document.getElementById("ayah-jump-select");
    if (jumpSelect) {
      jumpSelect.innerHTML = `<option value="">Lompat Ayat...</option>`;
      surah.ayat.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.nomorAyat;
        opt.textContent = `Ayat ${a.nomorAyat}`;
        jumpSelect.appendChild(opt);
      });
    }

    ayahListEl.innerHTML = "";
    surah.ayat.forEach((ayah) => {
      const verseKey = `${surah.nomor}_${ayah.nomorAyat}`;
      const isBookmarked = savedBookmarksMap.has(verseKey);

      const card = document.createElement("div");
      card.className = "ayah-card";
      card.id = `ayah-item-${ayah.nomorAyat}`;

      const top = document.createElement("div");
      top.className = "ayah-card-top";

      const numPill = document.createElement("span");
      numPill.className = "ayah-number-pill";
      numPill.textContent = `${surah.namaLatin} : ${ayah.nomorAyat}`;

      const bmBtn = document.createElement("button");
      bmBtn.type = "button";
      bmBtn.className = `btn-secondary btn-sm bookmark-btn ${isBookmarked ? "saved" : ""}`;
      bmBtn.textContent = isBookmarked ? "Tersimpan" : "Bookmark";
      bmBtn.addEventListener("click", () => toggleBookmark(surah, ayah, bmBtn));

      top.appendChild(numPill);
      top.appendChild(bmBtn);

      const arabicDiv = document.createElement("div");
      arabicDiv.className = "ayah-arabic-text";
      arabicDiv.style.fontSize = `${arabicFontSize}px`;
      arabicDiv.textContent = ayah.teksArab;

      const transDiv = document.createElement("div");
      transDiv.className = "ayah-translation-text";
      transDiv.textContent = ayah.teksIndonesia;

      card.appendChild(top);
      card.appendChild(arabicDiv);
      card.appendChild(transDiv);
      ayahListEl.appendChild(card);
    });
  } catch (err) {
    if (ayahListEl) {
      ayahListEl.innerHTML = `<p class="empty-muted">Terjadi kesalahan saat memuat ayat.</p>`;
    }
  }
}

async function toggleBookmark(surah, ayah, btnEl) {
  const profile = getUserProfileRef();
  if (!profile?.uid) return;

  const verseKey = `${surah.nomor}_${ayah.nomorAyat}`;
  const docRef = doc(db, "bookmarks", profile.uid, "verses", verseKey);

  try {
    if (savedBookmarksMap.has(verseKey)) {
      await deleteDoc(docRef);
      savedBookmarksMap.delete(verseKey);
      btnEl.classList.remove("saved");
      btnEl.textContent = "Bookmark";
      showNotification("Bookmark Dihapus", `${surah.namaLatin} ayat ${ayah.nomorAyat} dihapus.`, "info");
    } else {
      const payload = {
        surahNumber: surah.nomor,
        surahName: surah.namaLatin,
        ayahNumber: ayah.nomorAyat,
        teksArab: ayah.teksArab,
        teksIndonesia: ayah.teksIndonesia,
        createdAt: serverTimestamp()
      };
      await setDoc(docRef, payload);
      savedBookmarksMap.set(verseKey, payload);
      btnEl.classList.add("saved");
      btnEl.textContent = "Tersimpan";
      showNotification("Ayat Disimpan", `${surah.namaLatin} ayat ${ayah.nomorAyat} ditambahkan ke bookmark.`, "success");
    }
  } catch (err) {
    showNotification("Gagal", "Tidak dapat memperbarui bookmark ayat.", "error");
  }
}

function renderBookmarksView() {
  document.getElementById("quran-surah-list-view")?.classList.add("hidden");
  document.getElementById("quran-reader-view")?.classList.add("hidden");
  const bmView = document.getElementById("quran-bookmarks-view");
  const listEl = document.getElementById("quran-bookmarks-list");
  bmView?.classList.remove("hidden");

  if (!listEl) return;
  if (savedBookmarksMap.size === 0) {
    listEl.innerHTML = `<p class="empty-muted">Belum ada ayat yang ditandai.</p>`;
    return;
  }

  listEl.innerHTML = "";
  savedBookmarksMap.forEach((item) => {
    const card = document.createElement("div");
    card.className = "ayah-card";

    const top = document.createElement("div");
    top.className = "ayah-card-top";

    const pill = document.createElement("span");
    pill.className = "ayah-number-pill";
    pill.textContent = `${item.surahName} : Ayat ${item.ayahNumber}`;

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn-secondary btn-sm";
    openBtn.textContent = "Buka Surah";
    openBtn.addEventListener("click", () => openSurahReader(item.surahNumber));

    top.appendChild(pill);
    top.appendChild(openBtn);

    const arabic = document.createElement("div");
    arabic.className = "ayah-arabic-text";
    arabic.style.fontSize = `${arabicFontSize}px`;
    arabic.textContent = item.teksArab;

    const trans = document.createElement("div");
    trans.className = "ayah-translation-text";
    trans.textContent = item.teksIndonesia;

    card.appendChild(top);
    card.appendChild(arabic);
    card.appendChild(trans);
    listEl.appendChild(card);
  });
}

function applyArabicFontSize() {
  const label = document.getElementById("arabic-font-label");
  if (label) label.textContent = `${arabicFontSize}px`;
  document.querySelectorAll(".ayah-arabic-text").forEach((el) => {
    el.style.fontSize = `${arabicFontSize}px`;
  });
}
