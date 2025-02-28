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

    let unsubscribeUser = null;
    let isNavigating = false; // Flag to prevent multiple clicks

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

        try {
            await db.collection("users").doc(user.uid).set({
                username,
                bio
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

    // Debounced back button handler
    const handleBackClick = (e) => {
        e.preventDefault(); // Prevent any default behavior
        if (isNavigating) return; // Prevent multiple rapid clicks

        isNavigating = true;
        console.log("Back button clicked, cleaning up...");

        // Clean up listener
        if (unsubscribeUser) {
            unsubscribeUser();
            unsubscribeUser = null;
        }

        // Ensure DOM is stable before navigating
        setTimeout(() => {
            window.location.href = "index.html";
        }, 100); // Small delay to allow cleanup
    };

    // Remove any existing listeners and add a single one
    backBtn.removeEventListener("click", handleBackClick); // Prevent duplicates
    backBtn.addEventListener("click", handleBackClick, { once: true }); // Use 'once' to ensure single execution
});