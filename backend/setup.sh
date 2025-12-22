#!/bin/bash
# CampusBay - Setup and Run Guide

echo "=========================================="
echo "   CampusBay Marketplace - Setup Guide"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first."
    exit 1
fi

echo "✓ Node.js is installed"
echo ""

# Navigate to Backend
cd Backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "=========================================="
echo "   ✓ Setup Complete!"
echo "=========================================="
echo ""

echo "To start the server, run:"
echo ""
echo "   node server.js"
echo ""
echo "Then open in your browser:"
echo ""
echo "   http://localhost:4000"
echo ""
echo "Test Login:"
echo "   Email:    abhilash@bmsce.ac.in"
echo "   Password: password"
echo ""
echo "=========================================="
