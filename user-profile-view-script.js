document.addEventListener('DOMContentLoaded', () => {
    AOS.init();

    // Get the user ID from the URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        alert('No user ID provided.');
        window.location.href = 'admin-dashboard.html';
        return;
    }

    // Function to fetch a single user's data and populate the page
    const fetchAndDisplayUser = async () => {
        try {
            const response = await fetch(`/admin/user/${userId}`);
            if (!response.ok) {
                throw new Error('User not found or failed to fetch data.');
            }
            const user = await response.json();

            // Populate the page with the fetched user data
            document.title = `${user.username}'s Profile View`;
            document.getElementById('hero-name').textContent = user.username;
            document.getElementById('hero-skills').innerHTML = `<strong>${user.user_title || 'No title provided'}</strong>`;
            document.getElementById('hero-description').textContent = user.hero_description || 'No hero description provided.';
            document.getElementById('about-content').innerHTML = `<p>${user.about || 'No about description provided.'}</p>`;

            const profileImg = document.getElementById('main-profile-img');
            if (user.profile_picture_path) {
                profileImg.src = user.profile_picture_path;
            }

            const resumeBtn = document.getElementById('resume-view-btn');
            if (user.resume_path) {
                resumeBtn.href = user.resume_path;
            } else {
                resumeBtn.textContent = 'No Resume Uploaded';
                resumeBtn.style.pointerEvents = 'none';
                resumeBtn.style.backgroundColor = '#ccc';
            }

            // Update Contact Me button
            const contactContent = document.getElementById('contact-content');
            if (contactContent && user.contact_email) {
                contactContent.innerHTML = `
                    <p>You can reach this user via their public contact email.</p>
                    <a href="mailto:${user.contact_email}" class="btn btn-primary mt-4">Email ${user.username}</a>
                `;
            } else if (contactContent) {
                contactContent.innerHTML = `<p>This user has not provided a public contact email.</p>`;
            }

            // After fetching the user, fetch their skills and projects
            loadSkills(userId);
            loadProjects(userId, user.username);

        } catch (error) {
            console.error('Error fetching user details:', error);
            alert(error.message);
        }
    };

    // --- DYNAMICALLY LOAD SKILLS ---
    const loadSkills = async (currentUserId) => {
        const skillsGrid = document.getElementById('skills-grid-container');
        if (!skillsGrid) return;
        try { // This try/catch block is unchanged
            const response = await fetch(`http://localhost:3000/user/${currentUserId}/skills`);
            const skills = await response.json();
            skillsGrid.innerHTML = '';
            if (skills.length > 0) {
                skills.forEach(skill => {
                    skillsGrid.innerHTML += `
                        <div class="skill-card" data-aos="fade-up">
                            <img src="${skill.skill_icon_path}" alt="${skill.skill_name}" class="skill-card-icon">
                            <h3>${skill.skill_name}</h3>
                        </div>
                    `;
                });
            } else {
                skillsGrid.innerHTML = '<p>This user has not added any skills yet.</p>';
            }
        } catch (error) {
            console.error('Could not load skills for admin view', error);
        }
    };

    // --- DYNAMICALLY LOAD PROJECTS ---
    const loadProjects = async (currentUserId, currentUsername) => {
        const projectsContainer = document.getElementById('projects-container');
        if (!projectsContainer) return;
        try { // This try/catch block is unchanged
            const response = await fetch(`http://localhost:3000/user/${currentUserId}/projects`);
            const projects = await response.json();
            projectsContainer.innerHTML = ''; // Clear static projects
            if (projects.length > 0) {
                projects.forEach(p => {
                    projectsContainer.innerHTML += `
                        <div class="project-card" data-aos="fade-up">
                            ${p.project_thumbnail_path ? `<img src="${p.project_thumbnail_path}" alt="${p.project_name}" class="project-thumbnail">` : ''}
                            <h3>${p.project_name}</h3>
                            <p>A project by ${currentUsername}.</p>
                            <div class="project-links">
                                <a href="${p.project_demo_link || '#'}" class="btn btn-primary" target="_blank">Live Demo</a>
                                <a href="${p.project_source_link || '#'}" class="btn btn-secondary" target="_blank">Source Code</a>
                            </div>
                        </div>
                    `;
                });
            } else {
                projectsContainer.innerHTML = '<p>This user has not added any projects yet.</p>';
            }
        } catch (error) {
            console.error('Could not load projects for admin view', error);
        }
    };

    // Call the function to load the user's profile
    fetchAndDisplayUser();
});