const express = require('express');
const mysql = require('mysql2/promise'); // Use mysql2/promise for MySQL
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fetch = require('node-fetch'); // You might need to install this: npm install node-fetch@2
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Cloudinary Configuration ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Multer Configuration to use Cloudinary ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'portfolio-assets', // A folder name in your Cloudinary account
        allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
        // transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional: resize images
    }
});

// Use upload.fields to handle multiple different file uploads
const upload = multer({ storage: storage }).fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'resumePdf', maxCount: 1 },
    { name: 'projectThumbnail', maxCount: 1 },
    { name: 'skillIcon', maxCount: 1 } // Add new field for skill icons
]);

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => res.status(204));

// --- Database Connection ---
// Use a connection pool for better performance
const dbOptions = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'my_project_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Only add SSL configuration if we are in a production environment (like Render connecting to TiDB)
// We check for NODE_ENV=production, which should only be set on the live server.
if (process.env.NODE_ENV === 'production') {
    dbOptions.ssl = { rejectUnauthorized: false };
}

const dbPool = mysql.createPool(dbOptions);

// --- NEW Route for Chatbot ---
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) {
        return res.status(400).json({ message: 'Message is required.' });
    }

    // IMPORTANT: Use an environment variable for your API key
    const apiKey = process.env.GEMINI_API_KEY; // Securely load the key from .env file
    // The URL must be in backticks (`) to be a valid template literal in JavaScript.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`; // Using a confirmed model from your available list

    const payload = {
        contents: [{ parts: [{ text: userMessage }] }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", data);
            // Send the specific error message from the API back to the client
            return res.status(500).json({ message: "API Error: " + (data.error?.message || "Unknown error") });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unexpected API response format.";
        res.json({ reply: reply });
    } catch (error) {
        console.error('Request Error:', error);
        res.status(500).json({ message: 'Request Error: ' + error });
    }
});


// --- Login Route ---
app.post('/login', async (req, res) => {
    // The form sends 'email' and 'password', so we use those.
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        // Send a JSON error response
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // 1. Find the user in the database by their email
        const [rows] = await dbPool.execute(
            'SELECT * FROM users WHERE email = ?', // Use ? for placeholders in mysql2
            [email]
        );

        if (rows.length === 0) {
            // User not found, send a JSON error
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = rows[0];

        // 2. Compare the submitted password with the stored hash
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            // 3. Passwords match! Send a success JSON response.
            // The frontend will handle the redirect.
            res.status(200).json({
                message: 'Login successful!',
                redirectUrl: 'index.html',
                user: {
                    id: user.id, // Send user ID on login
                    name: user.username, // 'username' column stores the name
                    about: user.about,
                    heroDescription: user.hero_description,
                    title: user.user_title, // Use the new column name
                    profilePicture: user.profile_picture_path,
                    resume: user.resume_path,
                    contactEmail: user.contact_email,
                    role: user.role
                }
            });
        } else {
            // Passwords do not match, send a JSON error
            res.status(401).json({ message: 'Invalid email or password.' });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An error occurred on the server.' });
    }
});

// --- Signup Route ---
app.post('/signup', async (req, res) => {
    const { name, email, password, about, heroDescription, skills } = req.body;

    if (!name || !email || !password || !about || !skills || !heroDescription) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbPool.execute(
            'INSERT INTO users (username, email, password, about, user_title, hero_description, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, about, skills, heroDescription, 'user']
        );
        res.status(201).json({ message: 'Sign up successfully completed! You can now log in.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'This email address is already registered.' });
        }
        console.error('Signup error:', error);
        res.status(500).json({ message: 'An error occurred during sign-up.' });
    }
});

// --- NEW Admin Login Route ---
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const [rows] = await dbPool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = rows[0];

        // CRITICAL: Check if the user has the 'admin' role
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied. Not an administrator.' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            res.status(200).json({
                message: 'Admin login successful!',
                redirectUrl: 'admin-dashboard.html', // Redirect to the new admin dashboard
                user: {
                    name: user.username,
                    role: user.role
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'An error occurred on the server.' });
    }
});

// --- NEW Route to Get All Users for Admin ---
app.get('/admin/users', async (req, res) => {
    try {
        // Fetch all users that have the 'user' role
        const [users] = await dbPool.execute("SELECT id, username, email, role FROM users WHERE role = 'user'");
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

// --- NEW Route to Get a Single User's Details for Admin ---
app.get('/admin/user/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [rows] = await dbPool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const user = rows[0];
        // We don't want to send the password hash
        delete user.password;
        res.status(200).json(user);
    } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        res.status(500).json({ message: 'Failed to fetch user details.' });
    }
});

