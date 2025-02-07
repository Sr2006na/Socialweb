
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


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();


document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => window.location.href = 'main.html')
        .catch(error => alert(error.message));
});

document.getElementById('signupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => window.location.href = 'main.html')
        .catch(error => alert(error.message));
});

document.getElementById('resetForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    auth.sendPasswordResetEmail(email)
        .then(() => alert('Reset link sent!'))
        .catch(error => alert(error.message));
});


document.getElementById('showSignup')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('resetForm').style.display = 'none';
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('resetForm').style.display = 'none';
});

document.getElementById('showReset')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('resetForm').style.display = 'block';
});

document.getElementById('backToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('resetForm').style.display = 'none';
});


function createPost() {
    const postContent = document.getElementById('postContent').value;
    const user = auth.currentUser;

    if (postContent.trim()) {
        db.collection('posts').add({
            text: postContent,
            userId: user.uid,
            likes: [],
            comments: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            author: user.email.split('@')[0]
        }).then(() => {
            document.getElementById('postContent').value = '';
        }).catch(error => alert(error.message));
    }
}


let selectedPostId = null;

function openCommentModal(postId) {
    selectedPostId = postId;
    document.getElementById('commentModal').style.display = 'flex';
    loadComments(postId);
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
}

function loadComments(postId) {
    const commentsList = document.querySelector('.comments-list');
    commentsList.innerHTML = '';

    db.collection('posts').doc(postId).collection('comments')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                const comment = doc.data();
                const commentEl = document.createElement('div');
                commentEl.className = 'comment';
                commentEl.innerHTML = `
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <strong>${comment.author}</strong>
                        <p>${comment.text}</p>
                    </div>
                `;
                commentsList.appendChild(commentEl);
            });
        });
}

function postComment() {
    const commentInput = document.getElementById('commentInput').value;
    const user = auth.currentUser;

    if (commentInput.trim() && selectedPostId) {
        db.collection('posts').doc(selectedPostId).collection('comments').add({
            text: commentInput,
            userId: user.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            author: user.email.split('@')[0]
        }).then(() => {
            document.getElementById('commentInput').value = '';
        }).catch(error => alert(error.message));
    }
}

document.querySelector('.close-modal')?.addEventListener('click', closeCommentModal);


if (document.getElementById('postsList')) {
    db.collection('posts')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            const postsList = document.getElementById('postsList');
            postsList.innerHTML = '';
            snapshot.forEach(doc => {
                const post = doc.data();
                const postEl = document.createElement('div');
                postEl.className = 'post';
                postEl.innerHTML = `
                    <div class="post-header">
                        <i class="fas fa-user-circle"></i>
                        <div>
                            <h4>${post.author}</h4>
                            <small>${new Date(post.timestamp?.toDate()).toLocaleString()}</small>
                        </div>
                    </div>
                    <p>${post.text}</p>
                    <div class="post-actions">
                        <button class="like-btn" data-id="${doc.id}">
                            <i class="fas fa-thumbs-up"></i> ${post.likes.length}
                        </button>
                        <button class="comment-btn" onclick="openCommentModal('${doc.id}')">
                            <i class="fas fa-comment"></i> ${post.comments.length}
                        </button>
                    </div>
                `;
                postsList.appendChild(postEl);
            });
        });

    
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.like-btn')) {
            const postId = e.target.closest('.like-btn').dataset.id;
            const postRef = db.collection('posts').doc(postId);
            const userId = auth.currentUser.uid;

            const post = await postRef.get();
            const likes = post.data().likes;
            const newLikes = likes.includes(userId)
                ? likes.filter(id => id !== userId)
                : [...likes, userId];

            await postRef.update({ likes: newLikes });
        }
    });
}


function logout() {
    auth.signOut().then(() => {
        history.replaceState(null, null, 'index.html');
        location.href = 'index.html';
    });
}







auth.onAuthStateChanged(user => {
    if (user) {
      
        if (location.pathname.includes('index.html')) {
            window.location.href = 'main.html';
        }
    } else {
      
        if (location.pathname.includes('main.html')) {
            window.location.href = 'index.html';
        }
    }
});

