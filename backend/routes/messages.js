const express = require('express');
const Message = require('../models/Message');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

const router = express.Router();

// Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { to, text, itemId } = req.body;
    if (!to || !text) return res.status(400).json({ error: 'Missing fields' });

    // Optional: attach item context if provided
    let itemRef = null;
    if (itemId) {
      const item = await Item.findById(itemId);
      if (!item) return res.status(400).json({ error: 'Invalid item' });
      itemRef = item._id;
    }

    const msg = new Message({
      from: req.user._id,
      to,
      item: itemRef,
      text
    });

    await msg.save();
    await msg.populate('from', 'name email');
    await msg.populate('to', 'name email');

    res.json({ message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get conversations for current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const uid = req.user._id;
    // Get last 50 messages involving user
    const msgs = await Message.find({
      $or: [{ from: uid }, { to: uid }]
    }).sort({ createdAt: -1 }).limit(200)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .populate('item', 'title price');

    res.json({ messages: msgs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
