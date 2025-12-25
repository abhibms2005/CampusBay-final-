require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const messageRoutes = require('./routes/messages');
const wishlistRoutes = require('./routes/wishlist');

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*'
}));
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Serve static frontend (drop your index.html and marketplace.html into a folder named 'public')
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Basic health
app.get('/api/ping', (req, res) => res.json({ ok: true, time: new Date() }));

// Debug Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    appName: 'CampusBay Backend',
    mongoConfigured: !!process.env.MONGO_URI,
    mongoConnected: mongoose.connection.readyState === 1,
    connectionState: mongoose.connection.readyState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    lastDbError: global.dbConnectionError || null,
    env: process.env.NODE_ENV
  });
});

// Connect to MongoDB and start server
global.dbConnectionError = null;

if (!process.env.MONGO_URI) {
  global.dbConnectionError = 'MONGO_URI environment variable is missing';
  console.warn('⚠️  MONGO_URI missing from environment variables');
}

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campusbay_fallback', {
  useNewUrlParser: true, useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ MongoDB connected');
    global.dbConnectionError = null;
  })
  .catch(err => {
    global.dbConnectionError = err.message;
    console.warn('⚠️  MongoDB connection failed:', err.message);
    console.warn('⚠️  Server will start WITHOUT database functionality');
  });

// Start server regardless of MongoDB connection
app.listen(PORT, () => {

  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}/index.html`);
  console.log(`📍 Marketplace: http://localhost:${PORT}/marketplace.html\n`);
});
