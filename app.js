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

// Auth State Management
auth.onAuthStateChanged(user => {
    if (user && location.pathname.includes('auth.html')) {
        location.href = 'index.html';
    }
    if (!user && !location.pathname.includes('auth.html')) {
        location.href = 'auth.html';
    }
});

// Authentication Functions
function toggleForms() {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    [signupForm.style.display, loginForm.style.display] = 
    [loginForm.style.display, signupForm.style.display];
}

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCred.user.uid).set({
            name,
            bio: '',
            profileImage: '',
            joined: new Date()
        });
        location.href = 'index.html';
    } catch (error) {
        showError(error.message);
    }
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        location.href = 'index.html';
    } catch (error) {
        showError(error.message);
    }
});

// Post Functions
async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    if (!content) return showError("Post cannot be empty!");
    
    const loading = document.querySelector('.loading');
    try {
        loading.classList.add('active');
        await db.collection('posts').add({
            content,
            likes: 0,
            comments: [],
            timestamp: new Date(),
            userId: auth.currentUser.uid
        });
        document.getElementById('postContent').value = '';
    } catch (error) {
        showError(error.message);
    } finally {
        loading.classList.remove('active');
    }
}

function renderPosts(posts) {
    const container = document.getElementById('postsList');
    container.innerHTML = posts.map(post => `
        <div class="post-card">
            <p>${post.content.replace(/\n/g, '<br>')}</p>
            <div class="comments">${renderComments(post.comments)}</div>
            <div class="post-meta">
                <span>${new Date(post.timestamp).toLocaleString()}</span>
                <div>
                    <button onclick="likePost('${post.id}')">❤️ ${post.likes}</button>
                    <button onclick="addComment('${post.id}')">💬 ${post.comments.length}</button>
                    <button onclick="deletePost('${post.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderComments(comments) {
    return comments.map(comment => `
        <div class="comment">
            <span class="comment-text">${comment.text}</span>
            <span class="comment-time">${new Date(comment.timestamp).toLocaleString()}</span>
        </div>
    `).join('');
}

// Profile Functions
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
            showError("Profile updated!");
        }
    } catch (error) {
        showError(error.message);
    }
}

// Helper Functions
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function logout() {
    auth.signOut();
}

// Initialize
if (location.pathname.includes('index.html')) {
    db.collection('posts')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snap => {
            const posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderPosts(posts);
        });
}

if (location.pathname.includes('profile.html')) {
    auth.onAuthStateChanged(user => {
        db.collection('users').doc(user.uid).get().then(doc => {
            const data = doc.data();
            document.getElementById('bioText').value = data.bio;
            document.querySelector('.profile-pic').src = data.profileImage || 
                'https://via.placeholder.com/150';
        });
    });
}