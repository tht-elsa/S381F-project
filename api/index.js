const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware - CRITICAL ORDER
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Vercel-compatible Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'music-app-vercel-secret-key-2024',
    resave: true,  // Changed to true for Vercel
    saveUninitialized: true,  // Changed to true for Vercel
    store: new MemoryStore({
        checkPeriod: 86400000 // 24 hours
    }),
    cookie: {
        secure: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

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

// ===== MIDDLEWARE =====
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login?error=Please login first');
    }
    next();
};

// ===== ROUTES =====

// Home route
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    const error = req.query.error || null;
    res.render('login', { error: error });
});

// Login handler - ENHANCED FOR VERCEL
app.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Login attempt for:', username);
        
        if (!username || !password) {
            return res.redirect('/login?error=Username and password are required');
        }
        
        const user = users.find(u => u.username === username);
        
        if (!user) {
            console.log('User not found:', username);
            return res.redirect('/login?error=User not found');
        }
        
        if (user.password !== password) {
            console.log('Invalid password for:', username);
            return res.redirect('/login?error=Invalid password');
        }
        
        // Set session data
        req.session.userId = user.id;
        req.session.username = user.username;
        
        console.log('Login successful for:', username);
        console.log('Session ID:', req.sessionID);
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/login?error=Session error');
            }
            res.redirect('/dashboard');
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/login?error=Server error during login');
    }
});

// Dashboard - PROTECTED
app.get('/dashboard', requireAuth, (req, res) => {
    try {
        const sortedMusic = [...music].sort((a, b) => b.votes - a.votes);
        res.render('dashboard', { 
            username: req.session.username,
            music: sortedMusic
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/login');
    }
});

// Add music page - PROTECTED
app.get('/add-music', requireAuth, (req, res) => {
    res.render('add-music');
});

// Add music handler - PROTECTED
app.post('/add-music', requireAuth, (req, res) => {
    try {
        const { title, artist } = req.body;
        const newMusic = {
            id: music.length + 1,
            title,
            artist,
            votes: 0
        };
        music.push(newMusic);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Add music error:', error);
        res.redirect('/dashboard');
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
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Vote error:', error);
        res.redirect('/dashboard');
    }
});

// Edit music page - PROTECTED
app.get('/edit-music/:id', requireAuth, (req, res) => {
    try {
        const musicId = parseInt(req.params.id);
        const musicItem = music.find(m => m.id === musicId);
        
        if (!musicItem) {
            return res.redirect('/dashboard');
        }
        
        res.render('edit-music', { music: musicItem });
    } catch (error) {
        console.error('Edit music error:', error);
        res.redirect('/dashboard');
    }
});

// Update music handler - PROTECTED
app.post('/edit-music/:id', requireAuth, (req, res) => {
    try {
        const musicId = parseInt(req.params.id);
        const musicItem = music.find(m => m.id === musicId);
        
        if (musicItem) {
            musicItem.title = req.body.title;
            musicItem.artist = req.body.artist;
        }
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Update music error:', error);
        res.redirect('/dashboard');
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
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Delete music error:', error);
        res.redirect('/dashboard');
    }
});

// Music list page - PROTECTED
app.get('/music-list', requireAuth, (req, res) => {
    try {
        const sortedMusic = [...music].sort((a, b) => b.votes - a.votes);
        res.render('music-list', { music: sortedMusic });
    } catch (error) {
        console.error('Music list error:', error);
        res.redirect('/dashboard');
    }
});

// Vote page - PROTECTED
app.get('/vote', requireAuth, (req, res) => {
    try {
        res.render('vote', { music: music });
    } catch (error) {
        console.error('Vote page error:', error);
        res.redirect('/dashboard');
    }
});

// ===== DEBUG ROUTES =====

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        session: {
            userId: req.session.userId,
            username: req.session.username
        }
    });
});

// Check data status
app.get('/check-data', (req, res) => {
    res.json({ 
        users: users.length,
        music: music.length,
        currentUsers: users.map(u => u.username)
    });
});

// Debug session
app.get('/debug-session', (req, res) => {
    res.json({
        sessionId: req.sessionID,
        userId: req.session.userId,
        username: req.session.username,
        session: req.session,
        cookies: req.cookies
    });
});

// Test login (auto login as user1)
app.get('/test-login', (req, res) => {
    req.session.userId = 1;
    req.session.username = 'user1';
    req.session.save((err) => {
        if (err) {
            return res.send('Session save error: ' + err.message);
        }
        res.redirect('/dashboard');
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
    
    res.json({ 
        message: 'Demo data reset successfully',
        users: users.length,
        music: music.length
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
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

module.exports = app;
