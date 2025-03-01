document.addEventListener("DOMContentLoaded", () => {
    var auth = window.auth;
    var db = window.db;
    var storage = window.storage;

    var profilePic = document.getElementById("profilePic");
    var profilePicInput = document.getElementById("profilePicInput");
    var usernameInput = document.getElementById("usernameInput");
    var bioInput = document.getElementById("bioInput");
    var emailInput = document.getElementById("emailInput");
    var dobInput = document.getElementById("dobInput");
    var saveProfileBtn = document.getElementById("saveProfileBtn");
    var backBtn = document.getElementById("backBtn");

    let unsubscribeUser = null;
    let isNavigating = false;

    auth.onAuthStateChanged((user) => {
        if (user) {
            loadUserProfile(user);
        } else {
            window.location.href = "index.html";
        }
    });

    function loadUserProfile(user) {
        unsubscribeUser = db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                var data = doc.data();
                usernameInput.value = data.username || "";
                bioInput.value = data.bio || "";
                emailInput.value = data.email || user.email || "";
                dobInput.value = data.dob || "";
                if (data.profilePicBase64) {
                    profilePic.src = data.profilePicBase64;
                } else {
                    profilePic.src = "default-profile.png";
                }
            }
        }, (error) => {
            console.error("Error loading profile:", error);
        });
    }

    saveProfileBtn.addEventListener("click", async () => {
        var user = auth.currentUser;
        var username = usernameInput.value.trim();
        var bio = bioInput.value.trim();
        var email = emailInput.value.trim();
        var dob = dobInput.value;

        try {
            await db.collection("users").doc(user.uid).set({
                username,
                bio,
                email,
                dob
            }, { merge: true });
            alert("Profile Updated!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile");
        }
    });

    const MAX_FILE_SIZE = 2 * 1024 * 1024;

    profilePicInput.addEventListener("change", async (event) => {
        var file = event.target.files[0];
        var reader = new FileReader();
        var user = auth.currentUser;

        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            alert("File is too large! Please upload an image under 2MB.");
            return;
        }

        reader.onloadend = async function () {
            var base64String = reader.result;

            try {
                await db.collection("users").doc(user.uid).set({
                    profilePicBase64: base64String
                }, { merge: true });

                profilePic.src = base64String;
                console.log("Profile picture updated successfully!");
            } catch (error) {
                console.error("Error updating profile picture:", error);
                alert("Failed to upload profile picture");
            }
        };

        reader.readAsDataURL(file);
    });

    const handleBackClick = (e) => {
        e.preventDefault();
        if (isNavigating) return;

        isNavigating = true;
        console.log("Back button clicked, cleaning up...");

        if (unsubscribeUser) {
            unsubscribeUser();
            unsubscribeUser = null;
        }

        setTimeout(() => {
            window.location.href = "index.html";
        }, 100);
    };

    backBtn.removeEventListener("click", handleBackClick);
    backBtn.addEventListener("click", handleBackClick, { once: true });
});