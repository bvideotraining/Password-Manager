import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Helper to clean up env variables in case they were copied with quotes
const cleanEnv = (val?: string) => {
  if (!val) return val;
  return val.replace(/^["']|["']$/g, '').trim();
};

const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)
};

let app: any;
let auth: any;
let db: any;

if (typeof window !== 'undefined' && !firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing or invalid. Please check your environment variables.");
}

try {
  // Only initialize if we have an API key, otherwise create a dummy to prevent immediate crashes
  if (firebaseConfig.apiKey) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    // Dummy objects so the app doesn't crash on import, but will fail gracefully on use
    app = {};
    auth = { 
      onAuthStateChanged: (cb: any) => { cb(null); return () => {}; },
      signOut: async () => {}
    };
    db = {};
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  app = {};
  auth = { 
    onAuthStateChanged: (cb: any) => { cb(null); return () => {}; },
    signOut: async () => {}
  };
  db = {};
}

export { app, auth, db };
