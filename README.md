# CampusBay Project

This project has been organized into separate **frontend** and **backend** directories for better maintainability.

## 📁 Project Structure

```
Campusbay/
├── backend/          # Express.js backend server
│   ├── server.js     # Main server file
│   ├── routes/       # API routes (auth, items, messages)
│   ├── models/       # MongoDB models
│   ├── middleware/   # Custom middleware
│   ├── public/       # Static files served by backend
│   └── package.json  # Backend dependencies
│
├── frontend/         # Frontend HTML/JS files
│   ├── index.html    # Main landing page
│   ├── marketplace.html  # Marketplace page
│   ├── app.js        # Main application JavaScript
│   ├── api.js        # API integration
│   └── *.png         # Image assets
│
└── Frontend/         # Old directory (can be deleted after verification)
```

## 🚀 Setup and Run Instructions

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - The `.env` file is already present in the backend directory
   - Make sure it contains:
     - `MONGO_URI` - Your MongoDB connection string
     - `JWT_SECRET` - Secret key for JWT tokens
     - `PORT` - Server port (default: 4000)
     - `FRONTEND_ORIGIN` - Frontend URL for CORS (default: *)

4. **Start the backend server:**
   
   **Development mode (with auto-reload):**
   ```bash
   npm run dev
   ```
   
   **Production mode:**
   ```bash
   npm start
   ```

   The backend server will start on `http://localhost:4000`

### Frontend Setup

The frontend consists of static HTML/JS files. You have two options:

#### Option 1: Serve via Backend (Recommended)
The backend is already configured to serve static files from the `public` directory. The frontend files have been copied there, so:

1. Just start the backend server (see above)
2. Open your browser to:
   - Landing page: `http://localhost:4000/index.html`
   - Marketplace: `http://localhost:4000/marketplace.html`

#### Option 2: Serve Independently with Live Server
If you want to run the frontend separately:

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Option A - Using Python:**
   ```bash
   python -m http.server 3000
   ```
   Then open: `http://localhost:3000/index.html`

3. **Option B - Using Node.js http-server:**
   ```bash
   npx http-server -p 3000
   ```
   Then open: `http://localhost:3000/index.html`

4. **Option C - Using VS Code:**
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

> **Note:** If running frontend separately, make sure to update the API endpoint in `api.js` to point to `http://localhost:4000`

## 🔑 Quick Start Commands

**To run the complete project:**

```bash
# Terminal 1 - Start Backend
cd backend
npm install
npm run dev

# The backend serves both API and frontend files
# Access at: http://localhost:4000/index.html
```

## 📝 API Endpoints

The backend provides the following API routes:

- **Authentication:** `/api/auth/*`
  - POST `/api/auth/register` - Register new user
  - POST `/api/auth/login` - Login user

- **Items:** `/api/items/*`
  - GET `/api/items` - Get all items
  - POST `/api/items` - Create new item
  - GET `/api/items/:id` - Get item by ID
  - PUT `/api/items/:id` - Update item
  - DELETE `/api/items/:id` - Delete item

- **Messages:** `/api/messages/*`
  - GET `/api/messages` - Get user messages
  - POST `/api/messages` - Send message

- **Health Check:** `/api/ping` - Check server status

## 🗄️ Database

The project uses MongoDB. Make sure:
1. MongoDB is installed and running, OR
2. You have a MongoDB Atlas connection string in your `.env` file

## 🧹 Cleanup

After verifying everything works correctly, you can delete the old `Frontend` directory:

```bash
# From project root
rmdir /s Frontend
```

## 📚 Additional Documentation

Check the `backend` directory for additional documentation:
- `API_INTEGRATION_GUIDE.md` - API integration guide
- `ARCHITECTURE.md` - System architecture
- `QUICK_START.txt` - Quick start guide

## 🛠️ Technologies Used

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- CORS enabled

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- Responsive design
- API integration
