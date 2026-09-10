// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA86w6QY5rrm9-BN_MTdm2XKj5HyAkmZe0",
  authDomain: "livingston-lift.firebaseapp.com",
  projectId: "livingston-lift",
  storageBucket: "livingston-lift.firebasestorage.app",
  messagingSenderId: "476847711255",
  appId: "1:476847711255:web:7167287b68a9624d15a852",
  measurementId: "G-43JCFL9S6N"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Messaging safely for browser environment
let messaging: Messaging | null = null;
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Firebase Messaging initialization failed:", error);
  }
}

export { app, auth, db, googleProvider, messaging, getToken, onMessage };