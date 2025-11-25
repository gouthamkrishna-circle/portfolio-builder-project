document.addEventListener('DOMContentLoaded', () => {
    const resumeContainer = document.getElementById('resume-container');
    const resumePlaceholder = document.getElementById('resume-placeholder');
    const userResumePath = localStorage.getItem('userResume');

    if (userResumePath && userResumePath !== 'null') {
        // Create an embed element to display the PDF
        const embed = document.createElement('embed');
        embed.src = userResumePath;
        embed.type = 'application/pdf';
        embed.width = '100%';
        embed.height = '800px'; // Adjust height as needed

        // Replace the placeholder with the PDF embed
        if(resumePlaceholder) {
            resumePlaceholder.remove();
        }
        resumeContainer.appendChild(embed);
    } else {
        // If no resume is found
        if(resumePlaceholder) resumePlaceholder.textContent = 'No resume has been uploaded. Please upload one on your profile page.';
    }
});