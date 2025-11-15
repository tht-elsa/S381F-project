const express = require('express');
const path = require('path');

const app = express();

// Middleware - CRITICAL: Order matters!
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Simple authentication system (No sessions - works on Vercel)
const activeTokens = new Map();

// Generate simple token
function generateToken(userId, username) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    activeTokens.set(token, { userId, username, timestamp: Date.now() });
    
    // Clean up old tokens (older than 24 hours)
    const now = Date.now();
    for (let [key, value] of activeTokens.entries()) {
        if (now - value.timestamp > 24 * 60 * 60 * 1000) {
            activeTokens.delete(key);
        }
    }
    
    return token;
}

// Verify token
function verifyToken(token) {
    const userData = activeTokens.get(token);
    if (!userData) return null;
    
    // Check if token is expired (24 hours)
    if (Date.now() - userData.timestamp > 24 * 60 * 60 * 1000) {
        activeTokens.delete(token);
        return null;
    }
    
    return userData;
}

// Authentication middleware
const requireAuth = (req, res, next) => {
    let token = req.query.token || req.body.token;
    
    // Also check for token in hidden form fields
    if (!token && req.body && req.body._token) {
        token = req.body._token;
    }
    
    if (!token) {
        return res.redirect('/login?error=Please login first');
    }
    
    const userData = verifyToken(token);
    if (!userData) {
        return res.redirect('/login?error=Session expired, please login again');
    }
    
    req.user = userData;
    req.token = token;
    next();
};

// In-memory data storage
let users = [
    { id: 1, username: 'user1', password: 'password123' },
    { id: 2, username: 'user2', password: 'password123' }
];

let music = [
    { id: 1, title: 'Sample Song 1', artist: 'Artist A', votes: 5 },
    { id: 2, title: 'Sample Song 2', artist: 'Artist B', votes: 3 },
    { id: 3, title: 'Sample Song 3', artist: 'Artist C', votes: 7 }
];

// ===== ROUTES =====

// Home route
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
    const error = req.query.error || null;
    const success = req.query.success || null;
    res.render('login', { error, success });
});

// Login handler - SIMPLIFIED AND GUARANTEED TO WORK
app.post('/login', (req, res) => {
    console.log('LOGIN ATTEMPT - Body:', req.body);
    
    const { username, password } = req.body;
    
    // Basic validation
    if (!username || !password) {
        console.log('Missing username or password');
        return res.redirect('/login?error=Username and password are required');
    }
    
    // Find user
    const user = users.find(u => u.username === username);
    console.log('User found:', user);
    
    if (!user) {
        console.log('User not found:', username);
        return res.redirect('/login?error=Invalid username or password');
    }
    
    // Check password
    if (user.password !== password) {
        console.log('Invalid password for user:', username);
        return res.redirect('/login?error=Invalid username or password');
    }
    
    // Generate token
    const token = generateToken(user.id, user.username);
    console.log('Generated token:', token);
    console.log('Login SUCCESSFUL for:', username);
    
    // IMMEDIATE REDIRECT with token
    res.redirect(`/dashboard?token=${token}`);
});

