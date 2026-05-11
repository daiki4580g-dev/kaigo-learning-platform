import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALVQZ_KWC_HagS3l-u0ED8cnz2jRAtVfs",
  authDomain: "kaigo-learning-platform.firebaseapp.com",
  projectId: "kaigo-learning-platform",
  storageBucket: "kaigo-learning-platform.firebasestorage.app",
  messagingSenderId: "832457670645",
  appId: "1:832457670645:web:4963f30f06aef5fbf02abc",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);