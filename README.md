# Pawly - The Pet Playdate Social Network

**Pawly** is a location-based social platform designed for pets and their owners. It helps dog and cat owners find compatible playmates for their furry friends, transforming walks in the park into organized, safe, and fun social experiences.

---

## Quick Developer Links

### Frontend Application (`http://localhost:5173`)
| Page | URL | Description |
|:---|:---|:---|
| **Landing Page** | [http://localhost:5173/](http://localhost:5173/) | Public marketing page with feature previews & hero |
| **Login** | [http://localhost:5173/login](http://localhost:5173/login) | Account login with return-to-home option |
| **Register (3-Step Wizard)** | [http://localhost:5173/register](http://localhost:5173/register) | Account setup, first pet, and review card |
| **Discover (Matches)** | [http://localhost:5173/discover](http://localhost:5173/discover) | Pet match ring, list, and interactive map |
| **Profile & My Pets** | [http://localhost:5173/profile](http://localhost:5173/profile) | User details, multi-pet management, & privacy |
| **Live Chats** | [http://localhost:5173/chats](http://localhost:5173/chats) | Real-time WebSocket messaging & playdate chats |
| **Settings & Privacy** | [http://localhost:5173/settings](http://localhost:5173/settings) | Account settings, privacy, and terms link |
| **Terms & Conditions** | [http://localhost:5173/terms](http://localhost:5173/terms) | Community safety & health rules |
| **Interactive Tour** | [http://localhost:5173/tour](http://localhost:5173/tour) | Sandbox guided tour of Pawly features |

### Backend API & Dev Tools (`http://localhost:3000`)
| Tool | URL | Description |
|:---|:---|:---|
| **Health Check** | [http://localhost:3000/health](http://localhost:3000/health) | Returns server status and PostgreSQL connection state |
| **Debug Console** | [http://localhost:3000/debug](http://localhost:3000/debug) | Live database viewer & SQL query inspector |
| **Auth Test Console** | [http://localhost:3000/test](http://localhost:3000/test) | Browser-based endpoint testing sandbox |

---

## Test User Accounts & Credentials

All test accounts and seeded users share the same test password:
> **Default Password:** `password123`

### 1. Dedicated Multi-User Testing Accounts
These three accounts are pre-populated with unique profiles, pets, active connections, and realistic chat histories between them:

| Name | Email | Username | Password | Location | Owned Pet | Active Chats With |
|:---|:---|:---|:---|:---|:---|:---|
| **Maria Koskinen** | `maria_k2026@pawly.fi` | `maria_k2026` | `password123` | Helsinki (Töölö) | **Bella** *(Golden Retriever)* | Aino & Mikko |
| **Aino Virtanen** | `aino@pawly.fi` | `aino_v` | `password123` | Helsinki (Kallio) | **Milo** *(French Bulldog)* | Maria & Mikko |
| **Mikko Korhonen** | `mikko@pawly.fi` | `mikko_k` | `password123` | Espoo (Tapiola) | **Luna** *(Border Collie)* | Maria & Aino |

### 2. Seeded Mock Users (`1` – `100`)
The database includes 100 seeded Finnish pet owners across Helsinki, Espoo, Vantaa, Tampere, Turku, and Oulu:
- **Email format:** `user1@pawly.com` through `user100@pawly.com`
- **Password:** `password123`
- **Example:** User 1 (`user1@pawly.com` / `santa_1` — Santa Virtanen)

---

## Tech Stack

- **Frontend**: React + TypeScript (Vite) with Vanilla CSS (Design tokens).
- **Backend**: Go (standard library + minimal dependencies).
- **Database**: PostgreSQL with `sqlc` for type-safe queries.
- **Real-Time Communication**: Gorilla WebSockets (`/ws?token=<jwt>`).
- **Security**: JWT sessions, bcrypt password hashing.

---

## Project Structure

```
web/
├── backend/                  # Go API Server
│   ├── cmd/
│   │   ├── api/main.go       # Server entry point & auto-migrations
│   │   └── seed/main.go      # DB fixture seed script
│   ├── internal/
│   │   ├── handlers/         # HTTP handlers (auth, users, pets, chats, debug)
│   │   └── middleware/       # Auth JWT & CORS middleware
│   └── sql/
│       ├── schema/           # PostgreSQL DDL schemas
│       └── queries/          # SQL queries
├── frontend/                 # React Application
│   ├── src/
│   │   ├── api/              # Fetch API wrappers (auth, pets, chats, users)
│   │   ├── components/       # Reusable UI components (Navbar, Button, PetCard)
│   │   ├── contexts/         # WebSocketContext provider
│   │   └── pages/            # Page views (Landing, Register, Discover, Profile, ChatView, Terms)
└── README.md
```

---

## Getting Started Locally

### 1. Database Setup
Ensure PostgreSQL is running locally on port `5432`:
```bash
# Create database if not exists
psql -U postgres -c "CREATE DATABASE pawly;"

# Initialize schema
cd web/backend
psql -U postgres -d pawly -f sql/schema/001_initial.sql
```

### 2. Run Backend
```bash
cd web/backend
go run cmd/api/main.go
# API running at http://localhost:3000
```

### 3. Run Frontend
```bash
cd web/frontend
npm install
npm run dev
# App running at http://localhost:5173
```

---

## API Documentation Summary

### Auth
- `POST /auth/register` — Register a new account (`email`, `password`, `owner_name`, `username`, `date_of_birth`).
- `POST /auth/login` — Log in and receive JWT token.
- `GET /me` — Get current authenticated user info.

### Profiles & Pets
- `GET /me/profile` — Get profile of logged-in user with joined account data.
- `PUT /me/profile` — Update bio, location, interests (1–5 items).
- `GET /pets/me` — Get all pets owned by the logged-in user.
- `POST /pets` — Create a new pet entry with traits (1–5 items).
- `PUT /pets/{id}` — Update pet details and photos.
- `DELETE /pets/{id}` — Remove a pet.

### Discover & Connections
- `GET /recommendations` — Fetch smart-matched playmates (excludes already connected pets).
- `POST /connections/request` — Connect with a pet and create chat.
- `GET /connections` — List established pet connections.

### Real-Time Chat
- `GET /chats` — List all conversations with latest message.
- `GET /chats/{id}/messages` — Paginated message history.
- `POST /chats/{id}/read` — Mark chat messages as read.
- `WS /ws?token=<jwt>` — WebSocket connection for live messaging and typing indicators.

---

## License
MIT License • Pawly 2026


<!-- Architecture: Geocoding via Nominatim & Haversine Distance Filter -->

<!-- Contributing: Tested against PostgreSQL 16 & React 19 -->
