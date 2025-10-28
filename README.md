# Student Information System (SIS)

A full-stack Student Information System built with React, Node.js, Express, and MongoDB.

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Start the Application

**Simple command (auto-reloads on code changes):**
```bash
npm start
```

That's it! The application will start with hot-reloading out of the box:
- 🌐 Frontend: http://localhost:3000 — React dev server reloads on save
- 🔧 Backend API: http://localhost:5000 — the container runs `npm run dev` (nodemon) so backend code changes restart automatically
- 🗄️ MongoDB: localhost:27017

### Other Commands

```bash
npm start      # Start all services
npm stop       # Stop all services
npm run dev    # Start with rebuild (if you changed Dockerfile)
npm run logs   # View logs from all services
npm run clean  # Stop and remove all data (fresh start)
```

### Alternative: Batch Files

**Option 1: Double-click**
- `start.bat` - Start everything
- `stop.bat` - Stop everything

---

## 🛠️ Manual Setup (Without Docker)

If you prefer to run services individually:

### 1. Install Dependencies

```bash
# Backend
cd backend-
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Setup MongoDB

Install and start MongoDB locally, or use MongoDB Atlas.

### 3. Configure Environment

Edit `backend-/.env` with your settings.

### 4. Start Services

**Terminal 1 - Backend (with nodemon hot reload):**
```bash
cd backend-
npm run dev
```

> `npm run dev` uses nodemon (installed via `npm install`) so the backend restarts when you edit files. If you only need a one-off run without watching, you can still use `node server.js`.

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

---

## 📋 Features

- ✅ User Authentication (Students, Teachers, Superadmin)
- ✅ Role-based Access Control
- ✅ Invite Code Registration System
- ✅ Subject Management
- ✅ Grade Management
- ✅ Attendance Tracking
- ✅ Student Enrollment

## 🔐 Default Invite Codes

- Student: `STUDENT123`
- Teacher: `TEACHER123`
- Superadmin: `SUPERADMIN123`

## 📚 Documentation

See [DOCKER-README.md](DOCKER-README.md) for detailed Docker instructions.

## 🐛 Troubleshooting

### Ports Already in Use
Stop any running instances of MongoDB, Node, or React before starting Docker.

### Docker Not Starting
Make sure Docker Desktop is running.

### Database Connection Issues
Check that MongoDB container is running:
```bash
docker-compose ps
```

## 📝 Tech Stack

- **Frontend**: React, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: JWT
- **Containerization**: Docker
