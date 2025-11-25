document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedback-form');

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userEmail = document.getElementById('feedback-email').value;
            const message = document.getElementById('feedback-message').value;

            try {
                const response = await fetch('
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