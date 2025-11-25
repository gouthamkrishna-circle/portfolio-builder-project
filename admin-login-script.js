document.addEventListener('DOMContentLoaded', () => {
    AOS.init();

    const adminSigninForm = document.getElementById('admin-signin-form');

    if (adminSigninForm) {
        adminSigninForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('admin-signin-email').value;
            const password = document.getElementById('admin-signin-password').value;

            try {
                // Send the data to the new /admin/login endpoint
                const response = await fetch('http://localhost:3000/admin/login', {
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
    }
});