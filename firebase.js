// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration object
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA5bhPIb-1D_sRqJoMaGz73pLV30Uv8biU",
  authDomain: "socialweb-369.firebaseapp.com",
  databaseURL: "https://socialweb-369-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "socialweb-369",
  storageBucket: "socialweb-369.firebasestorage.app",
  messagingSenderId: "75094614196",
  appId: "1:75094614196:web:12d20977c76bac511477e1",
  measurementId: "G-D7S22GR0WC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };