import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from "firebase/auth";

// Uses Vite environment variables for Firebase Auth Provider with your original fallback credentials
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC-nsD2cB5F5T6yOS3-0VdBOcHRYjHlUaQ",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "thooimai-29951.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "thooimai-29951",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "thooimai-29951.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "843438510572",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:843438510572:web:ed594ec9d879a6966af0c9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const setupRecaptcha = (containerId) => {
    return new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
    });
};
