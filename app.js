// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJpybyDF2zGthFIbmSZp_aYL_Urnyn7vs",
    authDomain: "socialweb369.firebaseapp.com",
    databaseURL: "https://socialweb369-default-rtdb.asia-southeast1.firebasedatabase.app",
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
let currentPostId = null;
let isLoading = false;

// Auth State Listener
auth.onAuthStateChanged(async user => {
    const currentPath = location.pathname;
    
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists && userDoc.data().dob) {
            if (currentPath.includes('profile.html')) return;
            if (!currentPath.includes('index.html')) {
                location.href = 'index.html';
            }
        } else {
            if (!currentPath.includes('profile.html')) {
                location.href = 'profile.html';
            }
        }
    } else {
        if (!currentPath.includes('auth.html')) {
            location.href = 'auth.html';
        }
    }
});

// Authentication Functions
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            bio: "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        location.href = 'profile.html';
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

// Profile Functions
function loadUserProfile(uid) {
    db.collection('users').doc(uid).onSnapshot(doc => {
        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('profileName').textContent = userData.name;
            document.getElementById('editName').value = userData.name;
            document.getElementById('bio').value = userData.bio || "";
            document.getElementById('dob').value = userData.dob || '';
            document.getElementById('gender').value = userData.gender || 'male';
            
            const profilePic = document.querySelector('.profile-pic');
            profilePic.src = userData.profileImage || 'https://via.placeholder.com/150';
            profilePic.onerror = () => profilePic.src = 'https://via.placeholder.com/150';
        }
    });
}

async function saveProfile() {
    const user = auth.currentUser;
    const name = document.getElementById('editName').value;
    const dob = document.getElementById('dob').value;
    const gender = document.getElementById('gender').value;
    const bio = document.getElementById('bio').value;
    const file = document.getElementById('profileImage').files[0];

    if (!name || !dob || !gender) {
        showError('Please fill all required fields');
        return;
    }

    if (file && file.size > 2 * 1024 * 1024) {
        showError("Image size must be less than 2MB");
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (dob > today) {
        showError('Birth date cannot be in the future');
        return;
    }

    try {
        const userRef = db.collection('users').doc(user.uid);
        const updateData = {
            name: name,
            dob: dob,
            gender: gender,
            bio: bio,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                updateData.profileImage = reader.result;
                await updateProfileAndPosts(userRef, updateData);
            };
            reader.readAsDataURL(file);
        } else {
            const currentData = (await userRef.get()).data();
            updateData.profileImage = currentData?.profileImage;
            await updateProfileAndPosts(userRef, updateData);
        }
    } catch (error) {
        showError(error.message);
    }
}

async function updateProfileAndPosts(userRef, updateData) {
    // Update user profile
    await userRef.set(updateData, { merge: true });
    
    // Update all existing posts
    const postsQuery = await db.collection('posts')
        .where('userId', '==', auth.currentUser.uid)
        .get();

    const batch = db.batch();
    postsQuery.forEach(doc => {
        const postRef = db.collection('posts').doc(doc.id);
        batch.update(postRef, {
            userName: updateData.name,
            userImage: updateData.profileImage
        });
    });
    
    await batch.commit();
    showSuccess('Profile updated successfully!');
    setTimeout(() => location.href = 'index.html', 1000);
}

// Post Functions
async function createPost() {
    if(isLoading) return;
    isLoading = true;
    const postButton = document.getElementById('postButton');
    postButton.disabled = true;
    postButton.innerHTML = 'Posting...';

    const user = auth.currentUser;
    const content = document.getElementById('postContent').value.trim();

    if (!content) {
        showError("Post cannot be empty!");
        isLoading = false;
        postButton.disabled = false;
        postButton.innerHTML = 'Share';
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        await db.collection('posts').add({
            content: content,
            likes: 0,
            comments: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: user.uid,
            userImage: userDoc.data().profileImage || 'https://via.placeholder.com/40',
            userName: userDoc.data().name || 'Anonymous'
        });
        document.getElementById('postContent').value = '';
    } catch (error) {
        showError(error.message);
    } finally {
        isLoading = false;
        postButton.disabled = false;
        postButton.innerHTML = 'Share';
    }
}

