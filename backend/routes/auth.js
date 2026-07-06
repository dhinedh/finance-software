import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../database.js';
import { generateToken, authenticateToken } from '../auth.js';

const router = express.Router();

// User Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Registration (Only Admins can register new users)
router.post('/register', authenticateToken, async (req, res) => {
  const { username, password, role } = req.body;

  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only administrators can create users' });
  }

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  if (!['Admin', 'Staff'].includes(role)) {
    return res.status(400).json({ error: 'Role must be Admin or Staff' });
  }

  try {
    const db = await getDb();
    
    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, passwordHash, role]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.lastID
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT id, username, role FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
