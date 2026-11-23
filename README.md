# MATSASU BOT — INTELLIGENCE BEYOND LIMITS

Aplikasi web AI Assistant multifungsi tanpa backend server (Static Web App + Firebase Managed Services + Groq API) dengan desain **Premium Purple Anime Glassmorphism**.

## Struktur Folder
```text
MATSASU-BOT/
├── index.html
├── css/
│   ├── style.css
│   ├── animations.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── firebase-config.js
│   ├── auth.js
│   ├── home.js
│   ├── ai.js
│   ├── ai-config.js
│   ├── ai-modes.js
│   ├── quran.js
│   ├── global-chat.js
│   ├── profile.js
│   ├── premium.js
│   ├── coin.js
│   ├── notifications.js
│   └── utils.js
├── assets/
│   └── images/
│       ├── Gambar1.png
│       ├── Gambar2.png
│       ├── Gambar3.png
│       ├── Gambar4.png
│       ├── Gambar5.png
│       ├── Gambar6.png
│       └── Gambar7.png
├── firestore.rules
├── storage.rules
├── firebase.json
├── .gitignore
└── README.md
```

## Menambahkan Aset Gambar Manual
Letakkan ketujuh gambar Anda ke dalam `assets/images/` dengan nama persis:
- `Gambar1.png` — Hero Banner Home
- `Gambar2.png` — Background Login & Register
- `Gambar3.png` — Avatar AI Mascot
- `Gambar4.png` — Foto Profil Default
- `Gambar5.png` — Background Halaman Al-Qur'an
- `Gambar6.png` — Background Halaman Global Chat
- `Gambar7.png` — Chibi Mascot Greeting & Notifikasi

## Catatan Keamanan Arsitektur Tanpa Server
- **Groq API Key**: Karena aplikasi berjalan murni di sisi klien tanpa server pribadi, API key pada `js/ai-config.js` dapat dilihat melalui browser DevTools. Untuk deployment publik berskala besar, gunakan proxy serverless (Firebase Cloud Functions atau Cloudflare Workers).
- **Sistem Coin**: Validasi client-side dibatasi oleh Firestore Security Rules (`coins <= resource.data.coins + 1`), namun untuk hadiah finansial/kritis di produksi tetap disarankan menggunakan server-side Cloud Functions.
