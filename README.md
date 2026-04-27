# 🎓 ZERO TAMIL Kids — Class Fee Management System

A beautiful, offline-capable web application for managing Tamil class students and monthly fee payments.

**Hosted on:** GitHub Pages | **Backend:** Firebase Firestore + Auth

---

## 🚀 Step-by-Step Setup Guide

### Step 1 — Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → Name it `zero-tamil-kids` → Continue
3. Disable Google Analytics (not needed) → **Create project**

---

### Step 2 — Enable Firestore Database

1. In your Firebase project, click **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Choose **"Start in production mode"** → Next
4. Select a location (e.g. `asia-south1`) → **Done**
5. Go to the **Rules** tab and replace rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Click **Publish**

---

### Step 3 — Enable Email/Password Authentication

1. Click **"Authentication"** in the left menu
2. Click **"Get started"**
3. Under **"Sign-in method"**, click **"Email/Password"** → Enable it → **Save**
4. Go to the **"Users"** tab → Click **"Add user"**
5. Enter your wife's email and a strong password → **Add user**
   - ⚠️ Remember this email and password — this is the login!

---

### Step 4 — Get Firebase Config

1. Click the ⚙️ **gear icon** → **"Project settings"**
2. Scroll down to **"Your apps"** → Click **"</> Web"**
3. Register app name: `zero-tamil-kids-web` → **Register app**
4. You'll see a `firebaseConfig` object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "zero-tamil-kids.firebaseapp.com",
  projectId: "zero-tamil-kids",
  storageBucket: "zero-tamil-kids.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

### Step 5 — Update Your App Config

Open the file **`js/firebase-config.js`** in the project folder and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey:            "YOUR_REAL_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_REAL_SENDER_ID",
  appId:             "YOUR_REAL_APP_ID"
};
```

---

### Step 6 — Deploy to GitHub Pages

1. Create a GitHub account at [https://github.com](https://github.com) if you don't have one
2. Create a new **public repository** named `zero-tamil-kids`
3. Upload all files from `c:\Projects\ZERO\` to the repository
4. Go to the repo → **Settings** → **Pages** (left sidebar)
5. Under **"Source"**, select **Branch: main** → **/(root)** → **Save**
6. Wait 2 minutes → your site will be live at:
   `https://YOUR_USERNAME.github.io/zero-tamil-kids/`

7. **IMPORTANT:** Go back to Firebase Console → **Authentication** → **Settings** → **Authorized domains** → Add your GitHub Pages domain:
   `YOUR_USERNAME.github.io`

---

## 📱 App Features

| Page | What it does |
|---|---|
| 🔐 Login | Secure email + password login |
| 📊 Dashboard | Overview: total students, paid/unpaid count, monthly collection stats |
| 👩‍🎓 Students | Add, edit, delete students with name, grade (1-10), monthly fee |
| 💰 Fee Tracker | Mark each student as Paid/Unpaid for any month, view collection rate |

---

## 📂 File Structure

```
ZERO/
├── index.html          ← Login page
├── dashboard.html      ← Dashboard
├── students.html       ← Student management
├── fees.html           ← Monthly fee tracker
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── firebase-config.js  ← 🔑 YOUR CONFIG GOES HERE
│   ├── auth.js             ← Auth + helper functions
│   ├── dashboard.js        ← Dashboard logic
│   ├── students.js         ← Student CRUD logic
│   └── fees.js             ← Fee tracking logic
└── README.md
```

---

## 🛡️ Firestore Data Structure

```
/students/{studentId}
  name:        "Anika Raj"
  grade:       3
  monthlyFee:  2500
  contact:     "0771234567"
  notes:       ""
  joinDate:    Timestamp
  createdAt:   Timestamp

/fees/{studentId_YYYY-MM}
  studentId:   "abc123"
  month:       "2025-04"
  status:      "paid"
  amount:      2500
  paidDate:    Timestamp
  updatedAt:   Timestamp
```

---

## ❓ Need Help?

If you get stuck, check:
- Firebase Console errors under **"Usage"**
- Browser console (F12) for JavaScript errors
- Make sure the authorized domain is added in Firebase Auth settings
