// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJpybyDF2zGthFIbmSZp_aYL_Urnyn7vs",
    authDomain: "socialweb369.firebaseapp.com",
    projectId: "socialweb369",
    storageBucket: "socialweb369.firebasestorage.app",
    messagingSenderId: "947074114887",
    appId: "1:947074114887:web:0e0f670cb798b951e89862",
    measurementId: "G-W45P6C6YTF"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth State Listener (Fixed)
auth.onAuthStateChanged(user => {
    if (user) {
        if (window.location.pathname.includes('auth.html')) {
            window.location.href = 'index.html';
        }
        loadUserProfile(user.uid);
        if (window.location.pathname.includes('index.html')) {
            loadPosts();
        }
    } else {
        if (!window.location.pathname.includes('auth.html')) {
            window.location.href = 'auth.html';
        }
    }
});

// Add this to Profile.html initialization
if (window.location.pathname.includes('profile.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const user = auth.currentUser;
        if (user) {
            // Initialize bio character counter
            document.getElementById('bioText').addEventListener('input', (e) => {
                const remaining = 200 - e.target.value.length;
                document.getElementById('bioCharCounter').textContent = `${remaining} remaining`;
            });
            
            // Load existing bio
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        document.getElementById('bioText').value = doc.data().bio || '';
                    }
                });
        }
    });
}

// Updated Search Function (Firestore query)
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm === '') {
        loadPosts();
        return;
    }
    
    db.collection('posts')
        .orderBy('timestamp', 'desc')
        .where('content', '>=', searchTerm)
        .where('content', '<=', searchTerm + '\uf8ff')
        .onSnapshot(snapshot => {
            const filtered = [];
            snapshot.forEach(doc => {
                filtered.push({ id: doc.id, ...doc.data() });
            });
            renderPosts(filtered);
        });
});

// Fixed Post Rendering (Safe HTML)
function renderPosts(postsArray) {
    const container = document.getElementById('postsList');
    if (!container) return;

    container.innerHTML = postsArray.map(post => {
        const safeContent = post.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
        <div class="post-card">
            <p>${safeContent.replace(/\n/g, '<br>')}</p>
            <div class="comments">
                ${post.comments.map(comment => `
                    <div class="comment">
                        <span class="comment-text">${comment.text}</span>
                        <span class="comment-time">${comment.timestamp}</span>
                    </div>
                `).join('')}
            </div>
            <div class="post-meta">
                <span>${new Date(post.timestamp?.toDate()).toLocaleString()}</span>
                <div>
                    <button onclick="likePost('${post.id}')" class="${post.likes > 0 ? 'liked' : ''}">
                        ❤️ ${post.likes}
                    </button>
                    <button onclick="addComment('${post.id}')" class="comment-btn">
                        💬 ${post.comments.length}
                    </button>
                    <button onclick="deletePost('${post.id}')" class="delete-btn">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Rest of the app.js remains the same as previous working version

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

// Add Reset Password Link to Auth Page
if (window.location.pathname.includes('auth.html')) {
    const resetLink = document.createElement('p');
    resetLink.innerHTML = '<a href="#" onclick="resetPassword()">Forgot password?</a>';
    resetLink.style.textAlign = 'center';
    resetLink.style.marginTop = '1rem';
    document.querySelector('.auth-box').appendChild(resetLink);
}

// Custom Error Toast
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.display = 'block';
        setTimeout(() => toast.remove(), 3000);
    }, 10);
}