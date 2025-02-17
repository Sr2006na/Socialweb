import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// UI Elements
const navbar = document.querySelector('.navbar');
const mainContainer = document.querySelector('.container');
const authContainer = document.getElementById('authContainer');
const loginContainer = document.getElementById('loginContainer');

// Show the app UI after successful login/sign-up
const showAppUI = () => {
    navbar.style.display = 'flex'; // Show the navbar
    mainContainer.style.display = 'block'; // Show the main container
    authContainer.style.display = 'none'; // Hide auth container
    loginContainer.style.display = 'none'; // Hide login container
};

// Sign Up Form
const signupForm = document.getElementById('signupForm');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');

signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = signupEmail.value;
    const password = signupPassword.value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('User signed up:', user);
            alert('Sign up successful!');
            showAppUI(); // Show the app UI
        })
        .catch((error) => {
            console.error('Error signing up:', error.message);
            alert(error.message);
        });
});

// Login Form
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Login form submitted'); // Debugging line
    const email = loginEmail.value;
    const password = loginPassword.value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('User logged in:', user);
            alert('Login successful!');
            showAppUI(); // Show the app UI
        })
        .catch((error) => {
            console.error('Error logging in:', error.message);
            alert(error.message);
        });
});

// Toggle Between Sign-Up and Login Forms
const signupLink = document.getElementById('signupLink');
const loginLink = document.getElementById('loginLink');

signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    authContainer.style.display = 'block';
    loginContainer.style.display = 'none';
});

loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    authContainer.style.display = 'none';
    loginContainer.style.display = 'block';
});

// Google Sign-In
const googleSignIn = document.getElementById('googleSignIn');
const googleSignInLogin = document.getElementById('googleSignInLogin');

const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log('User signed in with Google:', user);
            alert('Google Sign-In successful!');
            showAppUI(); // Show the app UI
        })
        .catch((error) => {
            console.error('Error with Google Sign-In:', error.message);
            alert(error.message);
        });
};

googleSignIn.addEventListener('click', handleGoogleSignIn);
googleSignInLogin.addEventListener('click', handleGoogleSignIn);

// Logout
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        alert('Logged out successfully!');
        navbar.style.display = 'none'; // Hide the navbar
        mainContainer.style.display = 'none'; // Hide the main container
        authContainer.style.display = 'block'; // Show the auth container
    }).catch((error) => {
        console.error('Error logging out:', error.message);
    });
});
