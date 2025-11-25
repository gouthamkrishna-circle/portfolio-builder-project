document.addEventListener('DOMContentLoaded', () => {
    AOS.init();
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotIcon = document.querySelector(".chatbot-icon");
    const closeChatbotBtn = document.getElementById("close-chatbot-btn");
    const chatbotForm = document.getElementById("chatbot-form");
    const chatbotInput = document.getElementById("chatbot-input");
    const chatBody = document.getElementById('chatbot-body');

    const stopVoiceBtn = document.getElementById('stop-voice-btn');
    const micBtn = document.getElementById('mic-btn');

    // Hamburger menu might not exist on all pages, so check for it
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".navbar");

    // Function to proactively ask for microphone permission
    function requestMicPermission() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Permission granted, we don't need to do anything with the stream, just close it.
                stream.getTracks().forEach(track => track.stop());
                console.log("Microphone permission granted.");
            })
            .catch(err => {
                console.error("Microphone permission denied:", err);
            });
    }

    function openChatbot() {
        chatbotWindow.classList.remove('hidden');
        requestMicPermission(); // Ask for permission when chatbot opens
    }

    function closeChatbot() {
        chatbotWindow.classList.add('hidden');
    }

    function addMessageToChat(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        // Simple check for loading indicator
        if (text === '<div class="loader"></div>') {
            messageElement.innerHTML = text;
        } else {
            messageElement.textContent = text;
        }
        
        chatBody.appendChild(messageElement);
        chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll to the latest message
        return messageElement;
    }

    // Function to speak the bot's reply
    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.volume = 1; // Set volume to maximum (0 to 1)

        // Add visual indicator when bot starts/stops speaking
        utterance.onstart = () => {
            stopVoiceBtn.classList.add('speaking');
        };
        utterance.onend = () => {
            stopVoiceBtn.classList.remove('speaking');
        };

        speechSynthesis.speak(utterance);
    }

    async function handleChatSubmit(e) {
        e.preventDefault();
        // Stop any currently speaking voice
        speechSynthesis.cancel();

        const message = chatbotInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);
        chatbotInput.value = '';

        const loadingIndicator = addMessageToChat('bot', '<div class="loader"></div>');

        try {
            // Call your backend endpoint using a relative path
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) throw new Error('Failed to get response from server.');

            const data = await response.json();
            const botReply = data.reply;

            chatBody.removeChild(loadingIndicator);
            addMessageToChat('bot', botReply);
            speak(botReply); // Make the bot speak the reply
        } catch (error) {
            console.error("Error during chat:", error);
            chatBody.removeChild(loadingIndicator);
            addMessageToChat('bot', 'Sorry, something went wrong. Please try again.');
        }
    }

    // --- Speech Recognition (User Voice Input) ---

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;    
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition(); // Check if required methods are available
        if (typeof recognition.start === 'function' && typeof recognition.stop === 'function') {

            recognition.lang = 'en-US'; // Set the language for recognition

         recognition.onstart = () => {
            micBtn.classList.add('listening');
            chatbotInput.placeholder = 'Listening...';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatBody.removeChild(chatBody.lastChild); // Remove "Listening..." message
            chatbotInput.value = transcript;
            // Automatically submit the form after a short delay
            setTimeout(() => {
                chatbotForm.dispatchEvent(new Event('submit'));
            }, 500);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (chatBody.lastChild.textContent === 'Listening...') {
                chatBody.removeChild(chatBody.lastChild); // Remove "Listening..." message on error
            }
            addMessageToChat('bot', 'Sorry, I could not understand your voice.');
        };

        recognition.onend = () => {
            micBtn.classList.remove('listening');
            chatbotInput.placeholder = 'Ask me anything...';
            if (chatBody.lastChild && chatBody.lastChild.textContent === 'Listening...') {
                chatBody.removeChild(chatBody.lastChild); // Clean up if recognition ends abruptly
            }
        };

        micBtn.addEventListener('click', () => {
            speechSynthesis.cancel();
            addMessageToChat('bot', 'Listening...'); // Add visual feedback
            recognition.start();
        }); // End of micBtn event listener
        } else { // This else corresponds to the inner if
            micBtn.style.display = 'none';
            console.log("Speech Recognition methods not fully supported.");
        }
    } else { // This else corresponds to if (SpeechRecognition)

        micBtn.style.display = 'none'; // Hide mic button if browser doesn't support it
        console.log("Speech Recognition not supported in this browser.");
    }

    // --- Event Listeners ---
    if (chatbotIcon) chatbotIcon.addEventListener("click", openChatbot);
    if (closeChatbotBtn) closeChatbotBtn.addEventListener("click", closeChatbot);
    if (stopVoiceBtn) stopVoiceBtn.addEventListener('click', () => speechSynthesis.cancel());
    if (chatbotForm) chatbotForm.addEventListener("submit", handleChatSubmit);

    // --- Navigation Logic (only if navbar exists) ---
    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        });

        document.querySelectorAll('.navbar a').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                // Allow normal navigation for external pages (login, profile, feedback) or the logout action.
                // Only prevent default for same-page anchor links (like #home, #about).
                if (!href.startsWith('#')) {
                    return;
                }
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
                if (hamburger.classList.contains('active')) {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            });
        });

        const sections = document.querySelectorAll('section[id]');
        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (window.pageYOffset >= sectionTop - 70) {
                    current = section.getAttribute('id');
                }
            });

            navMenu.querySelectorAll('a').forEach(a => {
                a.classList.remove('active');
                if (a.getAttribute('href').includes(current)) {
                    a.classList.add('active');
                }
            });
        });
    }

    // --- Dynamic Content Update on Main Page ---
    const userName = localStorage.getItem('userName');
    const userAbout = localStorage.getItem('userAbout');
    const userHeroDescription = localStorage.getItem('userHeroDescription');
    const userTitle = localStorage.getItem('userTitle');
    const userProfilePic = localStorage.getItem('userProfilePic');
    const userResume = localStorage.getItem('userResume');
    const userContactEmail = localStorage.getItem('userContactEmail');
    const userId = localStorage.getItem('userId');

    // Check if we are on the main page by looking for specific elements
    const heroNameElement = document.getElementById('hero-name');
    const loginNavLink = document.getElementById('login-nav-link');
    const logoutNavLink = document.getElementById('logout-nav-link');
    const profileNavLink = document.getElementById('profile-nav-link');
    const feedbackNavLink = document.getElementById('feedback-nav-link');
    const updateProfileBtn = document.getElementById('update-profile-btn');
    const profileSection = document.getElementById('profile');

    if (heroNameElement) { // This block will only run on index.html
        if (userName) {
            // --- User is Logged In ---
            if (loginNavLink) loginNavLink.style.display = 'none';
            if (logoutNavLink) logoutNavLink.style.display = 'inline';
            if (updateProfileBtn) updateProfileBtn.style.display = 'inline-block';
            if (feedbackNavLink) feedbackNavLink.style.display = 'inline';
            if (profileNavLink) profileNavLink.style.display = 'inline'; // Show profile link
            // The profile section on index.html is no longer needed as it has its own page
            // if (profileSection) profileSection.style.display = 'block';

            // Update portfolio content with data from localStorage
            heroNameElement.textContent = `I'm ${userName}`;
            
            const heroSkillsElement = document.getElementById('hero-skills');
            if (heroSkillsElement && userTitle) {
                heroSkillsElement.innerHTML = `I Am <strong>${userTitle}</strong>`;
            }

            const aboutContentElement = document.getElementById('about-content');
            if (aboutContentElement && userAbout) {
                aboutContentElement.innerHTML = `<p>${userAbout}</p>`;
            }

            const heroDescElement = document.querySelector('.hero-section .description');
            if (heroDescElement && userHeroDescription) {
                heroDescElement.textContent = userHeroDescription;
            }

            // Update main profile image
            const mainProfileImg = document.getElementById('main-profile-img');
            if (mainProfileImg && userProfilePic && userProfilePic !== 'null') {
                mainProfileImg.src = userProfilePic;
            }

            // Update Resume button link
            const resumeButton = document.getElementById('resume-view-btn');
            if (resumeButton && userResume && userResume !== 'null') {
                resumeButton.style.display = 'inline-block'; // Just show the button
            }

            // Update Contact Me button
            const contactContent = document.getElementById('contact-content');
            if (contactContent && userContactEmail && userContactEmail !== 'null') {
                contactContent.innerHTML = `
                    <p>I'm available for freelance work and open to new opportunities. Feel free to reach out!</p>
                    <a href="mailto:${userContactEmail}" class="btn btn-primary mt-4">Email Me</a>
                `;
            }

            // --- DYNAMICALLY LOAD SKILLS ---
            const skillsGrid = document.getElementById('skills-grid-container');
            async function loadSkills() {
                if (!userId || !skillsGrid) return;
                try {
                    const response = await fetch(`/user/${userId}/skills`);
                    const skills = await response.json();
                    skillsGrid.innerHTML = '';
                    if (skills.length > 0) {
                        skills.forEach(skill => {
                            const skillCard = `
                                <div class="skill-card" data-aos="fade-up">
                                    <img src="${skill.skill_icon_path}" alt="${skill.skill_name}" class="skill-card-icon">
                                    <h3>${skill.skill_name}</h3>
                                </div>
                            `;
                            skillsGrid.innerHTML += skillCard;
                        });
                    } else {
                        skillsGrid.innerHTML = '<p>No skills have been added yet.</p>';
                    }
                } catch (error) {
                    console.error('Could not load skills', error);
                }
            }
            loadSkills();

            // --- DYNAMICALLY LOAD PROJECTS ---
            const projectsContainer = document.querySelector('.projects-container');
            async function loadProjects() {
                if (!userId || !projectsContainer) return;
                try {
                    const response = await fetch(`/user/${userId}/projects`);
                    const projects = await response.json();
                    projectsContainer.innerHTML = ''; // Clear static projects
                    if (projects.length > 0) {
                        projects.forEach(p => {
                            const projectCard = `
                                <div class="project-card" data-aos="fade-up">
                                    ${p.project_thumbnail_path ? `<img src="${p.project_thumbnail_path}" alt="${p.project_name}" class="project-thumbnail">` : ''}
                                    <h3>${p.project_name}</h3>
                                    <p>A project by ${userName}.</p>
                                    <div class="project-links">
                                        <a href="${p.project_demo_link || '#'}" class="btn btn-primary" target="_blank">Live Demo</a>
                                        <a href="${p.project_source_link || '#'}" class="btn btn-secondary" target="_blank">Source Code</a>
                                    </div>
                                </div>
                            `;
                            projectsContainer.innerHTML += projectCard;
                        });
                    } else {
                        projectsContainer.innerHTML = '<p>No projects have been added yet.</p>';
                    }
                } catch (error) {
                    console.error('Could not load projects', error);
                    projectsContainer.innerHTML = '<p>Could not load projects at this time.</p>';
                }
            }
            loadProjects();

            // Add logout functionality
            if (logoutNavLink) {
                logoutNavLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Clear all user data from localStorage
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userHeroDescription');
                    localStorage.removeItem('userAbout');                    
                    localStorage.removeItem('userTitle');
                    localStorage.removeItem('userProfilePic');
                    localStorage.removeItem('userResume');
                    localStorage.removeItem('userContactEmail');
                    
                    // Redirect to the login page
                    window.location.href = 'login.html';
                });
            }
        }
    }
});
