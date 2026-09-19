import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyBEk9Bxh0qPUwlInkchDAO7Xg7yBhAcND8",

  authDomain: "campus-connect28.firebaseapp.com",
  projectId: "campus-connect28",
  storageBucket: "campus-connect28.firebasestorage.app",
  messagingSenderId: "111516062686",
  appId: "1:111516062686:web:30b204aa6cf7c39b83434f",
  measurementId: "G-JCS6PT2TB7",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

let appCheck = null;

const recaptchaSiteKey =
  import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;

if (recaptchaSiteKey) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export { auth, db, appCheck };

export default app;