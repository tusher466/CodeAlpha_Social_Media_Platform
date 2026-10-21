const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

// Helper to sanitize user object for response
function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Username, email, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3 || cleanUsername.length > 25) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 25 alphanumeric/underscore characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    // Check if username or email already taken
    const existing = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(cleanUsername, email.trim().toLowerCase());
    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername) {
        return res.status(409).json({ success: false, error: 'Username is already taken' });
      }
      return res.status(409).json({ success: false, error: 'Email is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const resolvedDisplayName = (display_name && display_name.trim()) ? display_name.trim() : cleanUsername;
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name, avatar_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(cleanUsername, email.trim().toLowerCase(), password_hash, resolvedDisplayName, defaultAvatar);
    const newUserId = Number(result.lastInsertRowid);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
    const token = signToken(newUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // set true in production HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: sanitizeUser(newUser),
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ success: false, error: 'Username/email and password are required' });
    }

    const cleanLogin = login.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(cleanLogin, cleanLogin);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = signToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Logged in successfully',
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const stats = {
      follower_count: db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(user.id).count,
      following_count: db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(user.id).count,
      post_count: db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count
    };

    return res.json({
      success: true,
      user: { ...sanitizeUser(user), ...stats }
    });
  } catch (err) {
    console.error('Auth check error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve profile data' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
