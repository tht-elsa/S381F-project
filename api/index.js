const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'music-app-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Demo accounts data
const demoAccounts = [
  { id: 1, username: 'user1', password: 'password123' },
  { id: 2, username: 'user2', password: 'password123' }
];

// Sample music data
let musicData = [
  { id: 1, title: 'Song One', artist: 'Artist A', votes: 0 },
  { id: 2, title: 'Song Two', artist: 'Artist B', votes: 0 },
  { id: 3, title: 'Song Three', artist: 'Artist C', votes: 0 }
];

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    activeUsers: 0
  });
});

// Login page
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    error: null,
    demoAccounts: demoAccounts.map(acc => ({ username: acc.username }))
  });
});

// Login handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Find user in demo accounts
  const user = demoAccounts.find(acc => acc.username === username);
  
  if (!user) {
    return res.render('login', { 
      error: 'Invalid username or password',
      demoAccounts: demoAccounts.map(acc => ({ username: acc.username }))
    });
  }

  // For demo purposes, simple password check
  if (user.password !== password) {
    return res.render('login', { 
      error: 'Invalid username or password',
      demoAccounts: demoAccounts.map(acc => ({ username: acc.username }))
    });
  }

  // Set session
  req.session.user = {
    id: user.id,
    username: user.username
  };

  res.redirect('/dashboard');
});

// Logout handler
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

// Dashboard page
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { 
    user: req.session.user,
    music: musicData
  });
});

// Music list page
app.get('/music-list', requireAuth, (req, res) => {
  res.render('music-list', { 
    user: req.session.user,
    music: musicData
  });
});

// Add music page
app.get('/add-music', requireAuth, (req, res) => {
  res.render('add-music', { user: req.session.user });
});

// Add music handler
app.post('/add-music', requireAuth, (req, res) => {
  const { title, artist } = req.body;
  
  if (!title || !artist) {
    return res.render('add-music', { 
      user: req.session.user,
      error: 'Title and artist are required'
    });
  }

  const newMusic = {
    id: musicData.length + 1,
    title,
    artist,
    votes: 0
  };

  musicData.push(newMusic);
  res.redirect('/music-list');
});

// Edit music page
app.get('/edit-music/:id', requireAuth, (req, res) => {
  const musicId = parseInt(req.params.id);
  const musicItem = musicData.find(item => item.id === musicId);
  
  if (!musicItem) {
    return res.redirect('/music-list');
  }

  res.render('edit-music', { 
    user: req.session.user,
    music: musicItem
  });
});

// Update music handler
app.post('/edit-music/:id', requireAuth, (req, res) => {
  const musicId = parseInt(req.params.id);
  const { title, artist } = req.body;
  
  const musicIndex = musicData.findIndex(item => item.id === musicId);
  
  if (musicIndex === -1) {
    return res.redirect('/music-list');
  }

  musicData[musicIndex] = {
    ...musicData[musicIndex],
    title,
    artist
  };

  res.redirect('/music-list');
});

// Delete music handler
app.post('/delete-music/:id', requireAuth, (req, res) => {
  const musicId = parseInt(req.params.id);
  musicData = musicData.filter(item => item.id !== musicId);
  res.redirect('/music-list');
});

// Vote page
app.get('/vote', requireAuth, (req, res) => {
  res.render('vote', { 
    user: req.session.user,
    music: musicData
  });
});

// Vote handler
app.post('/vote/:id', requireAuth, (req, res) => {
  const musicId = parseInt(req.params.id);
  const musicItem = musicData.find(item => item.id === musicId);
  
  if (musicItem) {
    musicItem.votes += 1;
  }

  res.redirect('/vote');
});

// API endpoint for music data
app.get('/api/music', (req, res) => {
  res.json({ music: musicData });
});

// Root redirect
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

module.exports = app;
