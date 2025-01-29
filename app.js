// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJpybyDF2zGthFIbmSZp_aYL_Urnyn7vs",
    authDomain: "socialweb369.firebaseapp.com",
    projectId: "socialweb369",
    storageBucket: "socialweb369.firebasestorage.app",
    messagingSenderId: "947074114887",
    appId: "1:947074114887:web:0e0f670cb798b951e89862"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth State Listener
auth.onAuthStateChanged(user => {
    if (user) {
        // Redirect to index.html if logged in
        if (location.pathname.includes('auth.html')) {
            location.href = 'index.html';
        }
    } else {
        // Redirect to auth.html if not logged in
        if (!location.pathname.includes('auth.html')) {
            location.href = 'auth.html';
        }
    }
});

// Toggle Forms
function toggleForms() {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const toggleText = document.getElementById('toggleText');

    if (signupForm.style.display === 'none') {
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
        toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleForms()">Login</a>';
    } else {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleForms()">Sign Up</a>';
    }
}

// Signup Function
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        // Create user with email/password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Save user profile in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            bio: '',
            profileImage: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Redirect to main page
        window.location.href = 'index.html';
    } catch (error) {
        alert(error.message);
    }
});

// Login Function
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        alert(error.message);
    }
});

// Password Reset Function
function resetPassword() {
    const email = prompt("Enter your email to reset your password:");
    if (email) {
        auth.sendPasswordResetEmail(email)
            .then(() => {
                alert('Password reset email sent! Check your inbox.');
            })
            .catch(error => {
                alert('Error sending reset email: ' + error.message);
            });
    }
}

// Logout Function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'auth.html';
    });
}

// Save Profile Function
async function saveProfile() {
    const user = auth.currentUser;
    const bio = document.getElementById('bioText').value;
    const file = document.getElementById('profileImage').files[0];

    try {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                await db.collection('users').doc(user.uid).update({
                    profileImage: reader.result,
                    bio
                });
                location.reload();
            }
            reader.readAsDataURL(file);
        } else {
            await db.collection('users').doc(user.uid).update({ bio });
            alert('Profile updated!');
        }
    } catch (error) {
        alert(error.message);
    }
}

// Load Posts in Real-Time
function loadPosts() {
    db.collection('posts').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        const posts = [];
        snapshot.forEach(doc => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        renderPosts(posts);
    });
}

// Render Posts
function renderPosts(postsArray) {
    const container = document.getElementById('postsList');
    if (!container) return;

    container.innerHTML = postsArray.map(post => `
        <div class="post-card">
            <p>${post.content.replace(/\n/g, '<br>')}</p>
            <div class="comments">${renderComments(post.comments)}</div>
            <div class="post-meta">
                <span>${new Date(post.timestamp?.toDate()).toLocaleString()}</span>
                <div>
                    <button onclick="likePost('${post.id}')">❤️ ${post.likes}</button>
                    <button onclick="addComment('${post.id}')">💬 ${post.comments.length}</button>
                    <button onclick="deletePost('${post.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Initialize
if (location.pathname.includes('index.html')) {
    loadPosts();
}

if (location.pathname.includes('profile.html')) {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                const data = doc.data();
                document.getElementById('bioText').value = data.bio || '';
                document.querySelector('.profile-pic').src = data.profileImage || 'https://via.placeholder.com/150';
            });
        }
    });
}