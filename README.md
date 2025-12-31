# Movie Recommendation System

A movie recommendation system with a FastAPI backend and Streamlit frontend.

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

## Setup

### Option 1: Automatic Setup (Recommended)

Run the setup script to install dependencies and create necessary files:

```bash
python setup.py
```

### Option 2: Manual Setup

1. Install backend dependencies:
```bash
pip install -r backend/requirements.txt
```

2. Install frontend dependencies:
```bash
pip install -r frontend/requirements.txt
```

Or install all dependencies at once:
```bash
pip install -r requirements.txt
```

## Running the Application

The application consists of two components that need to run simultaneously:

### Method 1: Using Startup Scripts (Recommended)

**Terminal 1 - Start Backend:**
```bash
python start_backend.py
```

**Terminal 2 - Start Frontend:**
```bash
python start_frontend.py
```

### Method 2: Manual Start

**Terminal 1 - Start Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
streamlit run app.py
```

## Accessing the Application

Once both servers are running:

- **Backend API**: http://localhost:8000
- **Frontend UI**: http://localhost:8501
- **API Documentation**: http://localhost:8000/docs (Swagger UI)

The frontend will automatically open in your browser, or you can manually navigate to http://localhost:8501

## Stopping the Application

Press `Ctrl+C` in both terminal windows to stop the servers.

## Project Structure

```
Movie_Recommendation_System/
├── backend/           # FastAPI backend server
│   ├── main.py       # Main backend application
│   ├── database.py   # Database utilities
│   ├── data/         # Movie data files
│   └── models/       # ML models (similarity matrix)
├── frontend/         # Streamlit frontend
│   └── app.py        # Frontend application
└── requirements.txt  # All dependencies
```

## Notes

- The backend will automatically create necessary files (movies.csv, database, similarity model) if they don't exist
- Make sure both servers are running before using the application
- The backend must be started before the frontend for the app to work properly

