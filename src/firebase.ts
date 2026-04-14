import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Default configuration from environment variables
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
};

// Use import.meta.glob to eagerly load the config if it exists
// This avoids top-level await and works with Vite's build system
const configFiles = import.meta.glob('../firebase-applet-config.json', { eager: true });
const localConfigFile = Object.values(configFiles)[0] as any;
const localConfig = localConfigFile?.default || localConfigFile || {};

// Merge configs, prioritizing local JSON if it has a real API key
let firebaseConfig = { ...envConfig };
if (localConfig.apiKey && localConfig.apiKey !== "TODO_KEYHERE" && localConfig.apiKey !== "") {
  firebaseConfig = {
    ...firebaseConfig,
    ...localConfig
  };
}

// Ensure we have at least a placeholder to prevent crash
const finalConfig = {
  apiKey: firebaseConfig.apiKey || "placeholder-key",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId,
};

const app = initializeApp(finalConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
