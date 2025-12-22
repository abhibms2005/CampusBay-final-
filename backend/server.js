require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 4000;

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

// Basic health
app.get('/api/ping', (req, res) => res.json({ ok: true, time: new Date() }));

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected');
})
.catch(err => {
  console.warn('⚠️  MongoDB connection failed:', err.message);
  console.warn('⚠️  Server will start WITHOUT database functionality');
  console.warn('⚠️  To fix: Update MONGO_URI in .env file with valid MongoDB connection string');
});

// Start server regardless of MongoDB connection
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}/index.html`);
  console.log(`📍 Marketplace: http://localhost:${PORT}/marketplace.html\n`);
});
