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

    let unsubscribe = null; // Store listener to prevent duplicate calls

    // Show UI Based on Login State
    auth.onAuthStateChanged((user) => {
        if (user) {
            authContainer.style.display = 'none';
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'block';
            navbar.style.display = 'flex';
            
            loadPosts();  // Load posts when user logs in
        } else {
            // Unsubscribe from Firestore listener when user logs out
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
            authContainer.style.display = 'block';
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'none';
            navbar.style.display = 'none';
        }
    });

    // Show Custom Error Messages
    function showError(message) {
        errorPopup.innerText = message;
        errorPopup.style.display = 'block';
        setTimeout(() => { errorPopup.style.display = 'none'; }, 3000);
    }

    // Toggle Signup/Login
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

    // Sign Up: Create User Document in Firestore
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        var email = document.getElementById('signupEmail').value;
        var password = document.getElementById('signupPassword').value;

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            // Create user document in Firestore
            await db.collection("users").doc(userCredential.user.uid).set({
                username: email.split('@')[0], // Default to email prefix
                profilePicUrl: "default-profile.png"
            });
        } catch (error) {
            showError(error.message);
        }
    });

    // Login
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

    // Profile Button
    profileBtn.addEventListener("click", () => {
        window.location.href = "profile.html";
    });

    // Logout: Unsubscribe Listener and Sign Out
    logoutBtn.addEventListener("click", () => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        auth.signOut().then(() => {
            window.location.href = "index.html";
        });
    });

    // Google Sign-In
    document.getElementById('googleSignIn').addEventListener('click', () => {
        auth.signInWithPopup(provider).catch((error) => {
            showError(error.message);
        });
    });

    // Add Post Feature
    postBtn.addEventListener('click', async () => {
        var text = postText.value.trim();
        var user = auth.currentUser;

        if (!text) return showError("Post cannot be empty.");
        if (!user) return showError("You must be logged in to post.");

        try {
            await db.collection("posts").add({
                text: text,
                userId: user.uid,  // Store the user ID
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            postText.value = "";  // Clear input after posting
        } catch (error) {
            showError(error.message);
        }
    });

    // Load Posts from All Users
    function loadPosts() {
        console.log("Loading posts...");
        postsContainer.innerHTML = "";

        if (unsubscribe) {
            unsubscribe(); // Unsubscribe from the previous listener
        }

        // Fetch all posts from Firestore, ordered by timestamp
        unsubscribe = db.collection("posts").orderBy("timestamp", "desc").onSnapshot(
            async (snapshot) => {
                console.log("New snapshot received:", snapshot.docs.length, "posts");
                const posts = [];
                for (const doc of snapshot.docs) {
                    const post = doc.data();
                    console.log("Processing post:", post);
                    try {
                        // Fetch user data for the post's userId
                        const userData = await db.collection("users").doc(post.userId).get();
                        console.log("Fetched user data:", userData.data());
                        const username = userData.exists ? userData.data().username : "Unknown";
                        const profilePicUrl = userData.exists && userData.data().profilePicUrl ? userData.data().profilePicUrl : "default-profile.png";

                        // Add post to the list
                        posts.push(`
                            <div class="post">
                                <img src="${profilePicUrl}" class="post-profile-pic">
                                <div class="post-content">
                                    <p><strong>${username}</strong></p>
                                    <p>${post.text}</p>
                                </div>
                            </div>
                        `);
                    } catch (error) {
                        console.error("Error fetching user data:", error);
                    }
                }
                // Render all posts at once
                postsContainer.innerHTML = posts.join("");
            },
            (error) => { // Error handler for onSnapshot
                console.error("Error in onSnapshot:", error);
                showError("Failed to load posts: " + error.message);
            }
        );
    }

    // Update User Profile (Username and Profile Picture)
    document.getElementById('updateProfile').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('newUsername').value;
        const newProfilePic = document.getElementById('newProfilePic').files[0];
        const user = auth.currentUser;

        if (user) {
            const userRef = db.collection("users").doc(user.uid);

            try {
                let updateData = { username: newUsername };

                if (newProfilePic) {
                    const fileRef = storage.ref().child(`profilePics/${user.uid}`);
                    await fileRef.put(newProfilePic);
                    const profilePicUrl = await fileRef.getDownloadURL();
                    updateData.profilePicUrl = profilePicUrl;
                }

                await userRef.update(updateData);
                showError("Profile updated successfully!");
                loadPosts(); // Refresh UI with new username and profile picture
            } catch (error) {
                showError("Failed to update profile: " + error.message);
            }
        } else {
            showError("You must be logged in to update profile.");
        }
    });
});