// --- NEW Route to Delete a User ---
app.delete('/admin/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const [result] = await dbPool.execute('DELETE FROM users WHERE id = ?', [userId]);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: `User with ID ${userId} has been deleted successfully.` });
        } else {
            res.status(404).json({ message: `User with ID ${userId} not found.` });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'An error occurred while deleting the user.' });
    }
});

// --- NEW UNIFIED Profile Update Route ---
app.post('/profile/update-all', upload, async (req, res) => {
    const { email, name, about, heroDescription, skills, contactEmail } = req.body; // 'skills' here is the user_title
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    try {
        await dbPool.execute('UPDATE users SET username = ?, about = ?, user_title = ?, hero_description = ?, contact_email = ? WHERE email = ?', [name, about, skills, heroDescription, contactEmail, email]);
    } catch (error) {
        console.error('Profile text update error:', error);
        return res.status(500).json({ message: 'An error occurred while updating details.' });
    }

    // --- Part 2: Handle File Data ---
    const profilePictureFile = req.files['profilePicture'] ? req.files['profilePicture'][0] : null;
    const resumeFile = req.files['resumePdf'] ? req.files['resumePdf'][0] : null;

    try {
        if (profilePictureFile) {
            // The path is now a full URL from Cloudinary
            await dbPool.execute('UPDATE users SET profile_picture_path = ? WHERE email = ?', [profilePictureFile.path, email]);
        }

        if (resumeFile) {
            // The path is now a full URL from Cloudinary
            await dbPool.execute('UPDATE users SET resume_path = ? WHERE email = ?', [resumeFile.path, email]);
        }

        // --- Part 3: Fetch and Return All Updated User Data ---
        const [rows] = await dbPool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const updatedUser = rows[0];

        res.status(200).json({
            message: 'Profile updated successfully!',
            updatedUser: {
                userName: updatedUser.username, // This key is correct
                userAbout: updatedUser.about, // This key is correct
                userTitle: updatedUser.user_title, // Send back the new title
                userHeroDescription: updatedUser.hero_description,
                userProfilePic: updatedUser.profile_picture_path, // This key is correct
                userResume: updatedUser.resume_path, // This key is correct
                userContactEmail: updatedUser.contact_email,
                userEmail: updatedUser.email, // Add email for consistency
                userRole: updatedUser.role // This key is correct
            }
        });

    } catch (error) {
        console.error('Profile file update error:', error);
        return res.status(500).json({ message: 'An error occurred while updating files.' });
    }
});

// --- NEW Project Management Routes ---

// Add a new project
app.post('/project', upload, async (req, res) => {
    const { userId, projectName, demoLink, sourceLink } = req.body;
    const thumbnailFile = req.files['projectThumbnail'] ? req.files['projectThumbnail'][0] : null;
    const thumbnailPath = thumbnailFile ? thumbnailFile.path : null; // Use Cloudinary path

    if (!userId || !projectName) {
        return res.status(400).json({ message: 'User ID and Project Name are required.' });
    }

    try {
        await dbPool.execute(
            'INSERT INTO projects (user_id, project_name, project_demo_link, project_source_link, project_thumbnail_path) VALUES (?, ?, ?, ?, ?)',
            [userId, projectName, demoLink, sourceLink, thumbnailPath]
        );
        res.status(201).json({ message: 'Project added successfully!' });
    } catch (error) {
        console.error('Error adding project:', error);
        res.status(500).json({ message: 'Failed to add project.' });
    }
});

// Get all projects for a user
app.get('/user/:userId/projects', async (req, res) => {
    const { userId } = req.params;
    try {
        const [projects] = await dbPool.execute('SELECT * FROM projects WHERE user_id = ?', [userId]);
        res.status(200).json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Failed to fetch projects.' });
    }
});

// Update an existing project
app.put('/project/:projectId', upload, async (req, res) => {
    const { projectId } = req.params;
    const { projectName, demoLink, sourceLink } = req.body;
    const thumbnailFile = req.files['projectThumbnail'] ? req.files['projectThumbnail'][0] : null;

    if (!projectName) {
        return res.status(400).json({ message: 'Project Name is required.' });
    }

    try {
        // The 'o' was a syntax error that would crash the server. It has been removed.
        if (thumbnailFile) {
            // Use Cloudinary path
            await dbPool.execute('UPDATE projects SET project_thumbnail_path = ? WHERE id = ?', [thumbnailFile.path, projectId]);
        }

        await dbPool.execute(
            'UPDATE projects SET project_name = ?, project_demo_link = ?, project_source_link = ? WHERE id = ?',
            [projectName, demoLink, sourceLink, projectId]
        );

        res.status(200).json({ message: 'Project updated successfully!' });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Failed to update project.' });
    }
});

