const mongoose = require('mongoose');

/**
 * Wishlist Model
 * Allows users to save/bookmark items they're interested in
 */

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure one wishlist per user
wishlistSchema.index({ user: 1 }, { unique: true });

// Update timestamp on save
wishlistSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Method to add item to wishlist
wishlistSchema.methods.addItem = async function (itemId) {
    if (!this.items.includes(itemId)) {
        this.items.push(itemId);
        await this.save();
    }
    return this;
};

// Method to remove item from wishlist
wishlistSchema.methods.removeItem = async function (itemId) {
    this.items = this.items.filter(id => id.toString() !== itemId.toString());
    await this.save();
    return this;
};

// Static method to get or create wishlist for user
wishlistSchema.statics.getOrCreateForUser = async function (userId) {
    let wishlist = await this.findOne({ user: userId });
    if (!wishlist) {
        wishlist = await this.create({ user: userId, items: [] });
    }
    return wishlist;
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
