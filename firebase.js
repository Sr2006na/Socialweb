// Firebase Configuration
var firebaseConfig = {
  apiKey: "AIzaSyA5bhPIb-1D_sRqJoMaGz73pLV30Uv8biU",
  authDomain: "socialweb-369.firebaseapp.com",
  databaseURL: "https://socialweb-369-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "socialweb-369",
  storageBucket: "socialweb-369.appspot.com",
  messagingSenderId: "75094614196",
  appId: "1:75094614196:web:12d20977c76bac511477e1",
  measurementId: "G-D7S22GR0WC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.firestore();
var storage = firebase.storage();
var provider = new firebase.auth.GoogleAuthProvider();

// Make Firebase globally available
window.auth = auth;
window.db = db;
window.storage = storage;
window.provider = provider;
