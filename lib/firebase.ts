import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAlvQZ_KWC_HaqS3l-uoED8cnz2jRAtVfs",
  authDomain: "kaigo-learning-platform.firebaseapp.com",
  projectId: "kaigo-learning-platform",
  storageBucket: "kaigo-learning-platform.firebasestorage.app",
  messagingSenderId: "832457670645",
  appId: "1:832457670645:web:4963f30f06aef5fbf02abc",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);