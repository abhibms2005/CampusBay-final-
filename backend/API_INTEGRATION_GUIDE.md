# CampusBay Frontend-Backend Integration Guide

## Overview
Your CampusBay marketplace is now fully integrated! The frontend calls your backend API routes for authentication, listing management, and messaging.

---

## 📁 File Structure

### Backend
```
Backend/
├── server.js                 (Main server)
├── package.json
├── routes/
│   ├── auth.js              (Login/Register endpoints)
│   ├── items.js             (Listing CRUD endpoints)
│   └── messages.js          (Messaging endpoints)
├── models/
│   ├── User.js
│   ├── Item.js
│   └── Message.js
├── middleware/
│   └── auth.js              (JWT authentication)
└── public/                  (Frontend files served here)
    ├── index.html
    ├── marketplace.html
    ├── api.js               (NEW - API integration layer)
    └── app-integrated.js    (NEW - Updated app logic)
```

---

## 🔌 API Integration Files

### 1. **api.js** - API Client
Location: `Backend/public/api.js`

Provides a global `api` object with methods for all backend operations:

```javascript
// Authentication
await api.register(name, email, password, college);
await api.login(email, password);
api.clearToken();
api.isLoggedIn();
api.getCurrentUser();

// Items/Listings
await api.listItems({ q, category, page, limit });
await api.getItem(id);
await api.createItem(title, description, price, category, location, imageFile);
await api.deleteItem(id);
await api.toggleItemAvailability(id);

// Messages
await api.getMessages();
await api.sendMessage(recipientId, itemId, text);
```

### 2. **app-integrated.js** - Frontend Logic
Location: `Backend/public/app-integrated.js`

Updated to use the API client for all operations:
- Login/Register forms call `api.login()` and `api.register()`
- Listings page loads items via `api.listItems()`
- Create listing form submits to `api.createItem()`
- Save/unsave functionality
- Real-time UI updates based on auth state

---

## 🚀 How to Run

### 1. Start the Backend Server
```bash
cd Backend
npm install                 # Install dependencies
node server.js             # Start on http://localhost:4000
```

### 2. Access Frontend
Open in browser:
```
http://localhost:4000
```

The frontend is served from `Backend/public/` automatically by Express.

---

## 🔑 API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`
Create a new user account.

**Request:**
```json
{
  "name": "Priya S.",
  "email": "priya@bmsce.ac.in",
  "password": "securePassword123",
  "college": "BMSCE"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Priya S.",
    "email": "priya@bmsce.ac.in",
    "verified": true
  }
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "abhilash@bmsce.ac.in",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Abhilash Arya",
    "email": "abhilash@bmsce.ac.in",
    "verified": true
  }
}
```

---

### Items/Listings Endpoints

#### GET `/api/items`
List all available items with optional filters.

**Query Parameters:**
- `q` - Search query (title/description)
- `category` - Filter by category
- `page` - Pagination page (default: 1)
- `limit` - Items per page (default: 20)

**Example:**
```
GET /api/items?q=textbook&category=Books&page=1&limit=10
```

**Response:**
```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Engineering Data Structures Textbook",
      "price": 350,
      "category": "Books",
      "location": "CSE Block, BMSCE",
      "description": "3rd Edition, used for one semester",
      "imageUrl": "/uploads/image-1234.jpg",
      "seller": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Rohan Gupta",
        "email": "rohan@bmsce.ac.in",
        "verified": true
      },
      "isAvailable": true,
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### GET `/api/items/:id`
Get details of a specific item.

**Response:**
```json
{
  "item": { /* item object */ }
}
```

#### POST `/api/items`
Create a new listing (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `title` (string, required) - Item title
- `description` (string, optional) - Item description
- `price` (number, required) - Item price
- `category` (string, required) - Category
- `location` (string, required) - Pickup location
- `image` (file, optional) - Product image

**Example (using api.js):**
```javascript
const file = document.getElementById('image-input').files[0];
const result = await api.createItem(
  'Laptop Charger',
  '65W HP charger, good condition',
  900,
  'Electronics',
  'CSE Block',
  file
);
```

**Response:**
```json
{
  "item": { /* newly created item */ }
}
```

#### DELETE `/api/items/:id`
Delete a listing (only seller can delete).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{ "ok": true }
```

