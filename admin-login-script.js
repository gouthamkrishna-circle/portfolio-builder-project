document.addEventListener('DOMContentLoaded', () => {
    AOS.init();

    const adminSigninForm = document.getElementById('admin-signin-form');
    const passwordInput = document.getElementById('admin-signin-password');
    const togglePassword = document.getElementById('toggle-admin-password'); // Assumes an icon with this ID

    if (adminSigninForm) {
        adminSigninForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('admin-signin-email').value;
            const password = document.getElementById('admin-signin-password').value;

            try {
                // Send the data to the new /admin/login endpoint
                const response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const result = await response.json();

                if (response.ok) {
                    // On successful login, save user data and role, then redirect
                    localStorage.setItem('userName', result.user.name);
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('userRole', result.user.role); // Save the admin role
                    // You can add other admin-specific data here if needed
                    window.location.href = result.redirectUrl; // Redirect to index.html
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error('Error during admin signin:', error);
                alert('An error occurred during sign-in. Please try again.');
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