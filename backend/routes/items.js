const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const { createItemValidator } = require('../middleware/validators');

const router = express.Router();

// Helper to check MongoDB connection
const isDbConnected = () => mongoose.connection.readyState === 1;


/**
 * CampusBay Item Routes - Production Ready
 * 
 * Key improvements:
 * - All new items default to AVAILABLE status
 * - Endpoints to explicitly mark items as SOLD/AVAILABLE
 * - Category-based image fallbacks
 * - Enhanced error handling and validation
 * - Soft delete support
 * - View counting for analytics
 */

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// ==================== CREATE ITEM ====================
// POST /api/items
router.post('/', auth, upload.single('image'), createItemValidator, async (req, res) => {
  try {
    const { title, description, price, category, location } = req.body;

    // Create item with EXPLICIT AVAILABLE status
    const item = new Item({
      title,
      description,
      price: Number(price),
      category,
      location: location || 'Campus',
      seller: req.user._id,
      availabilityStatus: 'AVAILABLE', // CRITICAL: Explicit availability
      imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined
    });

    await item.save();
    await item.populate('seller', 'name email verified');

    // Add image with fallback in response
    const responseItem = item.toObject();
    responseItem.imageUrl = item.getImageWithFallback();

    res.status(201).json({
      item: responseItem,
      message: 'Item created successfully and marked as AVAILABLE'
    });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Failed to create item', details: err.message });
  }
});

