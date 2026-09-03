# Pawly — Deployment & Containerization Guide

This guide documents the deployed production architecture and local containerization.

## 🚀 Live Production Deployments
- **Frontend (Cloudflare Pages):** [https://pawly-web.pages.dev](https://pawly-web.pages.dev)
- **Backend API (Render):** [https://pawly-backend-zhs1.onrender.com](https://pawly-backend-zhs1.onrender.com)
- **Database (Neon PostgreSQL):** Frankfurt (`eu-central-1`) managed Postgres cluster
- **API Health Check:** [https://pawly-backend-zhs1.onrender.com/health](https://pawly-backend-zhs1.onrender.com/health)

---

## 🐳 Part 1: Local Docker Containerization

Run the entire application (PostgreSQL + Go API + React Frontend) with one command:

```bash
# From the pawly repository root:
docker compose up --build
```

- **Frontend App:** [http://localhost:80](http://localhost:80) (or [http://localhost:5173](http://localhost:5173))
- **Go API & Health:** [http://localhost:3000/health](http://localhost:3000/health)
- **Database Debug Console:** [http://localhost:3000/debug](http://localhost:3000/debug)

To run in the background:
```bash
docker compose up -d --build
```
To stop the stack:
```bash
docker compose down
```

---

## 🌐 Part 2: Deploying for FREE (€0 / month)

### Step 1: Free Managed PostgreSQL Database ([Neon.tech](https://neon.tech))
1. Sign up for free at [Neon.tech](https://neon.tech).
2. Create a new project called `pawly`.
3. Under **Connection Details**, copy your Postgres connection URI (e.g., `postgresql://username:password@ep-xyz.eu-central-1.aws.neon.tech/pawly?sslmode=require`).
4. Go to the **SQL Editor** tab in Neon and paste the contents of `backend/sql/schema/001_initial.sql` and run it to create all tables.

---

### Step 2: Free Go Backend + WebSocket Hosting ([Render.com](https://render.com) or [Koyeb.com](https://koyeb.com))
1. Sign up at [Render.com](https://render.com) and link your GitHub repository (`https://github.com/MumenOsman/pawly`).
2. Click **New +** → **Web Service**.
3. Select your repository:
   - **Root Directory:** `backend`
   - **Environment:** `Go` (or `Docker`)
   - **Build Command:** `go build -o server cmd/api/main.go`
   - **Start Command:** `./server`
4. Add **Environment Variables**:
   - `DATABASE_URL`: *(Your Neon PostgreSQL connection URI from Step 1)*
   - `JWT_SECRET`: `pawly-production-jwt-secret-key`
   - `SERVER_PORT`: `3000`
5. Click **Create Web Service**. Render will deploy your Go server and give you an API URL (e.g. `https://pawly-api.onrender.com`).

---

### Step 3: Free Frontend Hosting on [Cloudflare Pages](https://pages.cloudflare.com)
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. Click **Create Application** → **Pages** → **Connect to Git**.
3. Select your GitHub repository (`MumenOsman/pawly`).
4. Configure the build settings:
   - **Framework preset:** `Vite`
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Click **Save and Deploy**.

#### ⚡ Connecting Frontend to your Backend:
In Cloudflare Pages, go to **Settings** → **Environment variables** → Add:
- `VITE_API_URL`: `https://pawly-api.onrender.com` (your backend URL from Step 2)

Cloudflare Pages will automatically trigger a production build, deploy it across its global edge network, and provide free SSL with your own custom domain or a `.pages.dev` domain.

---

## 👥 Pre-Configured Test Accounts

| Name | Email | Password | Location | Owned Pet |
|:---|:---|:---|:---|:---|
| **Maria Koskinen** | `maria_k2026@pawly.fi` | `password123` | Helsinki (Töölö) | **Bella** (Golden Retriever) |
| **Aino Virtanen** | `aino@pawly.fi` | `password123` | Helsinki (Kallio) | **Milo** (French Bulldog) |
| **Mikko Korhonen** | `mikko@pawly.fi` | `password123` | Espoo (Tapiola) | **Luna** (Border Collie) |
| **Seeded Users (1-100)** | `user1@pawly.com` – `user100@pawly.com` | `password123` | Nationwide (FI) | Various |
