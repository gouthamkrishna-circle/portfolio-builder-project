document.addEventListener('DOMContentLoaded', () => {
    AOS.init();

    const userRole = localStorage.getItem('userRole');
    const userListBody = document.getElementById('user-list');
    const feedbackListBody = document.getElementById('feedback-list');

    // Security Check: Only allow access if the user has the 'admin' role
    if (userRole !== 'admin') {
        alert('Access Denied. You must be an administrator to view this page.');
        window.location.href = 'welcome.html';
        return;
    }

    // Function to fetch all users and populate the table
    const fetchUsers = async () => {
        try {
            const response = await fetch('/admin/users');
            if (!response.ok) {
                throw new Error('Failed to fetch users.');
            }
            const users = await response.json();

            // Clear any existing rows
            userListBody.innerHTML = '';

            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td class="actions">
                        <button class="btn btn-secondary view-btn" data-userid="${user.id}">View Profile</button>
                        <button class="btn btn-danger delete-btn" data-userid="${user.id}">Delete</button>
                    </td>
                `;
                userListBody.appendChild(row);
            });

        } catch (error) {
            console.error('Error fetching users:', error);
            alert(error.message);
        }
    };

    // Function to fetch all feedback and populate the table
    const fetchFeedback = async () => {
        try {
            const response = await fetch('/admin/feedback');
            if (!response.ok) {
                throw new Error('Failed to fetch feedback.');
            }
            const feedback = await response.json();

            feedbackListBody.innerHTML = ''; // Clear existing rows

            if (feedback.length === 0) {
                feedbackListBody.innerHTML = '<tr><td colspan="3">No feedback has been submitted yet.</td></tr>';
                return;
            }

            feedback.forEach(item => {
                const row = document.createElement('tr');
                const formattedDate = new Date(item.submitted_at).toLocaleString();
                row.innerHTML = `
                    <td>${item.user_email}</td>
                    <td>${item.message}</td>
                    <td>${formattedDate}</td>
                `;
                feedbackListBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching feedback:', error);
        }
    };

    // Event delegation for delete buttons
    userListBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('view-btn')) {
            const userId = e.target.dataset.userid;
            // Open the user's profile view page in a new tab
            window.open(`user-profile-view.html?id=${userId}`, '_blank');
        }

        if (e.target.classList.contains('delete-btn')) {
            const userId = e.target.dataset.userid;
            if (confirm(`Are you sure you want to delete user with ID ${userId}? This action cannot be undone.`)) {
                try {
                    const response = await fetch(`/admin/users/${userId}`, {
                        method: 'DELETE',
                    });
                    const result = await response.json();
                    alert(result.message);
                    if (response.ok) {
                        fetchUsers(); // Refresh the user list
                    }
                } catch (error) {
                    console.error('Error deleting user:', error);
                    alert('An error occurred while deleting the user.');
                }
            }
        }
    });

    // Handle Logout
    document.getElementById('logout-nav-link').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'welcome.html';
    });

    // Initial fetch of users when the page loads
    fetchUsers();
    fetchFeedback();
});