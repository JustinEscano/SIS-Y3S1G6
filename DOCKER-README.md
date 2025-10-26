# Docker Setup for SIS Application

This Docker setup runs the entire Student Information System with a single command.

## Prerequisites

- Docker Desktop installed on your system
- Docker Compose (included with Docker Desktop)

## What's Included

The Docker Compose setup includes:
- **MongoDB** - Database (port 27017)
- **Backend API** - Node.js/Express server (port 5000)
- **Frontend** - React application (port 3000)

## Quick Start

### 1. Start Everything

From the root directory (`SIS-Y3S1G6`), run:

```bash
docker-compose up
```

Or run in detached mode (background):

```bash
docker-compose up -d
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017

### 3. Stop Everything

```bash
docker-compose down
```

To stop and remove all data (including database):

```bash
docker-compose down -v
```

## Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Rebuild After Code Changes

```bash
docker-compose up --build
```

### Restart a Specific Service

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Access Container Shell

```bash
# Backend
docker exec -it sis-backend sh

# Frontend
docker exec -it sis-frontend sh

# MongoDB
docker exec -it sis-mongodb mongosh
```

## Environment Variables

The backend uses the `.env` file in the `backend-` directory. Make sure it's properly configured:

```env
PORT=5000
MONGO_URI=mongodb://mongodb:27017/informationSystem
JWT_SECRET=yourAccessTokenSecret
JWT_REFRESH_SECRET=yourRefreshTokenSecret
STUDENT_INVITE_CODE=STUDENT123
TEACHER_INVITE_CODE=TEACHER123
SUPERADMIN_INVITE_CODE=SUPERADMIN123
```

## Troubleshooting

### Port Already in Use

If you get port conflicts, stop any running instances:

```bash
# Stop local MongoDB
# Stop local Node servers (Ctrl+C in terminals)
```

### Clear Everything and Start Fresh

```bash
docker-compose down -v
docker-compose up --build
```

### Database Not Connecting

Make sure MongoDB container is running:

```bash
docker-compose ps
```

## Development vs Production

This setup is configured for development with hot-reloading:
- Frontend: Changes auto-reload
- Backend: Restart the backend service after changes

For production, you would need to:
1. Build the React app (`npm run build`)
2. Serve static files from backend
3. Use production-grade MongoDB setup
