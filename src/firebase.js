import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "import.meta.env.VITE_FIREBASE_API_KEY",
  authDomain: "stl8-cbm-dashboard.firebaseapp.com",
  projectId: "stl8-cbm-dashboard",
  storageBucket: "stl8-cbm-dashboard.firebasestorage.app",
  messagingSenderId: "356283622439",
  appId: "1:356283622439:web:32ea7e908ffeda58061a02",
  measurementId: "G-VE9RDS6TJ6"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
