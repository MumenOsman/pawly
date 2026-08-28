# Pawly - The Pet Playdate Social Network

**Pawly** is a location-based social platform designed for pets and their owners. It helps dog and cat owners find compatible playmates for their furry friends, transforming walks in the park into organized, safe, and fun social experiences.

---

## Getting Started (For Testers & Developers)

Follow these steps to clone, set up, and run Pawly locally on your machine.

### 1. Prerequisites & Required Technologies
Ensure you have the following installed on your system:
- **Node.js** (v18+ or v20+) — [Download Node.js](https://nodejs.org/)
- **Go** (v1.22+) — [Download Go](https://go.dev/dl/)
- **PostgreSQL** (v14+) running locally on port `5432` — [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git** — [Download Git](https://git-scm.com/)

---

### 2. Clone the Repository
Open your terminal and clone the project:
```bash
git clone <repository-url>
cd Mumen/web
```

---

### 3. Database Setup & Initial Data
Make sure your PostgreSQL server is active, then create the database and seed the mock test fixtures:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE pawly;"

# Initialize schema and seed 100+ Finnish pet profiles & test accounts
cd backend
psql -U postgres -d pawly -f sql/schema/001_initial.sql
cd ..
```

---

### 4. Install Frontend Dependencies
Install the required packages for the React web application:
```bash
cd frontend
npm install
cd ..
```

---

### 5. Run the Entire Application (One Single Command)
From the root `web/` directory, launch both the backend API and frontend dev server simultaneously:

```bash
npm start
```

> **What this does:**
> - Launches the **Go API Server** at [`http://localhost:3000`](http://localhost:3000)
> - Launches the **React Vite App** at [`http://localhost:5173`](http://localhost:5173)
> - Provides unified, color-coded terminal logs (`[BACKEND]` in cyan, `[FRONTEND]` in green)
> - Press `Ctrl+C` in your terminal at any time to shut down both servers cleanly together.

---

### Alternative: Running Servers Separately (Optional)
If you prefer running the services in separate terminal windows:
- **Backend API Server**:
  ```bash
  cd web/backend
  go run cmd/api/main.go
  ```
- **Frontend Web App**:
  ```bash
  cd web/frontend
  npm run dev
  ```

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

## Quick Developer Links

### Frontend Application (`http://localhost:5173`)
| Page | URL | Description |
|:---|:---|:---|
| **Landing Page** | [http://localhost:5173/](http://localhost:5173/) | Public marketing page with feature previews & hero |
| **Login** | [http://localhost:5173/login](http://localhost:5173/login) | Account login with return-to-home option |
| **Register (3-Step Wizard)** | [http://localhost:5173/register](http://localhost:5173/register) | Account setup, first pet, global city search & review card |
| **Discover (Matches & Map)** | [http://localhost:5173/discover](http://localhost:5173/discover) | Pet match ring, list view, and interactive Leaflet map |
| **Profile & My Pets** | [http://localhost:5173/profile](http://localhost:5173/profile) | User details, multi-pet management, & traits |
| **Live Chats** | [http://localhost:5173/chats](http://localhost:5173/chats) | Real-time WebSocket messaging, typing indicators & playdate chats |
| **Settings & Privacy** | [http://localhost:5173/settings](http://localhost:5173/settings) | Account settings, privacy, and terms link |
| **Terms & Conditions** | [http://localhost:5173/terms](http://localhost:5173/terms) | Community safety & health guidelines |
| **Interactive Tour** | [http://localhost:5173/tour](http://localhost:5173/tour) | Guided walkthrough of Pawly features |

### Backend API & Dev Tools (`http://localhost:3000`)
| Tool | URL | Description |
|:---|:---|:---|
| **Health Check** | [http://localhost:3000/health](http://localhost:3000/health) | Returns server status and PostgreSQL connection state |
| **Debug Console** | [http://localhost:3000/debug](http://localhost:3000/debug) | Live database viewer & SQL query inspector |
| **Auth Test Console** | [http://localhost:3000/test](http://localhost:3000/test) | Browser-based endpoint testing sandbox |

---

## Tech Stack

- **Frontend**: React (Vite) + Vanilla CSS (Custom Design System with dynamic tokens).
- **Interactive Maps**: Leaflet + React-Leaflet with park/neighborhood clustering and auto-centering.
- **Global Geocoding**: OpenStreetMap (Photon + Nominatim) with dynamic global city search.
- **Backend**: Go (standard library + minimal dependencies).
- **Database**: PostgreSQL with `sqlc` for type-safe queries.
- **Real-Time Communication**: Gorilla WebSockets (`/ws?token=<jwt>`) for live messages, typing indicators, and mutual match events.
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
│   │   ├── handlers/         # HTTP handlers (auth, users, pets, chats, connections, debug)
│   │   └── middleware/       # Auth JWT & CORS middleware
│   └── sql/
│       ├── schema/           # PostgreSQL DDL schemas
│       └── queries/          # SQL queries
├── frontend/                 # React Application
│   ├── src/
│   │   ├── api/              # Fetch API wrappers (auth, pets, chats, users)
│   │   ├── components/       # Reusable UI components (Navbar, Button, PetCard, MatchNotification)
│   │   ├── contexts/         # WebSocketContext provider
│   │   └── pages/            # Page views (Landing, Register, Discover, Profile, ChatView, Terms)
├── start.js                  # Zero-dependency parallel process runner
├── package.json              # Unified npm start scripts
└── README.md
```

---

## API Documentation Summary

### Auth
- `POST /auth/register` — Register a new account (`email`, `password`, `owner_name`, `username`, `date_of_birth`, `location`).
- `POST /auth/login` — Log in and receive JWT token.
- `GET /me` — Get current authenticated user info.

### Profiles & Pets
- `GET /me/profile` — Get profile of logged-in user with joined account data.
- `PUT /me/profile` — Update bio, location, coordinates, interests (1–5 items).
- `GET /me/pets` — Get all pets owned by the logged-in user.
- `POST /pets` — Create a new pet entry with traits (1–5 items) and GPS coordinates.
- `PUT /pets/{id}` — Update pet details, traits, coordinates, and photos.
- `DELETE /pets/{id}` — Remove a pet.

### Discover & Two-Way Matching
- `GET /recommendations` — Fetch smart-matched playmates sorted by compatibility.
- `POST /connections/request` — Send a connection request. When both users connect (Mutual Match), the connection is accepted, the chat is created, and a real-time match event is broadcast.
- `GET /connections` — List established pet connections.

### Real-Time Chat & Notifications
- `GET /chats` — List all conversations with latest message.
- `GET /chats/{id}/messages` — Paginated message history with system notice formatting.
- `POST /chats/{id}/read` — Mark chat messages as read.
- `WS /ws?token=<jwt>` — WebSocket connection for live messaging, typing indicators, and mutual match popups.

---

## License
MIT License • Pawly 2026


<!-- Architecture: Geocoding via Nominatim & Haversine Distance Filter -->

<!-- Contributing: Tested against PostgreSQL 16 & React 19 -->
