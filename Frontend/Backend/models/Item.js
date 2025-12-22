const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  category: { type: String, default: 'General' },
  imageUrl: { type: String }, // served from /uploads/
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: String }, // e.g., "Hostel A / Library"
  createdAt: { type: Date, default: Date.now },
  isAvailable: { type: Boolean, default: true }
});

module.exports = mongoose.model('Item', itemSchema);
