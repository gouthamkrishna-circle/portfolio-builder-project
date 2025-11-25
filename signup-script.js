document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS for animations
    AOS.init();

    const signupForm = document.getElementById('signup-form');
    const passwordInput = document.getElementById('signup-password');
    const togglePassword = document.getElementById('toggle-signup-password'); // Assumes an icon with this ID

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the default form submission

            // Get user input from the form
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const about = document.getElementById('signup-about').value;
            const skills = document.getElementById('signup-skills').value;
            const heroDescription = document.getElementById('signup-hero-desc').value;

            try {
                // Send the data to the server's /signup endpoint
                const response = await fetch('/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, about, heroDescription, skills }),
                });

                const result = await response.json();
                alert(result.message); // Show success or error message from the server

                if (response.ok) {
                    // If signup is successful, redirect to the login page
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error('Error during signup:', error);
                alert('An error occurred during sign-up. Please try again.');
            }
        });

        // Add show/hide password functionality
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                // Toggle the type attribute
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);

                // Optional: Toggle icon class
                if (type === 'password') {
                    togglePassword.textContent = 'Show';
                } else {
                    togglePassword.textContent = 'Hide';
                }
            });
        }
    }
});