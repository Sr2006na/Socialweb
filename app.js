document.addEventListener("DOMContentLoaded", () => {
    const auth = window.auth;
    const db = window.db;
    const storage = window.storage;

    const authWrapper = document.getElementById('authWrapper');
    const authContainer = document.getElementById('authContainer');
    const loginContainer = document.getElementById('loginContainer');
    const navbar = document.querySelector('.navbar');
    const mainContainer = document.querySelector('.container');
    const postText = document.getElementById('postText');
    const postBtn = document.getElementById('postBtn');
    const postsContainer = document.getElementById('posts');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const errorPopup = document.getElementById('errorPopup');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    let unsubscribePosts = null;
    const postCache = new Map();
    let lastAuthAttempt = 0;
    const AUTH_COOLDOWN = 2000; // 2 seconds cooldown
    const MIN_PASSWORD_LENGTH = 8;

    // Ensure UI is initialized correctly
    function initializeUI() {
        if (auth.currentUser) {
            authWrapper.style.display = 'none';
            mainContainer.style.display = 'block';
            navbar.style.display = 'flex';
            loadPosts();
        } else {
            authWrapper.style.display = 'flex';
            authContainer.style.display = 'block';
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'none';
            navbar.style.display = 'none';
        }
    }

    // Auth state management
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection("users").doc(user.uid).get();
            if (userDoc.exists && user.emailVerified) {
                authWrapper.style.display = 'none';
                mainContainer.style.display = 'block';
                navbar.style.display = 'flex';
                loadPosts();
            } else {
                showError("Please verify your email to access SocialWeb.");
                await auth.signOut();
                authWrapper.style.display = 'flex';
                authContainer.style.display = 'block';
                loginContainer.style.display = 'none';
            }
        } else {
            cleanup();
            authWrapper.style.display = 'flex';
            authContainer.style.display = 'block';
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'none';
            navbar.style.display = 'none';
        }
    });

    // Call initializeUI immediately to fix UI not showing bug
    initializeUI();

    function showError(message) {
        errorPopup.innerText = message;
        errorPopup.style.display = 'block';
        setTimeout(() => errorPopup.style.display = 'none', 4000);
    }

    function cleanup() {
        if (unsubscribePosts) {
            unsubscribePosts();
            unsubscribePosts = null;
        }
        postsContainer.innerHTML = '';
        postCache.clear();
    }

    function canAttemptAuth() {
        const now = Date.now();
        if (now - lastAuthAttempt < AUTH_COOLDOWN) {
            showError("Please wait before trying again.");
            return false;
        }
        lastAuthAttempt = now;
        return true;
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

    function isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const blockedDomains = ['tempmail', 'mailinator', 'guerrillamail', '10minutemail', 'throwawaymail', 'yopmail'];
        const domain = email.split('@')[1]?.toLowerCase();
        return emailRegex.test(email) && !blockedDomains.some(temp => domain.includes(temp));
    }

    function isStrongPassword(password) {
        return password.length >= MIN_PASSWORD_LENGTH && /[A-Z]/.test(password) && /[0-9]/.test(password);
    }

    // Signup
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!canAttemptAuth()) return;

        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!isValidEmail(email)) {
            showError("Please use a valid, non-temporary email address.");
            return;
        }

        if (!isStrongPassword(password)) {
            showError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters with an uppercase letter and a number.`);
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await db.collection("users").doc(user.uid).set({
                username: email.split('@')[0],
                profilePicBase64: "",
                email: email,
                dob: "",
                verified: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await user.sendEmailVerification({ url: window.location.href, handleCodeInApp: true });
            showError("Verification email sent! Please check your inbox.");
            await auth.signOut();
        } catch (error) {
            console.error("Signup error:", error);
            switch (error.code) {
                case 'auth/email-already-in-use': showError("Email already in use."); break;
                case 'auth/invalid-email': showError("Invalid email format."); break;
                case 'auth/weak-password': showError("Password is too weak."); break;
                default: showError(error.message);
            }
        }
    });

    // Login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!canAttemptAuth()) return;

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!isValidEmail(email)) {
            showError("Please enter a valid email address.");
            return;
        }

        if (!password) {
            showError("Please enter your password.");
            return;
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                showError("Please verify your email first.");
                await user.sendEmailVerification({ url: window.location.href, handleCodeInApp: true });
                showError("Verification email resent. Check your inbox.");
                await auth.signOut();
            }
        } catch (error) {
            console.error("Login error:", error);
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password': showError("Incorrect email or password."); break;
                case 'auth/too-many-requests': showError("Too many attempts. Try again later."); break;
                case 'auth/invalid-credential': showError("Invalid login credentials."); break;
                default: showError(error.message);
            }
        }
    });

    // Forgot Password
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!canAttemptAuth()) return;

        const email = document.getElementById('loginEmail').value.trim();
        if (!isValidEmail(email)) {
            showError("Please enter a valid email address.");
            return;
        }

        try {
            await auth.sendPasswordResetEmail(email, { url: window.location.href, handleCodeInApp: true });
            showError("Password reset email sent! Check your inbox.");
        } catch (error) {
            console.error("Forgot password error:", error);
            switch (error.code) {
                case 'auth/user-not-found': showError("No account found with this email."); break;
                case 'auth/too-many-requests': showError("Too many requests. Try again later."); break;
                default: showError(error.message);
            }
        }
    });

    profileBtn.addEventListener("click", () => window.location.href = "profile.html");

    logoutBtn.addEventListener("click", async () => {
        try {
            cleanup();
            await auth.signOut();
        } catch (error) {
            showError("Error during logout: " + error.message);
        }
    });

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
            showError("Failed to post.");
        }
    });

    async function loadPosts() {
        if (unsubscribePosts) return;

        unsubscribePosts = db.collection("posts")
            .orderBy("timestamp", "desc")
            .limit(50)
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