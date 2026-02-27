import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyC-nsD2cB5F5T6yOS3-0VdBOcHRYjHlUaQ",
    authDomain: "thooimai-29951.firebaseapp.com",
    projectId: "thooimai-29951",
    storageBucket: "thooimai-29951.firebasestorage.app",
    messagingSenderId: "843438510572",
    appId: "1:843438510572:web:ed594ec9d879a6966af0c9",
    measurementId: "G-1HMVDDP9VJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Setup Google Provider
export const googleProvider = new GoogleAuthProvider();
