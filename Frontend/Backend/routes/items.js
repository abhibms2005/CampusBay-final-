const express = require('express');
const multer = require('multer');
const path = require('path');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const upload = multer({ storage });

// Create item (protected)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category, location } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Missing title or price' });

    const item = new Item({
      title,
      description,
      price: Number(price),
      category,
      location,
      seller: req.user._id,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined
    });

    await item.save();
    await item.populate('seller', 'name email');

    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List items with optional query (category, q)
router.get('/', async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;
    const filter = { isAvailable: true };

    if (category) filter.category = category;
    if (q) filter.$text = { $search: q }; // requires text index below

    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('seller', 'name email verified');

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('seller', 'name email');
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete item (only seller)
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.seller.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not allowed' });

    await Item.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin or seller can mark unavailable (toggle)
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.seller.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not allowed' });

    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
