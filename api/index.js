// api/index.js
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Session configuration for serverless
app.use(session({
    secret: process.env.SESSION_SECRET || 'vercel-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
        secure: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// In-memory data storage (will reset on cold starts)
let users = [
    { id: 1, username: 'user1', password: 'password123' },
    { id: 2, username: 'user2', password: 'password123' }
];

let music = [
    { id: 1, title: 'Sample Song 1', artist: 'Artist A', votes: 5 },
    { id: 2, title: 'Sample Song 2', artist: 'Artist B', votes: 3 },
    { id: 3, title: 'Sample Song 3', artist: 'Artist C', votes: 7 }
];

// Routes (same as your current routes)
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
        const user = users.find(u => u.username === username);
        
        if (!user || user.password !== password) {
            return res.redirect('/login?error=Invalid credentials');
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        res.redirect('/dashboard');
    } catch (error) {
        res.redirect('/login?error=Server error');
    }
});

// Add all your other routes here (dashboard, add-music, vote, etc.)
// ... include all your existing routes from server.js

// Export as Vercel serverless function
module.exports = app;
