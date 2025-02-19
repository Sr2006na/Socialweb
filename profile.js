document.addEventListener("DOMContentLoaded", () => {
    var auth = window.auth;
    var db = window.db;
    var storage = window.storage;

    var profilePic = document.getElementById("profilePic");
    var profilePicInput = document.getElementById("profilePicInput");
    var usernameInput = document.getElementById("usernameInput");
    var bioInput = document.getElementById("bioInput");
    var saveProfileBtn = document.getElementById("saveProfileBtn");
    var backBtn = document.getElementById("backBtn");

    auth.onAuthStateChanged((user) => {
        if (user) {
            loadUserProfile(user);
        } else {
            window.location.href = "index.html";
        }
    });

    function loadUserProfile(user) {
        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                var data = doc.data();
                usernameInput.value = data.username || "";
                bioInput.value = data.bio || "";
                if (data.profilePicUrl) {
                    profilePic.src = data.profilePicUrl;
                }
            }
        });
    }

    saveProfileBtn.addEventListener("click", () => {
        var user = auth.currentUser;
        var username = usernameInput.value.trim();
        var bio = bioInput.value.trim();

        db.collection("users").doc(user.uid).set({
            username: username,
            bio: bio
        }, { merge: true }).then(() => {
            alert("Profile Updated!");
        }).catch((error) => {
            console.error("Error updating profile:", error);
        });
    });

    profilePicInput.addEventListener("change", (event) => {
        var file = event.target.files[0];
        var user = auth.currentUser;
        var storageRef = storage.ref("profile_pictures/" + user.uid);

        storageRef.put(file).then(() => {
            storageRef.getDownloadURL().then((url) => {
                profilePic.src = url;
                db.collection("users").doc(user.uid).update({
                    profilePicUrl: url
                });
            });
        }).catch((error) => {
            console.error("Error uploading profile picture:", error);
        });
    });

    backBtn.addEventListener("click", () => {
        window.location.href = "index.html";
    });
});
