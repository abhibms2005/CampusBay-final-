# 🚀 Quick Start Commands

## Run Backend Server

```bash
cd backend
npm install
npm run dev
```

Server will run on: `http://localhost:4000`

## Access Frontend

Open in browser: `http://localhost:4000/index.html`

Or for marketplace: `http://localhost:4000/marketplace.html`

---

**Note:** The backend automatically serves the frontend files, so you only need to run the backend server!

## Troubleshooting

### Port Already in Use
If you get error `EADDRINUSE: address already in use :::4000`:

```bash
# Find and kill the process using port 4000
netstat -ano | findstr :4000
# Then kill it:
taskkill /PID <PID_NUMBER> /F
```

### MongoDB Connection Error
Make sure your `.env` file in the backend directory has a valid `MONGO_URI` connection string.
