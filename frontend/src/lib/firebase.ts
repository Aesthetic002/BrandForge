import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNdHt3Va7yIYfQh5zNAv2OzV_Y5SD9S1s",
  authDomain: "template-project-4d51c.firebaseapp.com",
  projectId: "template-project-4d51c",
  storageBucket: "template-project-4d51c.firebasestorage.app",
  messagingSenderId: "478603463912",
  appId: "1:478603463912:web:40cc54c15b1b091765cd5d",
  measurementId: "G-BLXJVCLHVS"
};

// Initialize Firebase securely (avoid double initialization in Next.js dev mode)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, auth, googleProvider, db };
