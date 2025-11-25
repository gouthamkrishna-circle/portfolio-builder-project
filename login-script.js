document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS for animations on the login page
    AOS.init();

    const signinForm = document.getElementById('signin-form');
    const passwordInput = document.getElementById('signin-password');
    const togglePassword = document.getElementById('toggle-password'); // Assumes an icon with this ID

    // This logic will only run on the login page where the form exists
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the default form submission which causes a reload

            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;

            try {
                // Send the data to the server's /login endpoint
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const result = await response.json();

                if (response.ok) {
                    // On successful login, save user data to localStorage and redirect
                    localStorage.setItem('userId', result.user.id); // Save the user's ID
                    localStorage.setItem('userName', result.user.name);
                    localStorage.setItem('userEmail', email); // Save email
                    localStorage.setItem('userAbout', result.user.about);
                    localStorage.setItem('userHeroDescription', result.user.heroDescription);
                    localStorage.setItem('userTitle', result.user.title); // Correctly read 'title' and save as 'userTitle'
                    localStorage.setItem('userProfilePic', result.user.profilePicture); // Standardize the key to 'userProfilePic'
                    localStorage.setItem('userResume', result.user.resume);
                    localStorage.setItem('userContactEmail', result.user.contactEmail);
                    localStorage.setItem('userRole', result.user.role); // Save the user role
                    window.location.href = result.redirectUrl; // This navigates to index.html
                } else {
                    // Show error message from server if login fails
                    alert(result.message);
                }
            } catch (error) {
                console.error('Error during signin:', error);
                alert('An error occurred during sign-in. Please try again.');
            }
        });

        // Add show/hide password functionality
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                // Toggle the type attribute
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);

                // Optional: Toggle icon class if you are using Font Awesome
                // For example: togglePassword.classList.toggle('fa-eye-slash');
                if (type === 'password') {
                    togglePassword.textContent = 'Show';
                } else {
                    togglePassword.textContent = 'Hide';
                }
            });
        }
    }
});