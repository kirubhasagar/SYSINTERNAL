const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'hsis_super_secret_key_123!';

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // If MongoDB is connected, try to find user
    let user = null;
    try {
      user = await User.findOne({ username });
    } catch (dbError) {
      console.log('DB query skip, falling back to mock authentication for testing.');
    }

    // Mock authentication fallback for 'admin/admin'
    if (!user && username === 'admin' && password === 'admin') {
      const payload = { user: { id: 'mock-admin-id', role: 'soc_admin' } };
      return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' }, (err, token) => {
        if (err) throw err;
        res.json({ token, user: { username: 'admin', role: 'soc_admin' } });
      });
    }

    if (!user) {
      return res.status(400).json({ msg: 'Invalid SOC Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid SOC Credentials' });
    }

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '12h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { username: user.username, role: user.role } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
