# 🚀 Quick Start Guide

## First Time Setup

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop

2. **Start the Application**
   ```bash
   npm start
   ```

3. **Access the App**
   - Open browser: http://localhost:3000

That's it! 🎉

---

## Daily Development

### Start Everything
```bash
npm start
```

### Stop Everything
Press `Ctrl+C` in the terminal, or:
```bash
npm stop
```

### View Logs
```bash
npm run logs
```

---

## Auto-Reload Features ✨

**Frontend (React):**
- Edit any file in `frontend/src/`
- Save the file
- Browser automatically refreshes

**Backend (Node.js):**
- Edit any file in `backend-/`
- Save the file
- Server automatically restarts

**No need to restart Docker!** Just save your files and changes apply automatically.

---

## Common Commands

| Command | What it does |
|---------|--------------|
| `npm start` | Start all services |
| `npm stop` | Stop all services |
| `npm run dev` | Rebuild and start (use after changing Dockerfile) |
| `npm run logs` | View all logs in real-time |
| `npm run clean` | Stop and delete all data (fresh start) |

---

## Troubleshooting

### "Port already in use"
Stop any local MongoDB or Node servers:
- Close terminals running `node server.js`
- Close terminals running `npm start` in frontend
- Stop local MongoDB

### "Docker not found"
Make sure Docker Desktop is running (check system tray)

### Changes not appearing
1. Make sure you saved the file
2. Check the terminal for errors
3. Try: `npm run dev` (rebuild)

---

## Registration

Use these invite codes:
- **Student**: `STUDENT123`
- **Teacher**: `TEACHER123`
- **Superadmin**: `SUPERADMIN123`

---

## Need Help?

See full documentation in:
- `README.md` - Complete guide
- `DOCKER-README.md` - Docker details
