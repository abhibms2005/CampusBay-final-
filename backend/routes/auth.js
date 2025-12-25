const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerValidator, loginValidator } = require('../middleware/validators');

const router = express.Router();

// Helper: simple college-domain verification
function isCollegeEmail(email) {
  const allowed = process.env.ALLOWED_COLLEGE_DOMAIN || 'college.edu';
  return email.toLowerCase().endsWith('@' + allowed);
}

// Helper to check MongoDB connection
const mongoose = require('mongoose');
const isDbConnected = () => mongoose.connection.readyState === 1;

// Register
router.post('/register', registerValidator, async (req, res) => {
  try {
    // FALLBACK: Demo Mode Register
    if (!isDbConnected()) {
      console.warn('⚠️ MongoDB not connected. Using MOCK REGISTER (Demo Mode).');
      const { name, email } = req.body;
      // Create a fake token
      const token = jwt.sign({ id: 'mock_user_id' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
      return res.json({
        token,
        user: { id: 'mock_user_id', name: name || 'Demo User', email: email, verified: true }
      });
    }

    const { name, email, password, college } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const verified = isCollegeEmail(email);

    const user = new User({
      name, email: email.toLowerCase(), passwordHash: hash, college, verified
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, verified: user.verified }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', loginValidator, async (req, res) => {
  try {
    // FALLBACK: Demo Mode Login
    if (!isDbConnected()) {
      console.warn('⚠️ MongoDB not connected. Using MOCK LOGIN (Demo Mode).');
      const { email } = req.body;
      // Create a fake token
      const token = jwt.sign({ id: 'mock_user_id' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
      return res.json({
        token,
        user: { id: 'mock_user_id', name: 'Demo User', email: email, verified: true }
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, verified: user.verified }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