// Post Interactions
async function likePost(postId) {
    try {
        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        
        if(postDoc.data().userId === auth.currentUser.uid) {
            showError("You can't like your own post");
            return;
        }
        
        await postRef.update({
            likes: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        showError(error.message);
    }
}

function addComment(postId) {
    currentPostId = postId;
    document.getElementById('commentModal').style.display = 'block';
    loadComments(postId);
}

async function loadComments(postId) {
    db.collection('posts').doc(postId).onSnapshot(doc => {
        const comments = doc.data().comments || [];
        const container = document.getElementById('commentsList');
        container.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <img src="${comment.userImage}" class="comment-user-img">
                <div>
                    <strong>${comment.userName}</strong>
                    <p>${comment.text}</p>
                    <small>${new Date(comment.timestamp?.toDate()).toLocaleString()}</small>
                    ${comment.userId === auth.currentUser?.uid ? 
                        `<button class="delete-comment" onclick="deleteComment('${postId}', '${comment.text}')">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    });
}

async function submitComment() {
    const commentInput = document.getElementById('newComment');
    const comment = commentInput.value.trim();
    if (!comment) return;

    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        await db.collection('posts').doc(currentPostId).update({
            comments: firebase.firestore.FieldValue.arrayUnion({
                text: comment,
                timestamp: new Date(),
                userId: auth.currentUser.uid,
                userName: userDoc.data().name,
                userImage: userDoc.data().profileImage
            })
        });
        commentInput.value = '';
    } catch (error) {
        showError(error.message);
    }
}

async function deleteComment(postId, commentText) {
    if(!confirm("Delete this comment?")) return;
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    const comments = postDoc.data().comments;
    const updatedComments = comments.filter(c => c.text !== commentText);
    await postRef.update({ comments: updatedComments });
}

// UI Functions
function toggleForms() {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    
    signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    
    document.getElementById('toggleText').innerHTML = signupForm.style.display === 'none' ? 
        'Don\'t have an account? <a href="#" onclick="toggleForms()">Sign Up</a>' :
        'Already have an account? <a href="#" onclick="toggleForms()">Login</a>';
}

function showResetPassword() {
    document.getElementById('resetPasswordModal').style.display = 'block';
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

async function resetPassword() {
    const email = document.getElementById('resetEmail').value;
    try {
        await auth.sendPasswordResetEmail(email);
        showSuccess('Password reset email sent! Check your inbox.');
        closeModal();
    } catch (error) {
        showError(error.message);
    }
}

// Post Rendering
function loadPosts() {
    db.collection('posts')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderPosts(posts);
        });
}

function renderPosts(posts) {
    const container = document.getElementById('postsList');
    container.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <img src="${post.userImage}" class="post-user-image" alt="${post.userName}">
                <div>
                    <h4>${post.userName}</h4>
                    <small>${post.timestamp?.toDate() ? 
                        new Date(post.timestamp.toDate()).toLocaleString() : 
                        'Just now'}</small>
                </div>
            </div>
            <p>${post.content.replace(/\n/g, '<br>')}</p>
            <div class="post-actions">
                <button ${post.userId === auth.currentUser?.uid ? 'disabled style="opacity:0.5"' : ''} 
                    onclick="likePost('${post.id}')">❤️ ${post.likes}</button>
                <button onclick="addComment('${post.id}')">💬 ${post.comments.length}</button>
                ${auth.currentUser?.uid === post.userId ? 
                    `<button onclick="showDeleteModal('${post.id}')">🗑️</button>` : ''}
            </div>
        </div>
    `).join('');
}

// Delete Post Modal
let postToDelete = null;
function showDeleteModal(postId) {
    postToDelete = postId;
    document.getElementById('deleteModal').style.display = 'block';
}

function confirmDelete() {
    if(postToDelete) {
        db.collection('posts').doc(postToDelete).delete();
        closeModal();
    }
}

// Logout Function
function logout() {
    auth.signOut().then(() => {
        history.replaceState(null, null, 'auth.html');
        location.href = 'auth.html';
    });
}

// Error Handling
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize Page Features
if (location.pathname.includes('index.html')) loadPosts();
if (location.pathname.includes('profile.html')) auth.onAuthStateChanged(user => user && loadUserProfile(user.uid));