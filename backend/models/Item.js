const mongoose = require('mongoose');

/**
 * CampusBay Item Schema - Production Ready
 * 
 * This schema implements professional marketplace best practices:
 * - Explicit availability status (no ambiguous boolean)
 * - Multiple image support with fallback system
 * - Proper timestamps for audit trail
 * - Soft delete for data integrity
 * - Indexed fields for performance
 */

const itemSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true // For search performance
  },

  description: {
    type: String,
    default: '',
    maxlength: 2000
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  category: {
    type: String,
    required: true,
    enum: ['Books', 'Electronics', 'Fashion', 'Furniture', 'Stationery', 'General'],
    default: 'General',
    index: true // For filter performance
  },

  // Enhanced Image Handling
  images: [{
    type: String // Array of image URLs
  }],

  // Legacy field - kept for backward compatibility, will be phased out
  imageUrl: { type: String },

  // Seller Information
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // For "my listings" queries
  },

  location: {
    type: String,
    required: true,
    default: 'Campus'
  },

  // CRITICAL: Explicit Availability Status
  // This replaces the ambiguous boolean 'isAvailable'
  availabilityStatus: {
    type: String,
    enum: ['AVAILABLE', 'SOLD', 'RESERVED'], // Can add more states like PENDING
    default: 'AVAILABLE',
    required: true,
    index: true // For filtering available items
  },

  // Legacy field - kept for backward compatibility during transition
  isAvailable: {
    type: Boolean,
    default: true
  },

  // Soft Delete Support
  deletedAt: {
    type: Date,
    default: null
  },

  // Views/Analytics (bonus feature)
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  // Automatic timestamps
  timestamps: true // Creates createdAt and updatedAt automatically
});

// Indexes for performance
itemSchema.index({ availabilityStatus: 1, createdAt: -1 }); // Most common query
itemSchema.index({ seller: 1, availabilityStatus: 1 }); // Seller's listings
itemSchema.index({ category: 1, availabilityStatus: 1 }); // Category filtering

// Virtual for getting primary image
itemSchema.virtual('primaryImage').get(function () {
  if (this.images && this.images.length > 0) {
    return this.images[0];
  }
  return this.imageUrl || null;
});
// Method to get fallback image based on category
itemSchema.methods.getImageWithFallback = function () {
  // If has images, return first one
  if (this.images && this.images.length > 0) {
    return this.images[0];
  }

  // If has legacy or specific imageUrl, return it
  if (this.imageUrl) {
    return this.imageUrl;
  }

  // Robust Category-Based Fallbacks (LoremFlickr - Reliable Realism)
  const fallbacks = {
    'Books': 'https://loremflickr.com/640/480/textbook,study?lock=101',
    'Electronics': 'https://loremflickr.com/640/480/gadget,used?lock=102',
    'Fashion': 'https://loremflickr.com/640/480/clothing,casual?lock=103',
    'Furniture': 'https://loremflickr.com/640/480/bed,dorm?lock=104',
    'Stationery': 'https://loremflickr.com/640/480/stationary,pencil?lock=105',
    'General': 'https://loremflickr.com/640/480/object,student?lock=106'
  };

  return fallbacks[this.category] || fallbacks['General'];
};

// Method to mark item as sold
itemSchema.methods.markAsSold = async function () {
  this.availabilityStatus = 'SOLD';
  this.isAvailable = false; // Update legacy field too
  return await this.save();
};

// Method to mark item as available
itemSchema.methods.markAsAvailable = async function () {
  this.availabilityStatus = 'AVAILABLE';
  this.isAvailable = true; // Update legacy field too
  return await this.save();
};

// Method for soft delete
itemSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return await this.save();
};

// Query helper to exclude deleted items
itemSchema.query.notDeleted = function () {
  return this.where({ deletedAt: null });
};

// Pre-save hook to sync legacy field with new field
itemSchema.pre('save', function (next) {
  // Keep isAvailable in sync with availabilityStatus for backward compatibility
  this.isAvailable = (this.availabilityStatus === 'AVAILABLE');
  next();
});

// Ensure virtuals are included in JSON
itemSchema.set('toJSON', { virtuals: true });
itemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Item', itemSchema);
