document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedback-form');

    // --- Add Admin Request Info ---
    // Find the container of the form to append the new message
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
        const adminInfo = document.createElement('p');
        adminInfo.className = 'form-switch-text'; // Use existing class for similar styling
        adminInfo.style.marginTop = '30px'; // Add some space
        adminInfo.style.lineHeight = '1.6'; // Improve readability
        adminInfo.innerHTML = `Want to become an admin? Send a message "I want to become admin" to my email: <a href="mailto:tumanageswaritumanageswari@gmail.com">tumanageswaritumanageswari@gmail.com</a>. We will discuss further there.`;
        formContainer.appendChild(adminInfo);
    }
    // --- End of Admin Request Info ---

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userEmail = document.getElementById('feedback-email').value;
            const message = document.getElementById('feedback-message').value;

            try {
                const response = await fetch('/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userEmail, message }),
                });

                const result = await response.json();
                alert(result.message);

                if (response.ok) {
                    feedbackForm.reset(); // Clear the form on success
                }
            } catch (error) {
                alert('An error occurred while submitting your feedback.');
                console.error('Feedback submission error:', error);
            }
        });
    }
});