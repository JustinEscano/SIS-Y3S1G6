# SIS Backend

Simple Node.js + Express backend for the SIS app. Uses MongoDB and JWT authentication.

Quick start

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

   npm install

3. Start the server (dev):

   npm run dev

API

- POST /api/auth/register { name, email, password, role }
- POST /api/auth/login { email, password }
- POST /api/auth/refresh { refreshToken }
- GET /api/students/me (requires Authorization: Bearer <token>)
