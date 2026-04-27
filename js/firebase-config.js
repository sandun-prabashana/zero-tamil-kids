// ═══════════════════════════════════════════════════════════
//  ZERO TAMIL Kids — Firebase Configuration
//  Project: zero-tamil-kids
//  Configured: 2026-04-27
// ═══════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "AIzaSyA7YG0tG1RWPvj1SfaYLCF9HqjC0cznVQg",
  authDomain:        "zero-tamil-kids.firebaseapp.com",
  projectId:         "zero-tamil-kids",
  storageBucket:     "zero-tamil-kids.firebasestorage.app",
  messagingSenderId: "308809011598",
  appId:             "1:308809011598:web:420e5a3adb63ff5ecf54df"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const db   = firebase.firestore();
const auth = firebase.auth();
