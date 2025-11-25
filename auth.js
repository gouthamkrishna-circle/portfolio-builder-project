document.addEventListener('DOMContentLoaded', () => {
    const showSigninBtn = document.getElementById('show-signin-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');

    // Toggle between Sign In and Sign Up forms
    if (showSigninBtn && showSignupBtn && signinForm && signupForm) {
        showSigninBtn.addEventListener('click', () => {
            signinForm.classList.add('active');
            signupForm.classList.remove('active');
            showSigninBtn.classList.add('active');
            showSignupBtn.classList.remove('active');
        });

        showSignupBtn.addEventListener('click', () => {
            signupForm.classList.add('active');
            signinForm.classList.remove('active');
            showSignupBtn.classList.add('active');
            showSigninBtn.classList.remove('active');
        });

        // Handle Sign In form submission
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;

            try {
                const response = await fetch('http://localhost:3000/signin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const result = await response.json();
                alert(result.message);

                if (response.ok) {
                    // On successful login, redirect to the homepage
                    window.location.href = '/index.html';
                }
            } catch (error) {
                console.error('Error during signin:', error);
                alert('An error occurred during sign-in. Please try again.');
            }
        });
    }
});