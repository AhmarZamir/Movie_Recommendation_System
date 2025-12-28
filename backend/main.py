from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import pandas as pd
import sqlite3
import numpy as np
from typing import List, Optional
import os
import requests
import json

# ============================================
# CREATE NECESSARY FILES IF THEY DON'T EXIST
# ============================================

def create_required_files():
    """Create all necessary files and folders"""
    
    # Create directories
    os.makedirs('data', exist_ok=True)
    os.makedirs('models', exist_ok=True)
    
    # 1. Create movies.csv if it doesn't exist
    if not os.path.exists('data/movies.csv'):
        print("Creating movies.csv...")
        
        # Sample movie data (you should replace this with your actual data)
        sample_movies = [
            {
                "title": "The Dark Knight",
                "movie_id": 155,
                "genres": "Action|Crime|Drama",
                "rating": 9.0,
                "overview": "Batman faces the Joker, a criminal mastermind who seeks to undermine society."
            },
            {
                "title": "Inception",
                "movie_id": 27205,
                "genres": "Action|Sci-Fi|Thriller",
                "rating": 8.8,
                "overview": "A thief who steals corporate secrets through dream-sharing technology."
            },
            {
                "title": "Pulp Fiction",
                "movie_id": 680,
                "genres": "Crime|Drama",
                "rating": 8.9,
                "overview": "The lives of two mob hitmen, a boxer, and a pair of diner bandits intertwine."
            },
            {
                "title": "Forrest Gump",
                "movie_id": 13,
                "genres": "Drama|Romance",
                "rating": 8.8,
                "overview": "The presidencies of Kennedy and Johnson, the events of Vietnam."
            },
            {
                "title": "The Godfather",
                "movie_id": 238,
                "genres": "Crime|Drama",
                "rating": 9.2,
                "overview": "The aging patriarch of an organized crime dynasty transfers control to his son."
            },
            {
                "title": "The Shawshank Redemption",
                "movie_id": 278,
                "genres": "Drama",
                "rating": 9.3,
                "overview": "Two imprisoned men bond over a number of years."
            },
            {
                "title": "Fight Club",
                "movie_id": 550,
                "genres": "Drama",
                "rating": 8.8,
                "overview": "An insomniac office worker and a devil-may-care soapmaker form an underground fight club."
            },
            {
                "title": "The Matrix",
                "movie_id": 603,
                "genres": "Action|Sci-Fi",
                "rating": 8.7,
                "overview": "A computer hacker learns about the true nature of his reality."
            },
            {
                "title": "Interstellar",
                "movie_id": 157336,
                "genres": "Adventure|Drama|Sci-Fi",
                "rating": 8.6,
                "overview": "A team of explorers travel through a wormhole in space."
            },
            {
                "title": "Parasite",
                "movie_id": 496243,
                "genres": "Comedy|Drama|Thriller",
                "rating": 8.6,
                "overview": "A poor family schemes to become employed by a wealthy family."
            }
        ]
        
        df = pd.DataFrame(sample_movies)
        df.to_csv('data/movies.csv', index=False)
        print(f"Created data/movies.csv with {len(df)} movies")
    
    # 2. Create similarity.pkl if it doesn't exist
    if not os.path.exists('models/similarity.pkl'):
        print("Creating similarity.pkl...")
        
        # Create a simple similarity matrix (10x10 for our sample movies)
        # In reality, this should be computed from your actual data
        np.random.seed(42)
        similarity_matrix = np.random.rand(10, 10)
        
        # Make diagonal = 1 (movies are perfectly similar to themselves)
        np.fill_diagonal(similarity_matrix, 1)
        
        # Make it symmetric
        similarity_matrix = (similarity_matrix + similarity_matrix.T) / 2
        
        with open('models/similarity.pkl', 'wb') as f:
            pickle.dump(similarity_matrix, f)
        print("Created models/similarity.pkl")
    
    # 3. Create SQLite database
    if not os.path.exists('data/movies.db'):
        print("Creating SQLite database...")
        create_database()
    
    print("✅ All required files created successfully!")

