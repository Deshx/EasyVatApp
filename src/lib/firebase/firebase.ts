import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase config is complete
const isFirebaseConfigValid = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.authDomain && 
         firebaseConfig.projectId &&
         firebaseConfig.storageBucket &&
         firebaseConfig.messagingSenderId &&
         firebaseConfig.appId;
};

// Initialize Firebase with error handling
let app: FirebaseApp | null, auth: Auth | null, db: Firestore | null, storage: FirebaseStorage | null;

try {
  if (isFirebaseConfigValid()) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } else {
    console.warn("Firebase configuration is incomplete. Some environment variables may be missing.");
    // Create mock objects to prevent errors
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Create mock objects to prevent errors
  app = null;
  auth = null;
  db = null;
  storage = null;
}

export { app, auth, db, storage };
