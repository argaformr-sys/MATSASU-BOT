// Firebase Modular SDK v10.12.2 via Official Google CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNCKeHDpHTYLnMYiEmjDFZ7u7zFkXl0P8",
  authDomain: "by-argal.firebaseapp.com",
  projectId: "by-argal",
  storageBucket: "by-argal.firebasestorage.app",
  messagingSenderId: "146678861936",
  appId: "1:146678861936:web:aebf0fd5d63d63f16164b5",
  measurementId: "G-WK7CKKG6WN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