// Dashboard - PROTECTED
app.get('/dashboard', requireAuth, (req, res) => {
    try {
        const sortedMusic = [...music].sort((a, b) => b.votes - a.votes);
        console.log('Rendering dashboard for:', req.user.username);
        
        res.render('dashboard', {
            username: req.user.username,
            music: sortedMusic,
            token: req.token
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/login?error=Error loading dashboard');
    }
});

// Add music page - PROTECTED
app.get('/add-music', requireAuth, (req, res) => {
    res.render('add-music', { token: req.token });
});

// Add music handler - PROTECTED
app.post('/add-music', requireAuth, (req, res) => {
    try {
        const { title, artist } = req.body;
        const newMusic = {
            id: music.length + 1,
            title: title || 'Unknown Title',
            artist: artist || 'Unknown Artist',
            votes: 0
        };
        music.push(newMusic);
        res.redirect(`/dashboard?token=${req.token}`);
    } catch (error) {
        console.error('Add music error:', error);
        res.redirect(`/dashboard?token=${req.token}`);
    }
});

// Vote for music - PROTECTED
app.post('/vote/:id', requireAuth, (req, res) => {
    try {
        const musicId = parseInt(req.params.id);
        const musicItem = music.find(m => m.id === musicId);
        
        if (musicItem) {
            musicItem.votes += 1;
        }
        
        res.redirect(`/dashboard?token=${req.token}`);
    } catch (error) {
        console.error('Vote error:', error);
        res.redirect(`/dashboard?token=${req.token}`);
    }
});

// Edit music page - PROTECTED
app.get('/edit-music/:id', requireAuth, (req, res) => {
    try {
        const musicId = parseInt(req.params.id);
        const musicItem = music.find(m => m.id === musicId);
        
        if (!musicItem) {
            return res.redirect(`/dashboard?token=${req.token}`);
        }
        
        res.render('edit-music', {
            music: musicItem,
            token: req.token
        });
    } catch (error) {
        console.error('Edit music error:', error);
        res.redirect(`/dashboard?token=${req.token}`);
    }
});

// Update music handler - PROTECTED
app.post('/edit-music/:id', requireAuth, (req, res) => {
    try {
        const musicId = parseInt(req.params.id);
        const musicItem = music.find(m => m.id === musicId);
        
        if (musicItem) {
            musicItem.title = req.body.title || musicItem.title;
            musicItem.artist = req.body.artist || musicItem.artist;
        }
        
        res.redirect(`/dashboard?token=${req.token}`);
    } catch (error) {
        console.error('Update music error:', error);
        res.redirect(`/dashboard?token=${req.token}`);
    }
});

// Delete music - PROTECTED
app.post('/delete-music/:id', requireAuth, (req, res) => {
    try {
        const musicId = parseInt(req.params.id);
        const index = music.findIndex(m => m.id === musicId);
        
        if (index !== -1) {
            music.splice(index, 1);
        }
        
        res.redirect(`/dashboard?token=${req.token}`);
    } catch (error) {
        console.error('Delete music error:', error);
        res.redirect(`/dashboard?token=${req.token}`);
    }
});

// Music list page - PROTECTED
app.get('/music-list', requireAuth, (req, res) => {
    try {
        const sortedMusic = [...music].sort((a, b) => b.votes - a.votes);
        res.render('music-list', {
            music: sortedMusic,
            token: req.token
        });
    } catch (error) {
        console.error('Music list error:', error);
        res.redirect(`/dashboard?token=${req.token}`);
    }
});

// Vote page - PROTECTED
app.get('/vote', requireAuth, (req, res) => {
    try {
        res.render('vote', {
            music: music,
            token: req.token
        });
    } catch (error) {
        console.error('Vote page error:', error);
        res.redirect(`/dashboard?token=${req.token}`);
    }
});

// ===== DEBUG & TEST ROUTES =====

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        activeUsers: activeTokens.size
    });
});

// Test login (auto login as user1)
app.get('/test-login', (req, res) => {
    const user = users.find(u => u.id === 1);
    const token = generateToken(user.id, user.username);
    console.log('Auto-login token:', token);
    res.redirect(`/dashboard?token=${token}`);
});

// Check users
app.get('/debug-users', (req, res) => {
    res.json({
        users: users,
        activeTokens: Array.from(activeTokens.entries())
    });
});

// Reset demo data
app.get('/reset-demo', (req, res) => {
    users = [
        { id: 1, username: 'user1', password: 'password123' },
        { id: 2, username: 'user2', password: 'password123' }
    ];
    
    music = [
        { id: 1, title: 'Sample Song 1', artist: 'Artist A', votes: 5 },
        { id: 2, title: 'Sample Song 2', artist: 'Artist B', votes: 3 },
        { id: 3, title: 'Sample Song 3', artist: 'Artist C', votes: 7 }
    ];
    
    activeTokens.clear();
    
    res.json({
        message: 'Demo data reset successfully',
        users: users.length,
        music: music.length
    });
});

// Logout
app.get('/logout', (req, res) => {
    const token = req.query.token;
    if (token) {
        activeTokens.delete(token);
    }
    res.redirect('/login?success=Logged out successfully');
});

// Handle favicon
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <div style="text-align: center; padding: 50px; font-family: Arial;">
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <p><a href="/">Go back to Home</a></p>
        </div>
    `);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send(`
        <div style="text-align: center; padding: 50px; font-family: Arial;">
            <h1>500 - Server Error</h1>
            <p>Something went wrong on our end.</p>
            <p><a href="/">Go back to Home</a></p>
        </div>
    `);
});

// Start server
const PORT = process.env.PORT || 3000;

module.exports = app;
