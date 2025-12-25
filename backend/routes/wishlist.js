const express = require('express');
const Wishlist = require('../models/Wishlist');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/wishlist
 * Get current user's wishlist with populated items
 */
router.get('/', auth, async (req, res) => {
    try {
        const wishlist = await Wishlist.getOrCreateForUser(req.user._id);

        // Populate items with seller info
        await wishlist.populate({
            path: 'items',
            match: { deletedAt: null }, // Exclude deleted items
            populate: {
                path: 'seller',
                select: 'name email verified'
            }
        });

        // Filter out null items (deleted ones)
        const validItems = wishlist.items.filter(item => item !== null);

        res.json({
            wishlist: {
                items: validItems,
                count: validItems.length
            }
        });
    } catch (err) {
        console.error('Get wishlist error:', err);
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
});

/**
 * POST /api/wishlist/:itemId
 * Add item to wishlist
 */
router.post('/:itemId', auth, async (req, res) => {
    try {
        const { itemId } = req.params;

        // Verify item exists
        const item = await Item.findById(itemId);
        if (!item || item.deletedAt) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Get or create wishlist
        const wishlist = await Wishlist.getOrCreateForUser(req.user._id);

        // Check if already in wishlist
        if (wishlist.items.includes(itemId)) {
            return res.status(400).json({ error: 'Item already in wishlist' });
        }

        // Add item
        await wishlist.addItem(itemId);

        res.json({
            message: 'Item added to wishlist',
            wishlistCount: wishlist.items.length
        });
    } catch (err) {
        console.error('Add to wishlist error:', err);
        res.status(500).json({ error: 'Failed to add item to wishlist' });
    }
});

/**
 * DELETE /api/wishlist/:itemId
 * Remove item from wishlist
 */
router.delete('/:itemId', auth, async (req, res) => {
    try {
        const { itemId } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) {
            return res.status(404).json({ error: 'Wishlist not found' });
        }

        // Remove item
        await wishlist.removeItem(itemId);

        res.json({
            message: 'Item removed from wishlist',
            wishlistCount: wishlist.items.length
        });
    } catch (err) {
        console.error('Remove from wishlist error:', err);
        res.status(500).json({ error: 'Failed to remove item from wishlist' });
    }
});

/**
 * GET /api/wishlist/check/:itemId
 * Check if item is in user's wishlist
 */
router.get('/check/:itemId', auth, async (req, res) => {
    try {
        const { itemId } = req.params;
        const wishlist = await Wishlist.findOne({ user: req.user._id });

        const isInWishlist = wishlist ? wishlist.items.includes(itemId) : false;

        res.json({ isInWishlist });
    } catch (err) {
        console.error('Check wishlist error:', err);
        res.status(500).json({ error: 'Failed to check wishlist status' });
    }
});

module.exports = router;
