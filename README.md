# ZemaLink 🎵

**ZemaLink** — "Zema" (ዜማ) means "music" in Amharic — is a full-stack music streaming platform built for Ethiopian artists and audiences. It supports premium content monetization, live streaming, event ticketing, AI-powered search, and role-based access control.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite 5 + Tailwind CSS 3.4 |
| **Backend** | PHP 8.1 (no framework, custom router) |
| **Database** | MySQL 8 (InnoDB, utf8mb4) |
| **Payments** | Chapa (Ethiopian payment gateway) |
| **Media Storage** | Cloudinary |
| **AI** | OpenAI-powered music search |
| **Email** | PHPMailer (SMTP) |

## Features

- **Music Streaming** — Browse, search, and play songs with a full-featured player (queue, likes, playlist integration)
- **Premium Monetization** — Individual song purchases or subscription-based access (free/premium tiers) via Chapa
- **User Roles** — Audience, Musician, Admin with granular permissions
- **Musician Dashboard** — Upload songs, manage events, create live streams, view earnings
- **Live Streaming** — Start/end live streams, real-time chat, Join/Leave viewer tracking, replay recordings
- **Event Ticketing** — Create events, sell tickets with Chapa integration, ticket-gated live streams
- **Playlists** — Create public/private playlists, drag-and-drop reorder, search and add songs
- **AI Search** — Natural language song discovery powered by OpenAI
- **Admin Panel** — User management, song approval, content moderation
- **Dark/Light Theme** — Persistent theme toggle via React context

## Project Structure

```
ZemaLink/
├── backend/          # PHP API
│   ├── config/       # App config, CORS, DB connection
│   ├── includes/     # AuthMiddleware, Database, helpers
│   ├── routes/       # Route handlers (auth, songs, playlists, events, live-streams, payments, admin)
│   ├── services/     # Chapa, Cloudinary, Email, AI, Rating
│   └── index.php     # Front controller + router
├── frontend/         # React SPA
│   └── src/
│       ├── components/   # Reusable UI (layout, music, auth, common)
│       ├── context/      # AuthContext, PlayerContext, ThemeContext
│       ├── pages/        # 24 page components
│       ├── services/     # API client layer
│       └── App.jsx       # Route definitions
├── database/
│   ├── schema.sql    # Full DB schema (14 tables)
│   ├── seed.sql      # Sample data
│   └── migrations/   # Incremental migrations
└── docs/
```

## Getting Started

### Prerequisites

- PHP 8.0+ (extensions: PDO MySQL, curl, mbstring)
- MySQL 8+
- Node.js 18+
- Composer

### 1. Database

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql      # optional sample data
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
```

Edit `.env` with your credentials (DB, Chapa, Cloudinary, OpenAI, SMTP).

```bash
php -S 127.0.0.1:8000 router.php
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` — API calls to `/api` proxy to the backend.

### Build for production

```bash
cd frontend
npm run build      # outputs to frontend/dist/
```

## API Overview

All endpoints are prefixed with `/api` and use JSON request/response bodies.

| Resource | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| Auth | POST | `/api/auth/register` | Create account |
| Auth | POST | `/api/auth/login` | Sign in |
| Songs | GET | `/api/songs` | List/search songs |
| Songs | POST | `/api/songs` | Upload song (musician) |
| Playlists | GET/POST | `/api/playlists` | List/create playlists |
| Playlists | POST | `/api/playlists/add-song` | Add song to playlist |
| Events | GET/POST | `/api/events` | List/create events |
| Live Streams | GET | `/api/live-streams` | List active/ended streams |
| Live Streams | POST | `/api/live-streams/:id/status` | Start/end/join/leave |
| Live Streams | GET | `/api/live-streams/:id/replay` | Replay data (owner only) |
| Payments | POST | `/api/payment/initiate` | Initiate Chapa checkout |

## License

MIT