// ==================== LIST ITEMS ====================
// GET /api/items
router.get('/', async (req, res) => {
  try {
    // FALLBACK: If MongoDB is NOT connected, return mock data (Demo Mode)
    if (!isDbConnected()) {
      console.warn('⚠️ MongoDB not connected. Serving MOCK DATA (Demo Mode).');

      const mockItems = [
        { _id: 'mock1', title: 'Engineering Mathematics by BS Grewal', description: 'Complete textbook with solved examples.', price: 350, category: 'Books', imageUrl: 'https://loremflickr.com/640/480/textbook,thick?lock=1', seller: { name: 'Priya S.', verified: true }, viewCount: 12, createdAt: new Date() },
        { _id: 'mock2', title: 'OnePlus Nord CE 2', description: '8GB RAM, 128GB storage. Excellent condition.', price: 15500, category: 'Electronics', imageUrl: 'https://loremflickr.com/640/480/phone,table?lock=5', seller: { name: 'Rahul V.', verified: true }, viewCount: 45, createdAt: new Date() },
        { _id: 'mock3', title: 'Scientific Calculator Casio fx-991EX', description: 'Perfect for exams, all functions working.', price: 650, category: 'Stationery', imageUrl: 'https://loremflickr.com/640/480/calculator,desk?lock=14', seller: { name: 'Arjun S.', verified: false }, viewCount: 8, createdAt: new Date() },
        { _id: 'mock4', title: 'Study Table with Chair', description: 'Wooden study table + revolving chair.', price: 2500, category: 'Furniture', imageUrl: 'https://loremflickr.com/640/480/desk,study?lock=18', seller: { name: 'Sneha R.', verified: true }, viewCount: 30, createdAt: new Date() },
        { _id: 'mock5', title: 'Guitar - Yamaha F280', description: 'Acoustic guitar in excellent condition.', price: 6500, category: 'General', imageUrl: 'https://loremflickr.com/640/480/guitar,acoustic?lock=22', seller: { name: 'Aditya K.', verified: true }, viewCount: 22, createdAt: new Date() }
      ];

      return res.json({
        items: mockItems,
        pagination: { total: 5, page: 1, limit: 50, pages: 1 },
        sort: 'newest',
        demoMode: true
      });
    }

    const { q, category, page = 1, limit = 50, includeStatus, sort = 'newest' } = req.query;

    // Build filter - exclude soft-deleted items
    const filter = { deletedAt: null };


    // Filter by availability status
    if (includeStatus === 'ALL') {
      // Show all items regardless of status
    } else if (includeStatus === 'SOLD') {
      filter.availabilityStatus = 'SOLD';
    } else {
      // Default: only show AVAILABLE items
      filter.availabilityStatus = 'AVAILABLE';
    }

    if (category) filter.category = category;

    // Text search if query provided
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // Determine sort order
    let sortOption = { createdAt: -1 }; // Default: newest first
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'price-low':
        sortOption = { price: 1 };
        break;
      case 'price-high':
        sortOption = { price: -1 };
        break;
      case 'popular':
        sortOption = { viewCount: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
    }

    const items = await Item.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('seller', 'name email verified')
      .lean(); // Use lean for better performance

    // Add image fallbacks to all items
    const itemsWithImages = items.map(item => {
      const itemObj = new Item(item);
      return {
        ...item,
        imageUrl: itemObj.getImageWithFallback()
      };
    });

    const total = await Item.countDocuments(filter);

    res.json({
      items: itemsWithImages,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      },
      sort // Return current sort for UI
    });
  } catch (err) {
    console.error('List items error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// ==================== GET SINGLE ITEM ====================
// GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('seller', 'name email verified');

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if soft deleted
    if (item.deletedAt) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Increment view count
    item.viewCount += 1;
    await item.save();

    // Add image fallback
    const responseItem = item.toObject();
    responseItem.imageUrl = item.getImageWithFallback();

    res.json({ item: responseItem });
  } catch (err) {
    console.error('Get item error:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// ==================== MARK AS SOLD (NEW) ====================
// PUT /api/items/:id/mark-sold
router.put('/:id/mark-sold', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Only seller can mark as sold
    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the seller can mark this item as sold' });
    }

    // Check if already sold
    if (item.availabilityStatus === 'SOLD') {
      return res.status(400).json({ error: 'Item is already marked as sold' });
    }

    // Mark as sold using the model method
    await item.markAsSold();
    await item.populate('seller', 'name email verified');

    res.json({
      item,
      message: 'Item successfully marked as SOLD'
    });
  } catch (err) {
    console.error('Mark sold error:', err);
    res.status(500).json({ error: 'Failed to mark item as sold' });
  }
});

// ==================== PURCHASE ITEM (NEW - FOR BUYERS) ====================
// PUT /api/items/:id/purchase
// Allows authenticated buyers to purchase items (mark as sold without seller restriction)
router.put('/:id/purchase', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Prevent buying your own item
    if (item.seller.toString() === req.user._id.toString()) {
      return res.status(403).json({ error: 'You cannot purchase your own item' });
    }

    // Check if already sold
    if (item.availabilityStatus === 'SOLD') {
      return res.status(400).json({ error: 'Item is already sold' });
    }

    // Mark as sold - buyer can do this when purchasing
    await item.markAsSold();
    await item.populate('seller', 'name email verified');

    res.json({
      item,
      message: 'Purchase successful - item marked as SOLD'
    });
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ error: 'Failed to complete purchase' });
  }
});

// ==================== MARK AS AVAILABLE (NEW) ====================
// PUT /api/items/:id/mark-available
router.put('/:id/mark-available', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Only seller can mark as available
    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the seller can mark this item as available' });
    }

    // Check if already available
    if (item.availabilityStatus === 'AVAILABLE') {
      return res.status(400).json({ error: 'Item is already marked as available' });
    }

    // Mark as available using the model method
    await item.markAsAvailable();
    await item.populate('seller', 'name email verified');

    res.json({
      item,
      message: 'Item successfully marked as AVAILABLE'
    });
  } catch (err) {
    console.error('Mark available error:', err);
    res.status(500).json({ error: 'Failed to mark item as available' });
  }
});

// ==================== DELETE ITEM ====================
// DELETE /api/items/:id (Soft Delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Only seller can delete
    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the seller can delete this item' });
    }

    // Soft delete instead of hard delete for data integrity
    await item.softDelete();

    res.json({
      ok: true,
      message: 'Item deleted successfully'
    });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ==================== TOGGLE AVAILABILITY (LEGACY - DEPRECATED) ====================
// PUT /api/items/:id/toggle
// Kept for backward compatibility, but prefer using mark-sold / mark-available
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    // Toggle using new status system
    if (item.availabilityStatus === 'AVAILABLE') {
      await item.markAsSold();
    } else {
      await item.markAsAvailable();
    }

    res.json({ item });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
