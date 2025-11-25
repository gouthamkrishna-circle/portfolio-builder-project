document.addEventListener('DOMContentLoaded', () => {
    AOS.init();

    // --- Cropper and Modal Elements ---
    const cropModal = document.getElementById('crop-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropAndSaveBtn = document.getElementById('crop-and-save-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    const profilePictureInput = document.getElementById('profile-picture-input');
    let cropper;
    const editProjectModal = document.getElementById('edit-project-modal');
    const editProjectForm = document.getElementById('edit-project-form');
    const cancelEditProjectBtn = document.getElementById('cancel-edit-project-btn');

    let croppedImageBlob = null; // Variable to hold the cropped image data

    // Get user data from localStorage
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail'); // We need to save email on login
    const userId = localStorage.getItem('userId'); // We will save this on login
    const userAbout = localStorage.getItem('userAbout');
    const userTitle = localStorage.getItem('userTitle'); // Changed from userSkills
    const userHeroDescription = localStorage.getItem('userHeroDescription');
    const userProfilePic = localStorage.getItem('userProfilePic');
    const userContactEmail = localStorage.getItem('userContactEmail');
    const userDemoLink = localStorage.getItem('userDemoLink');
    const userSourceLink = localStorage.getItem('userSourceLink');

    // Check if user is logged in, otherwise redirect to login
    if (!userName) {
        window.location.href = 'login.html';
        return;
    }

    // Populate the profile page with user data
    document.getElementById('profile-page-name').textContent = userName;
    document.getElementById('profile-page-email').textContent = userEmail;
    document.getElementById('user-email-hidden').value = userEmail;

    // Populate form fields with existing data
    document.getElementById('edit-name').value = userName || '';
    document.getElementById('edit-about').value = userAbout || '';
    document.getElementById('edit-skills').value = userTitle || ''; // Use userTitle
    document.getElementById('edit-hero-desc').value = userHeroDescription || '';
    document.getElementById('edit-contact-email').value = userContactEmail || '';

    if (userProfilePic && userProfilePic !== 'null') {
        document.getElementById('profile-page-picture').src = userProfilePic;
    }

    // Handle Logout
    const logoutButton = document.getElementById('logout-nav-link');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear(); // Clear all stored data
            window.location.href = 'login.html';
        });
    }

    // --- Cropper Logic ---
    profilePictureInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => {
                imageToCrop.src = reader.result;
                cropModal.classList.remove('hidden');
                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 1, // For a square/circular crop
                    viewMode: 1,
                });
            };
            reader.readAsDataURL(files[0]);
        }
    });

    // --- Handle the UNIFIED Profile Form Submission ---
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // --- Create a single FormData object for all data ---
            const unifiedFormData = new FormData(profileForm);

            // Append the cropped image blob if it exists
            if (croppedImageBlob) {
                unifiedFormData.set('profilePicture', croppedImageBlob, 'profile.jpg');
            } else {
                const profileInput = document.getElementById('profile-picture-input');
                if (!profileInput.files[0]) {
                    unifiedFormData.delete('profilePicture');
                }
            }

            // Remove empty resume field if no file is selected
            const resumeInput = document.getElementById('resume-pdf-input');
            if (!resumeInput.files[0]) {
                unifiedFormData.delete('resumePdf');
            }

            // --- Send all data to the server in one request ---
            try {
                const response = await fetch('/profile/update-all', {
                    method: 'POST',
                    body: unifiedFormData, // FormData sets its own headers
                });

                const result = await response.json();

                if (response.ok) {
                    // Update localStorage with the fresh data from the server response
                    const updated = result.updatedUser;

                    // Explicitly update each item and handle potential null values
                    localStorage.setItem('userName', updated.userName || '');
                    localStorage.setItem('userAbout', updated.userAbout || '');
                    localStorage.setItem('userHeroDescription', updated.userHeroDescription || '');
                    localStorage.setItem('userTitle', updated.userTitle || '');
                    localStorage.setItem('userContactEmail', updated.userContactEmail || '');
                    localStorage.setItem('userResume', updated.userResume || '');

                    // CRITICAL: Only update the profile picture if a new one was returned
                    if (updated.userProfilePic) {
                        localStorage.setItem('userProfilePic', updated.userProfilePic);
                    }

                    alert(result.message);
                    window.location.href = 'index.html'; // Redirect ONLY on full success
                } else {
                    throw new Error(result.message || 'An unknown error occurred.');
                }
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // --- NEW Skill Management Logic ---
    const addSkillForm = document.getElementById('add-skill-form');
    const existingSkillsList = document.getElementById('existing-skills-list');

    async function fetchAndDisplaySkills() {
        if (!userId) return;
        try {
            const response = await fetch(`/user/${userId}/skills`);
            const skills = await response.json();
            existingSkillsList.innerHTML = '<h5>Your Current Skills:</h5>';

            if (skills.length === 0) {
                existingSkillsList.innerHTML += '<p>No skills added yet.</p>';
            } else {
                skills.forEach(skill => {
                    const skillItem = document.createElement('div');
                    skillItem.className = 'project-list-item';
                    skillItem.innerHTML = `
                        <span><img src="${skill.skill_icon_path}" class="skill-list-icon" alt="${skill.skill_name}"> ${skill.skill_name}</span>
                        <button class="btn btn-danger btn-sm delete-skill-btn" data-skill-id="${skill.id}">Delete</button>
                    `;
                    existingSkillsList.appendChild(skillItem);
                });
            }
        } catch (error) {
            console.error('Failed to fetch skills:', error);
        }
    }

    if (addSkillForm) {
        addSkillForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const skillFormData = new FormData(addSkillForm);
            skillFormData.append('userId', userId);

            try {
                const response = await fetch('/skill', {
                    method: 'POST',
                    body: skillFormData,
                });
                const result = await response.json();
                alert(result.message);
                if (response.ok) {
                    addSkillForm.reset();
                    fetchAndDisplaySkills();
                }
            } catch (error) {
                alert('Error adding skill.');
            }
        });
    }

    existingSkillsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-skill-btn')) {
            const skillId = e.target.dataset.skillId;
            if (confirm('Are you sure you want to delete this skill?')) {
                await fetch(`/skill/${skillId}`, { method: 'DELETE' });
                fetchAndDisplaySkills();
            }
        }
    });

    // --- NEW Project Management Logic ---
    const addProjectForm = document.getElementById('add-project-form');
    const existingProjectsList = document.getElementById('existing-projects-list');

    async function fetchAndDisplayProjects() {
        if (!userId) return;
        try {
            const response = await fetch(`/user/${userId}/projects`);
            const projects = await response.json();
            existingProjectsList.innerHTML = '<h5>Your Current Projects:</h5>';
            if (projects.length === 0) {
                existingProjectsList.innerHTML += '<p>You have not added any projects yet.</p>';
            } else {
                projects.forEach(p => {
                    const projectItem = document.createElement('div');
                    projectItem.className = 'project-list-item';
                    projectItem.innerHTML = `
                        <span>${p.project_name}</span>
                        <div class="project-item-actions">
                            <button class="btn btn-secondary btn-sm edit-project-btn" data-project-id="${p.id}" data-project='${JSON.stringify(p)}'>Edit</button>
                            <button class="btn btn-danger btn-sm delete-project-btn" data-project-id="${p.id}">Delete</button>
                        </div>
                    `;
                    existingProjectsList.appendChild(projectItem);
                });
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    }

    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const projectFormData = new FormData(addProjectForm);
            projectFormData.append('userId', userId);

            try {
                const response = await fetch('/project', {
                    method: 'POST',
                    body: projectFormData,
                });
                const result = await response.json();
                alert(result.message);
                if (response.ok) {
                    addProjectForm.reset();
                    fetchAndDisplayProjects(); // Refresh the list
                }
            } catch (error) {
                alert('Error adding project.');
                console.error(error);
            }
        });
    }

    // --- Handle Project Edit and Delete ---
    existingProjectsList.addEventListener('click', async (e) => {
        // Handle Delete
        if (e.target.classList.contains('delete-project-btn')) {
            const projectId = e.target.dataset.projectId;
            if (confirm('Are you sure you want to delete this project?')) {
                try { // This try/catch block is unchanged
                    const response = await fetch(`/project/${projectId}`, { method: 'DELETE' });
                    const result = await response.json();
                    alert(result.message);
                    if (response.ok) {
                        fetchAndDisplayProjects(); // Refresh the list
                    }
                } catch (error) {
                    alert('Error deleting project.');
                }
            }
        }

        // Handle Edit - Open Modal
        if (e.target.classList.contains('edit-project-btn')) {
            const projectData = JSON.parse(e.target.dataset.project);
            document.getElementById('edit-project-id').value = projectData.id;
            document.getElementById('edit-project-name').value = projectData.project_name;
            document.getElementById('edit-project-demo-link').value = projectData.project_demo_link || '';
            document.getElementById('edit-project-source-link').value = projectData.project_source_link || '';
            editProjectModal.classList.remove('hidden');
        }
    });

    // Handle Edit Form Submission
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const projectId = document.getElementById('edit-project-id').value;
            const editFormData = new FormData(editProjectForm);

            try {
                const response = await fetch(`/project/${projectId}`, {
                    method: 'PUT',
                    body: editFormData,
                });
                const result = await response.json();
                alert(result.message);
                if (response.ok) {
                    editProjectModal.classList.add('hidden');
                    fetchAndDisplayProjects(); // Refresh the list
                }
            } catch (error) {
                alert('Error updating project.');
                console.error(error);
            }
        });
    }

    // Handle Cancel Edit
    if (cancelEditProjectBtn) {
        cancelEditProjectBtn.addEventListener('click', () => {
            editProjectModal.classList.add('hidden');
        });
    }

    // Initial fetch of projects
    fetchAndDisplaySkills();
    fetchAndDisplayProjects();

    // --- Handle Cropped Image Preparation ---
    cropAndSaveBtn.addEventListener('click', () => {
        cropper.getCroppedCanvas({ width: 400, height: 400 }).toBlob((blob) => {
            croppedImageBlob = blob; // Store the cropped image data
            document.getElementById('profile-page-picture').src = URL.createObjectURL(blob); // Show preview
            closeAndResetCropper();
            alert('Profile photo prepared. Click "Save All Changes" to upload.');
        }, 'image/jpeg');
    });

    cancelCropBtn.addEventListener('click', closeAndResetCropper);

    function closeAndResetCropper() {
        if (!cropModal.classList.contains('hidden')) {
            cropModal.classList.add('hidden');
        }
        if (cropper) {
            cropper.destroy();
            cropper = null;
            croppedImageBlob = null;
        }
        profilePictureInput.value = '';
    }
});