#### PUT `/api/items/:id/toggle`
Mark item as sold or unsold.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "item": { /* updated item with isAvailable toggled */ }
}
```

---

### Messages Endpoints

#### GET `/api/messages`
Get all conversations for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "sender": { /* user object */ },
      "recipient": { /* user object */ },
      "item": { /* item object */ },
      "text": "Is this still available?",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### POST `/api/messages`
Send a message to another user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "recipientId": "507f1f77bcf86cd799439012",
  "itemId": "507f1f77bcf86cd799439013",
  "text": "Is this item still available?"
}
```

**Response:**
```json
{ "ok": true }
```

---

## 🛠️ Usage Examples

### Login User
```javascript
try {
  const result = await api.login('abhilash@bmsce.ac.in', 'password');
  console.log('Logged in as:', result.user.name);
  console.log('Token:', result.token);
} catch (err) {
  console.error('Login failed:', err.message);
}
```

### Create a Listing
```javascript
try {
  const imageFile = document.getElementById('image').files[0];
  const result = await api.createItem(
    'Engineering Textbook',
    'DSA book, 3rd edition',
    350,
    'Books',
    'CSE Block, BMSCE',
    imageFile
  );
  console.log('Listing created:', result.item);
} catch (err) {
  console.error('Failed to create listing:', err.message);
}
```

### Search Listings
```javascript
try {
  const result = await api.listItems({
    q: 'laptop',
    category: 'Electronics',
    page: 1,
    limit: 10
  });
  console.log('Found items:', result.items);
} catch (err) {
  console.error('Search failed:', err.message);
}
```

### Send Message
```javascript
try {
  const result = await api.sendMessage(
    '507f1f77bcf86cd799439012',  // recipient user ID
    '507f1f77bcf86cd799439013',  // item ID
    'Is this still available?'
  );
  console.log('Message sent');
} catch (err) {
  console.error('Failed to send message:', err.message);
}
```

---

## 🔐 Authentication Flow

1. **Register/Login** → User submits credentials
2. **Server verifies** → Returns JWT token + user data
3. **Client stores** → Token saved in localStorage
4. **API requests** → Token included in Authorization header
5. **Server validates** → Middleware checks JWT signature
6. **Protected resources** → Only accessible with valid token

**Token Storage:**
- Stored in `localStorage`
- Retrieved automatically by api.js
- Cleared on logout

---

## 🐛 Troubleshooting

### Issue: API calls return 401 (Unauthorized)
- **Cause:** Token expired or invalid
- **Solution:** User needs to login again

### Issue: CORS errors in browser console
- **Cause:** Frontend and backend on different domains
- **Solution:** Check `server.js` CORS configuration

### Issue: Images not uploading
- **Cause:** Wrong form field name or no permissions
- **Solution:** Ensure `uploads/` folder exists and is writable

### Issue: Listings not loading
- **Cause:** Backend not running or database not connected
- **Solution:** Check MongoDB connection in `.env` file

---

## 📝 Environment Variables (.env)

Create a `.env` file in the Backend folder:

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/campusbay
JWT_SECRET=your_super_secret_key_here
ALLOWED_COLLEGE_DOMAIN=bmsce.ac.in
FRONTEND_ORIGIN=http://localhost:4000
```

---

## 📞 Support

For issues or questions about the API integration:
1. Check the error message in browser console
2. Review the API endpoint documentation above
3. Verify backend is running: `curl http://localhost:4000/api/ping`
4. Check MongoDB connection status

---

**Happy coding! 🚀**
