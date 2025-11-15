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

// FIXED Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'vercel-music-app-secret-2024',
    resave: false,
    saveUninitialized: false,
    store: new (require('memorystore')(session))({
        checkPeriod: 86400000
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Handle favicon requests to prevent 404 errors
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

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    const error = req.query.error || null;
    res.render('login', { error: error });
});

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
        
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/login?error=Server error during login');
    }
});

// Add all your other routes here (dashboard, add-music, vote, etc.)
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

// Add your other CRUD routes here...

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <div style="text-align: center; padding: 50px; font-family: Arial;">
            <h1>404 - Page Not Found</h1>
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
