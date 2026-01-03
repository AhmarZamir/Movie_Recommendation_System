# Movie Recommendation System

<img width="1889" height="873" alt="Image" src="https://github.com/user-attachments/assets/ed20bc1f-98a7-454b-a9fe-777bd12a24ae" />

Full-stack movie/TV discovery app with playlists, reviews, admin tooling, and personalized recommendations.

## Tech stack
- Frontend: React + Vite + TypeScript + Tailwind
- Backend: FastAPI + SQLAlchemy + SQLite
- External data: TMDB API

## Features
- Movie and TV browsing, search with auto-suggestions, and filters
- Media detail pages with cast, facts, reviews, and ratings
- Playlists (watchlist + favorites) with public/private sharing
- Add-to-playlist flow with toast feedback
- Public playlists discovery and detail pages
- User profiles with avatar, username, and password updates
- Review system with ratings, voting, and moderation
- Admin dashboard (users, movies, reviews, analytics)
- "Recommended for You" carousel based on recent searches or playlist adds

## Project structure
```
Movie_Recommendation_System/
|-- backend/                      # FastAPI backend
|   |-- app/
|   |   |-- core/                 # Config, security, deps
|   |   |-- db/                   # DB engine/session
|   |   |-- models/               # SQLAlchemy models
|   |   |-- routers/              # API routes
|   |   |-- schemas/              # Pydantic schemas
|   |   `-- main.py               # App entrypoint
|   |-- alembic/                  # Migrations
|   |-- data/                     # SQLite DB + CSV
|   |-- artifacts/                # ML artifacts (similarity.pkl)
|   |-- requirements.txt
|   `-- .env.example
|-- frontend/                     # React + Vite frontend
|   |-- src/
|   |   |-- api/                   # Axios client
|   |   |-- components/            # UI components
|   |   |-- pages/                 # Page routes
|   |   |-- services/              # API service wrappers
|   |   |-- types/                 # Shared TS types
|   |   |-- utils/                 # Helpers (sanitize, etc.)
|   |   |-- App.tsx                # Routes
|   |   `-- main.tsx               # App bootstrap
|   |-- public/                    # Static assets
|   |-- index.html
|   `-- package.json
`-- README.md
```


## Setup
### Backend
1) Copy `backend/.env.example` into `backend/.env`. Add the necessary data.

2) Install and run:
```
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Access
- Frontend UI: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

## Admin access
Admin user can be auto-seeded via env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
If you change them, restart the backend to re-seed.

## Notes
- Swagger docs at `http://localhost:8000/docs` may be blocked by CSP. If needed, loosen CSP in `backend/app/main.py` or only enable docs in dev.
- Recommendations are cached in localStorage for faster reloads.

## Scripts
Frontend:
- `npm run dev`
- `npm run build`

Backend:
- `uvicorn app.main:app --reload`
