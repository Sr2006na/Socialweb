document.addEventListener("DOMContentLoaded", () => {
    var auth = window.auth;
    var db = window.db;
    var storage = window.storage;
    var provider = window.provider;

    var authContainer = document.getElementById('authContainer');
    var loginContainer = document.getElementById('loginContainer');
    var navbar = document.querySelector('.navbar');
    var mainContainer = document.querySelector('.container');
    var postText = document.getElementById('postText');
    var postBtn = document.getElementById('postBtn');
    var postsContainer = document.getElementById('posts');
    var profileBtn = document.getElementById('profileBtn');
    var logoutBtn = document.getElementById('logoutBtn');
    var errorPopup = document.getElementById('errorPopup');

    let unsubscribePosts = null;
    const postCache = new Map();

    auth.onAuthStateChanged((user) => {
        if (user) {
            authContainer.style.display = 'none';
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'block';
            navbar.style.display = 'flex';
            loadPosts();
        } else {
            cleanup();
            authContainer.style.display = 'block';
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'none';
            navbar.style.display = 'none';
        }
    });

    function showError(message) {
        errorPopup.innerText = message;
        errorPopup.style.display = 'block';
        setTimeout(() => errorPopup.style.display = 'none', 3000);
    }

    function cleanup() {
        if (unsubscribePosts) {
            unsubscribePosts();
            unsubscribePosts = null;
        }
        postsContainer.innerHTML = '';
        postCache.clear();
    }

    document.getElementById('signupLink').addEventListener('click', (e) => {
        e.preventDefault();
        authContainer.style.display = 'block';
        loginContainer.style.display = 'none';
    });

    document.getElementById('loginLink').addEventListener('click', (e) => {
        e.preventDefault();
        authContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });

    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        var email = document.getElementById('signupEmail').value;
        var password = document.getElementById('signupPassword').value;

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection("users").doc(userCredential.user.uid).set({
                username: email.split('@')[0],
                profilePicBase64: "" // Default empty Base64
            });
        } catch (error) {
            showError(error.message);
        }
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        var email = document.getElementById('loginEmail').value;
        var password = document.getElementById('loginPassword').value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            showError(error.message);
        }
    });

    profileBtn.addEventListener("click", () => {
        window.location.href = "profile.html";
    });

    logoutBtn.addEventListener("click", async () => {
        try {
            cleanup();
            await auth.signOut();
            window.location.href = "index.html";
        } catch (error) {
            console.error("Error during logout:", error);
        }
    });

    const handleGoogleSignIn = () => {
        auth.signInWithPopup(provider).catch((error) => {
            showError(error.message);
        });
    };

    document.getElementById('googleSignIn').addEventListener('click', handleGoogleSignIn);
    document.getElementById('googleSignInLogin').addEventListener('click', handleGoogleSignIn);

    postBtn.addEventListener("click", async () => {
        const postContent = postText.value.trim();
        const user = auth.currentUser;

        if (!postContent || !user) return;

        try {
            await db.collection("posts").add({
                text: postContent,
                userId: user.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            postText.value = "";
        } catch (error) {
            console.error("Error adding post:", error);
        }
    });

    async function loadPosts() {
        if (unsubscribePosts) return;

        unsubscribePosts = db.collection("posts")
            .orderBy("timestamp", "desc")
            .onSnapshot(async (snapshot) => {
                const fragment = document.createDocumentFragment();
                const userPromises = [];

                snapshot.docChanges().forEach((change) => {
                    const post = change.doc.data();
                    const postId = change.doc.id;

                    if (change.type === "removed") {
                        const postElement = postsContainer.querySelector(`[data-id="${postId}"]`);
                        if (postElement) postElement.remove();
                        postCache.delete(postId);
                        return;
                    }

                    if (!post.userId) return;

                    if (postCache.has(postId)) {
                        updatePost(postId, post);
                    } else {
                        userPromises.push(
                            db.collection("users").doc(post.userId).get()
                                .then(userDoc => ({ post, postId, userDoc }))
                        );
                    }
                });

                const results = await Promise.all(userPromises);
                results.forEach(({ post, postId, userDoc }) => {
                    const user = userDoc.exists ? userDoc.data() : {};
                    const postElement = renderPost(postId, post, user);
                    fragment.appendChild(postElement);
                    postCache.set(postId, post);
                });

                postsContainer.prepend(fragment);
            }, (error) => {
                console.error("Error loading posts:", error);
                showError("Failed to load posts");
            });
    }

    function renderPost(postId, post, user) {
        const username = user.username || "Unknown";
        const profilePic = user.profilePicBase64 || "default-profile.png";
        const postDate = post.timestamp 
            ? new Date(post.timestamp.toDate()).toLocaleString()
            : "Just Now";

        const div = document.createElement('div');
        div.className = 'post';
        div.dataset.id = postId;
        div.innerHTML = `
            <div class="post-header">
                <img src="${profilePic}" class="post-profile-pic">
                <div>
                    <p class="post-username"><strong>${username}</strong></p>
                    <p class="post-time">${postDate}</p>
                </div>
            </div>
            <div class="post-content">
                <p>${post.text}</p>
            </div>
        `;
        return div;
    }

    function updatePost(postId, post) {
        const postElement = postsContainer.querySelector(`[data-id="${postId}"]`);
        if (postElement) {
            postElement.querySelector('.post-content p').textContent = post.text;
        }
    }
});