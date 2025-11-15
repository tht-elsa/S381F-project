const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Session configuration for Vercel (SIMPLIFIED - no memorystore)
app.use(session({
    secret: process.env.SESSION_SECRET || 'vercel-music-app-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// In-memory data storage (resets on cold starts)
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
    res.render('login', { error: error });
});

// Login handler
app.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.redirect('/login?error=Username and password are required');
        }
        
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.redirect('/login?error=User not found');
        }
        
        if (user.password !== password) {
            return res.redirect('/login?error=Invalid password');
        }
        
        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/login?error=Server error during login');
    }
});

// Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
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

// Add music page
app.get('/add-music', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('add-music');
});

// Add music handler
app.post('/add-music', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
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

// Vote for music
app.post('/vote/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
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

// Edit music page
app.get('/edit-music/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
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

// Update music handler
app.post('/edit-music/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
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

// Delete music
app.post('/delete-music/:id', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
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

// Music list page
app.get('/music-list', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    try {
        const sortedMusic = [...music].sort((a, b) => b.votes - a.votes);
        res.render('music-list', { music: sortedMusic });
    } catch (error) {
        console.error('Music list error:', error);
        res.redirect('/dashboard');
    }
});

// Vote page
app.get('/vote', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
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
        memoryUsage: process.memoryUsage()
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

// Debug: Check if users exist
app.get('/debug-users', (req, res) => {
    res.json({
        users: users,
        userCount: users.length
    });
});

// Debug: Check current session
app.get('/debug-session', (req, res) => {
    res.json({
        session: req.session,
        userId: req.session.userId,
        username: req.session.username
    });
});

// Reset demo data
app.get('/reset-demo', (req, res) => {
    // Reset to original demo data
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
    req.session.destroy();
    res.redirect('/login');
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
    console.error(err.stack);
    res.status(500).send(`
        <div style="text-align: center; padding: 50px; font-family: Arial;">
            <h1>500 - Server Error</h1>
            <p>Something went wrong on our end.</p>
            <p><a href="/">Go back to Home</a></p>
        </div>
    `);
});

// Export the app for Vercel
module.exports = app;