// Delete a project
app.delete('/project/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        await dbPool.execute('DELETE FROM projects WHERE id = ?', [projectId]);
        res.status(200).json({ message: 'Project deleted successfully.' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Failed to delete project.' });
    }
});

// --- NEW Skill Management Routes ---

// Add a new skill
app.post('/skill', upload, async (req, res) => {
    const { userId, skillName } = req.body; // Multer will populate req.body with text fields
    const skillIconFile = req.files['skillIcon'] ? req.files['skillIcon'][0] : null;
    const iconPath = skillIconFile ? skillIconFile.path : null; // Use Cloudinary path

    if (!userId || !skillName || !skillIconFile) {
        return res.status(400).json({ message: 'User ID, Skill Name, and Skill Icon are required.' });
    }
    try {
        await dbPool.execute(
            'INSERT INTO skills (user_id, skill_name, skill_icon_path) VALUES (?, ?, ?)',
            [userId, skillName, iconPath]
        );
        res.status(201).json({ message: 'Skill added successfully!' });
    } catch (error) {
        console.error('Error adding skill:', error);
        res.status(500).json({ message: 'Failed to add skill.' });
    }
});

// Get all skills for a user
app.get('/user/:userId/skills', async (req, res) => {
    const { userId } = req.params;
    try {
        const [skills] = await dbPool.execute('SELECT * FROM skills WHERE user_id = ?', [userId]);
        res.status(200).json(skills);
    } catch (error) {
        console.error('Error fetching skills:', error);
        res.status(500).json({ message: 'Failed to fetch skills.' });
    }
});

// Delete a skill
app.delete('/skill/:skillId', async (req, res) => {
    const { skillId } = req.params;
    try {
        // First, get the skill to find the icon path to delete the file
        // We no longer need to delete the file from the local disk
        // Then, delete the record from the database
        await dbPool.execute('DELETE FROM skills WHERE id = ?', [skillId]);
        res.status(200).json({ message: 'Skill deleted successfully.' });
    } catch (error) {
        console.error('Error deleting skill:', error);
        res.status(500).json({ message: 'Failed to delete skill.' });
    }
});

// --- NEW Feedback Routes ---

// Submit feedback
app.post('/feedback', async (req, res) => {
    const { userEmail, message } = req.body;

    if (!userEmail || !message) {
        return res.status(400).json({ message: 'Email and message are required.' });
    }

    try {
        // We can save a userId of 0 or NULL for non-logged-in users
        await dbPool.execute(
            'INSERT INTO feedback (user_id, user_email, message) VALUES (?, ?, ?)',
            [null, userEmail, message] // Using NULL for anonymous feedback
        );

        // --- Send Email Notification to Admin ---
        // IMPORTANT: Replace placeholders with your actual Gmail and App Password.
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, // Use environment variable for email user
                pass: process.env.GMAIL_APP_PASS    // Use environment variable for email app password
            }
        });

        const mailOptions = {
            from: `"${userEmail} via Portfolio Platform" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER, // Send the email to yourself
            replyTo: userEmail, // This is the crucial change
            subject: 'New Feedback Received on Your Platform!',
            html: `
                <h3>You have received new feedback.</h3>
                <p><b>From:</b> ${userEmail}</p>
                <p><b>Message:</b></p>
                <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px;">${message}</blockquote>
                <hr>
                <p><i>This is an automated message from your portfolio platform.</i></p>
            `
        };

        // Send the email but don't block the user's response
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending feedback email:', error);
            } else {
                console.log('Feedback email sent: ' + info.response);
            }
        });

        res.status(201).json({ message: 'Thank you! Your feedback has been submitted successfully.' });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Failed to submit feedback.' });
    }
});

// Get all feedback for admin
app.get('/admin/feedback', async (req, res) => {
    try {
        const [feedback] = await dbPool.execute("SELECT user_email, message, submitted_at FROM feedback ORDER BY submitted_at DESC");
        res.status(200).json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Failed to fetch feedback.' });
    }
});

// --- Root Route ---
// Redirects the root URL ('/') to the login page.
app.get('/', (req, res) => {
    res.redirect('/welcome.html');
});

// Serve static files (like index.html) from the current directory
app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});