def create_database():
    """Create SQLite database with movies table"""
    conn = sqlite3.connect('data/movies.db')
    cursor = conn.cursor()
    
    # Create movies table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        movie_id INTEGER,
        genres TEXT,
        rating REAL,
        overview TEXT
    )
    ''')
    
    # Create user interactions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_title TEXT,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Insert sample data from movies.csv
    if os.path.exists('data/movies.csv'):
        df = pd.read_csv('data/movies.csv')
        for _, row in df.iterrows():
            cursor.execute('''
                INSERT OR IGNORE INTO movies (title, movie_id, genres, rating, overview)
                VALUES (?, ?, ?, ?, ?)
            ''', (row['title'], row['movie_id'], row['genres'], row['rating'], row['overview']))
    
    conn.commit()
    conn.close()
    print("Created data/movies.db")

# ============================================
# INITIALIZE APPLICATION
# ============================================

# Create files first
create_required_files()

# Now load the data
movies_df = pd.read_csv('data/movies.csv')
print(f"✅ Loaded {len(movies_df)} movies from data/movies.csv")

# Load similarity matrix
try:
    with open('models/similarity.pkl', 'rb') as f:
        similarity_matrix = pickle.load(f)
    print(f"✅ Loaded similarity matrix: {similarity_matrix.shape}")
except:
    print("⚠️ Could not load similarity.pkl, creating default...")
    similarity_matrix = np.eye(len(movies_df))  # Identity matrix as fallback

# Initialize FastAPI
app = FastAPI(title="Movie Recommendation API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# TMDB API
TMDB_API_KEY = "8265bd1679663a7ea12ac168da84d2e8"

# Database connection
def get_db_connection():
    conn = sqlite3.connect('data/movies.db')
    conn.row_factory = sqlite3.Row
    return conn

# Pydantic models
class MovieResponse(BaseModel):
    title: str
    poster: Optional[str] = None
    similarity: Optional[float] = None
    rating: Optional[float] = None
    genres: Optional[str] = None
    overview: Optional[str] = None

class LogRequest(BaseModel):
    movie_title: str
    action: str

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
def read_root():
    """Root endpoint - health check"""
    return {
        "message": "Movie Recommendation API",
        "movies_count": len(movies_df),
        "status": "running",
        "endpoints": {
            "search": "/search/{query}",
            "recommend": "/recommend/{movie_title}",
            "popular": "/popular",
            "all_movies": "/movies"
        }
    }

@app.get("/movies")
def get_all_movies():
    """Get all movies"""
    return movies_df.to_dict('records')

@app.get("/search/{query}")
def search_movies(query: str):
    """Search for movies"""
    if query.lower() == "all":
        return movies_df.to_dict('records')
    
    results = movies_df[movies_df['title'].str.contains(query, case=False, na=False)]
    return results.to_dict('records')

@app.get("/recommend/{movie_title}")
def recommend_movies(movie_title: str):
    """Get recommendations for a movie"""
    try:
        # Find movie index
        if movie_title not in movies_df['title'].values:
            return {"error": f"Movie '{movie_title}' not found. Available movies: {list(movies_df['title'].values)}"}
        
        idx = movies_df[movies_df['title'] == movie_title].index[0]
        
        # Get similarity scores
        sim_scores = list(enumerate(similarity_matrix[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)[1:6]  # Top 5 excluding self
        
        # Get recommended movies
        recommendations = []
        for i in sim_scores:
            movie_idx = i[0]
            if movie_idx < len(movies_df):
                movie_data = movies_df.iloc[movie_idx]
                
                # Get poster from TMDB
                poster = get_movie_poster(int(movie_data['movie_id']))
                
                recommendations.append({
                    "title": movie_data['title'],
                    "poster": poster,
                    "similarity": float(i[1]),
                    "rating": float(movie_data['rating']) if pd.notna(movie_data['rating']) else None,
                    "genres": movie_data['genres'],
                    "overview": movie_data['overview']
                })
        
        return recommendations
    
    except Exception as e:
        return {"error": str(e), "traceback": str(e.__traceback__)}

def get_movie_poster(movie_id: int):
    """Get movie poster URL from TMDB"""
    try:
        url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={TMDB_API_KEY}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'poster_path' in data and data['poster_path']:
                return f"https://image.tmdb.org/t/p/w500{data['poster_path']}"
        
        return "https://via.placeholder.com/500x750?text=Poster+Not+Available"
    
    except Exception as e:
        print(f"TMDB API error: {e}")
        return "https://via.placeholder.com/500x750?text=Poster+Error"

@app.post("/log_interaction")
def log_interaction(request: LogRequest):
    """Log user interaction"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO user_interactions (movie_title, action) VALUES (?, ?)",
            (request.movie_title, request.action)
        )
        
        conn.commit()
        return {"status": "success", "message": "Interaction logged"}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
    finally:
        conn.close()

@app.get("/popular")
def get_popular_movies(limit: int = 10):
    """Get popular movies (highest rated)"""
    sorted_movies = movies_df.sort_values('rating', ascending=False).head(limit)
    return sorted_movies.to_dict('records')

@app.get("/stats")
def get_stats():
    """Get API statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as total FROM user_interactions")
    interactions_count = cursor.fetchone()['total']
    
    conn.close()
    
    return {
        "total_movies": len(movies_df),
        "interactions_logged": interactions_count,
        "similarity_matrix_shape": similarity_matrix.shape,
        "sample_movies": list(movies_df['title'].head(5))
    }

# ============================================
# RUN THE APPLICATION
# ============================================

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("🎬 MOVIE RECOMMENDATION BACKEND")
    print("="*50)
    print(f"📊 Total movies: {len(movies_df)}")
    print(f"🔗 API URL: http://localhost:8000")
    print(f"📝 Available endpoints:")
    print(f"   • http://localhost:8000/ (Health check)")
    print(f"   • http://localhost:8000/movies (All movies)")
    print(f"   • http://localhost:8000/search/Inception (Search)")
    print(f"   • http://localhost:8000/recommend/Inception (Recommendations)")
    print(f"   • http://localhost:8000/popular (Popular movies)")
    print("="*50 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)