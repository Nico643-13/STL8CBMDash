// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcL9010wx4zqN2dclk2ZzNiCuP5K3fIfI",
  authDomain: "stl8-cbm-dashboard.firebaseapp.com",
  projectId: "stl8-cbm-dashboard",
  storageBucket: "stl8-cbm-dashboard.firebasestorage.app",
  messagingSenderId: "356283622439",
  appId: "1:356283622439:web:32ea7e908ffeda58061a02",
  measurementId: "G-VE9RDS6TJ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
