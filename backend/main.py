from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
import pickle
import pandas as pd
import sqlite3
import numpy as np
from typing import List, Optional
import os
import requests
import json
import hashlib
from datetime import datetime

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
        overview TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create user interactions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        movie_title TEXT,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        is_blocked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )
    ''')
    
    # Create comments/reviews table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        movie_title TEXT,
        comment_text TEXT NOT NULL,
        rating REAL,
        is_approved INTEGER DEFAULT 1,
        is_flagged INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    
    # Create admin actions log
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS admin_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        action_type TEXT,
        target_type TEXT,
        target_id INTEGER,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
    )
    ''')
    
    # Insert default admin user (username: admin, password: admin123)
    # In production, use proper password hashing
    admin_password_hash = hashlib.sha256("admin123".encode()).hexdigest()
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
    ''', ("admin", "admin@movieapp.com", admin_password_hash, "admin", 1))
    
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

def ensure_tables_exist():
    """Ensure all required tables exist in database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if users table exists, if not create it
    cursor.execute('''
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='users'
    ''')
    users_table_exists = cursor.fetchone()
    
    if not users_table_exists:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                is_active INTEGER DEFAULT 1,
                is_blocked INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        ''')
        conn.commit()
        print("✅ Created users table")
    
    # Check if comments table exists, if not create it
    cursor.execute('''
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='comments'
    ''')
    comments_table_exists = cursor.fetchone()
    
    if not comments_table_exists:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                movie_title TEXT,
                comment_text TEXT NOT NULL,
                rating REAL,
                is_approved INTEGER DEFAULT 1,
                is_flagged INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        conn.commit()
        print("✅ Created comments table")
    
    # Check if admin_actions table exists, if not create it
    cursor.execute('''
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='admin_actions'
    ''')
    admin_actions_table_exists = cursor.fetchone()
    
    if not admin_actions_table_exists:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admin_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER,
                action_type TEXT,
                target_type TEXT,
                target_id INTEGER,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id)
            )
        ''')
        conn.commit()
        print("✅ Created admin_actions table")
    
    # Update user_interactions table to add user_id if it doesn't exist
    cursor.execute("PRAGMA table_info(user_interactions)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'user_id' not in columns:
        try:
            cursor.execute('''
                ALTER TABLE user_interactions 
                ADD COLUMN user_id INTEGER
            ''')
            conn.commit()
            print("✅ Added user_id column to user_interactions table")
        except Exception as e:
            print(f"Note: Could not add user_id column (might already exist): {e}")
            pass  # Column might already exist
    
    conn.close()

def ensure_admin_user():
    """Ensure admin user exists in database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if admin user exists
    cursor.execute("SELECT * FROM users WHERE username = ?", ("admin",))
    admin_user = cursor.fetchone()
    
    if not admin_user:
        # Create admin user
        admin_password_hash = hashlib.sha256("admin123".encode()).hexdigest()
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        ''', ("admin", "admin@movieapp.com", admin_password_hash, "admin", 1))
        conn.commit()
        print("✅ Created admin user (username: admin, password: admin123)")
    else:
        print("✅ Admin user already exists")
    
    conn.close()

# Ensure all tables exist (call after get_db_connection is defined)
ensure_tables_exist()
ensure_admin_user()

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
    user_id: Optional[int] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: Optional[str] = "user"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_blocked: Optional[bool] = None

class MovieCreate(BaseModel):
    title: str
    movie_id: Optional[int] = None
    genres: Optional[str] = None
    rating: Optional[float] = None
    overview: Optional[str] = None

class MovieUpdate(BaseModel):
    title: Optional[str] = None
    genres: Optional[str] = None
    rating: Optional[float] = None
    overview: Optional[str] = None

class CommentCreate(BaseModel):
    movie_title: str
    comment_text: str
    rating: Optional[float] = None
    user_id: Optional[int] = None

# Authentication
security = HTTPBasic()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash

def get_current_user(credentials: HTTPBasicCredentials = Depends(security)):
    """Get current authenticated user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE username = ?", (credentials.username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if user['is_blocked']:
        raise HTTPException(status_code=403, detail="Account is blocked")
    
    if not user['is_active']:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # Update last login
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (datetime.now(), user['id']))
    conn.commit()
    conn.close()
    
    return dict(user)

def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Verify user is admin"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

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
    """Log user interaction (prevents duplicate likes)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if user has already liked/disliked this movie
        if request.user_id and request.action in ['like', 'dislike']:
            cursor.execute(
                "SELECT * FROM user_interactions WHERE user_id = ? AND movie_title = ? AND action IN ('like', 'dislike')",
                (request.user_id, request.movie_title)
            )
            existing = cursor.fetchone()
            if existing:
                conn.close()
                return {"status": "error", "message": f"You have already {existing['action']}d this movie"}
        
        # Insert interaction
        if request.user_id:
            cursor.execute(
                "INSERT INTO user_interactions (user_id, movie_title, action) VALUES (?, ?, ?)",
                (request.user_id, request.movie_title, request.action)
            )
        else:
            cursor.execute(
                "INSERT INTO user_interactions (movie_title, action) VALUES (?, ?)",
                (request.movie_title, request.action)
            )
        
        conn.commit()
        return {"status": "success", "message": "Interaction logged"}
    
    except sqlite3.IntegrityError as e:
        # Unique constraint violation
        conn.close()
        return {"status": "error", "message": "You have already performed this action on this movie"}
    except Exception as e:
        conn.close()
        return {"status": "error", "message": str(e)}
    
    finally:
        if conn:
            conn.close()

@app.get("/user/{user_id}/liked/{movie_title}")
def check_user_liked(user_id: int, movie_title: str):
    """Check if user has liked a movie"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM user_interactions WHERE user_id = ? AND movie_title = ? AND action = 'like'",
        (user_id, movie_title)
    )
    liked = cursor.fetchone()
    conn.close()
    
    return {"liked": liked is not None}

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
# AUTHENTICATION ENDPOINTS
# ============================================

@app.post("/auth/login")
def login(request: LoginRequest):
    """Login endpoint"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE username = ?", (request.username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not verify_password(request.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if user['is_blocked']:
        raise HTTPException(status_code=403, detail="Account is blocked")
    
    if not user['is_active']:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # Update last login
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (datetime.now(), user['id']))
    conn.commit()
    conn.close()
    
    return {
        "status": "success",
        "user": {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role'],
            "is_active": bool(user['is_active']),
            "is_blocked": bool(user['is_blocked'])
        }
    }

@app.post("/auth/register")
def register(user_data: UserCreate):
    """Register new user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if username or email exists
    cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", 
                   (user_data.username, user_data.email))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Create user
    password_hash = hash_password(user_data.password)
    cursor.execute('''
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_data.username, user_data.email, password_hash, user_data.role, 1))
    
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    
    return {"status": "success", "message": "User created successfully", "user_id": user_id}

@app.get("/auth/debug/admin")
def debug_admin_user():
    """Debug endpoint to check admin user (for troubleshooting)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if users table exists
    cursor.execute('''
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='users'
    ''')
    table_exists = cursor.fetchone()
    
    if not table_exists:
        return {
            "error": "Users table does not exist",
            "action": "Restart the backend server to create the table"
        }
    
    # Get admin user
    cursor.execute("SELECT id, username, email, role, is_active, is_blocked FROM users WHERE username = ?", ("admin",))
    admin_user = cursor.fetchone()
    
    conn.close()
    
    if not admin_user:
        # Try to create admin user
        ensure_admin_user()
        return {
            "status": "Admin user was missing, attempting to create...",
            "action": "Please try logging in again"
        }
    
    # Test password hash
    test_password = "admin123"
    expected_hash = hashlib.sha256(test_password.encode()).hexdigest()
    
    # Get stored hash (we already have admin_user, but need to get password_hash)
    conn2 = get_db_connection()
    cursor2 = conn2.cursor()
    cursor2.execute("SELECT password_hash FROM users WHERE username = ?", ("admin",))
    stored_hash_row = cursor2.fetchone()
    stored_hash = stored_hash_row['password_hash'] if stored_hash_row else None
    conn2.close()
    
    return {
        "admin_user_exists": True,
        "admin_user": dict(admin_user),
        "password_test": {
            "expected_hash": expected_hash,
            "stored_hash": stored_hash,
            "match": expected_hash == stored_hash if stored_hash else False
        },
        "login_credentials": {
            "username": "admin",
            "password": "admin123"
        }
    }

# ============================================
# ADMIN ENDPOINTS - USER MANAGEMENT
# ============================================

@app.get("/admin/users")
def get_all_users(admin: dict = Depends(get_admin_user)):
    """Get all users (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role, is_active, is_blocked, created_at, last_login FROM users")
    users = cursor.fetchall()
    conn.close()
    
    return [dict(user) for user in users]

@app.get("/admin/users/{user_id}")
def get_user(user_id: int, admin: dict = Depends(get_admin_user)):
    """Get user by ID (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role, is_active, is_blocked, created_at, last_login FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return dict(user)

@app.put("/admin/users/{user_id}")
def update_user(user_id: int, user_update: UserUpdate, admin: dict = Depends(get_admin_user)):
    """Update user (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update query
    updates = []
    values = []
    
    if user_update.username is not None:
        updates.append("username = ?")
        values.append(user_update.username)
    if user_update.email is not None:
        updates.append("email = ?")
        values.append(user_update.email)
    if user_update.role is not None:
        updates.append("role = ?")
        values.append(user_update.role)
    if user_update.is_active is not None:
        updates.append("is_active = ?")
        values.append(1 if user_update.is_active else 0)
    if user_update.is_blocked is not None:
        updates.append("is_blocked = ?")
        values.append(1 if user_update.is_blocked else 0)
    
    if updates:
        updates.append("updated_at = ?")
        values.append(datetime.now())
        values.append(user_id)
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, values)
        conn.commit()
        
        # Log admin action
        cursor.execute('''
            INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (admin['id'], 'update_user', 'user', user_id, f"Updated user {user_id}"))
        conn.commit()
    
    conn.close()
    return {"status": "success", "message": "User updated successfully"}

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, admin: dict = Depends(get_admin_user)):
    """Delete user (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    
    # Log admin action
    cursor.execute('''
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?)
    ''', (admin['id'], 'delete_user', 'user', user_id, f"Deleted user {user_id}"))
    conn.commit()
    
    conn.close()
    return {"status": "success", "message": "User deleted successfully"}

@app.post("/admin/users/{user_id}/block")
def block_user(user_id: int, admin: dict = Depends(get_admin_user)):
    """Block/unblock user (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    new_blocked_status = 0 if user['is_blocked'] else 1
    cursor.execute("UPDATE users SET is_blocked = ? WHERE id = ?", (new_blocked_status, user_id))
    conn.commit()
    
    # Log admin action
    action = 'unblock_user' if new_blocked_status == 0 else 'block_user'
    cursor.execute('''
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?)
    ''', (admin['id'], action, 'user', user_id, f"{action} {user_id}"))
    conn.commit()
    
    conn.close()
    return {"status": "success", "message": f"User {'blocked' if new_blocked_status else 'unblocked'} successfully"}

# ============================================
# ADMIN ENDPOINTS - MOVIE MANAGEMENT
# ============================================

@app.get("/admin/movies")
def get_admin_movies_list(admin: dict = Depends(get_admin_user)):
    """Get all movies from database (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM movies ORDER BY title")
    movies = cursor.fetchall()
    conn.close()
    return [dict(movie) for movie in movies]

@app.post("/admin/movies")
def create_movie(movie_data: MovieCreate, admin: dict = Depends(get_admin_user)):
    """Add new movie (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO movies (title, movie_id, genres, rating, overview)
        VALUES (?, ?, ?, ?, ?)
    ''', (movie_data.title, movie_data.movie_id, movie_data.genres, movie_data.rating, movie_data.overview))
    
    conn.commit()
    movie_id = cursor.lastrowid
    
    # Log admin action
    cursor.execute('''
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?)
    ''', (admin['id'], 'create_movie', 'movie', movie_id, f"Created movie: {movie_data.title}"))
    conn.commit()
    
    conn.close()
    
    # Reload movies_df
    global movies_df
    movies_df = pd.read_csv('data/movies.csv')
    
    return {"status": "success", "message": "Movie created successfully", "movie_id": movie_id}

@app.put("/admin/movies/{movie_id}")
def update_movie(movie_id: int, movie_update: MovieUpdate, admin: dict = Depends(get_admin_user)):
    """Update movie (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM movies WHERE id = ?", (movie_id,))
    movie = cursor.fetchone()
    if not movie:
        conn.close()
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # Build update query
    updates = []
    values = []
    
    if movie_update.title is not None:
        updates.append("title = ?")
        values.append(movie_update.title)
    if movie_update.genres is not None:
        updates.append("genres = ?")
        values.append(movie_update.genres)
    if movie_update.rating is not None:
        updates.append("rating = ?")
        values.append(movie_update.rating)
    if movie_update.overview is not None:
        updates.append("overview = ?")
        values.append(movie_update.overview)
    
    if updates:
        updates.append("updated_at = ?")
        values.append(datetime.now())
        values.append(movie_id)
        
        query = f"UPDATE movies SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, values)
        conn.commit()
        
        # Log admin action
        cursor.execute('''
            INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (admin['id'], 'update_movie', 'movie', movie_id, f"Updated movie {movie_id}"))
        conn.commit()
    
    conn.close()
    return {"status": "success", "message": "Movie updated successfully"}

@app.delete("/admin/movies/{movie_id}")
def delete_movie(movie_id: int, admin: dict = Depends(get_admin_user)):
    """Delete movie (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM movies WHERE id = ?", (movie_id,))
    movie = cursor.fetchone()
    if not movie:
        conn.close()
        raise HTTPException(status_code=404, detail="Movie not found")
    
    cursor.execute("DELETE FROM movies WHERE id = ?", (movie_id,))
    conn.commit()
    
    # Log admin action
    cursor.execute('''
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?)
    ''', (admin['id'], 'delete_movie', 'movie', movie_id, f"Deleted movie {movie_id}"))
    conn.commit()
    
    conn.close()
    return {"status": "success", "message": "Movie deleted successfully"}

# ============================================
# ADMIN ENDPOINTS - COMMENT MODERATION
# ============================================

@app.get("/admin/comments")
def get_all_comments(admin: dict = Depends(get_admin_user), flagged_only: bool = False):
    """Get all comments (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if flagged_only:
        cursor.execute('''
            SELECT c.*, u.username 
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.is_flagged = 1
            ORDER BY c.created_at DESC
        ''')
    else:
        cursor.execute('''
            SELECT c.*, u.username 
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        ''')
    
    comments = cursor.fetchall()
    conn.close()
    
    return [dict(comment) for comment in comments]

@app.delete("/admin/comments/{comment_id}")
def delete_comment(comment_id: int, admin: dict = Depends(get_admin_user)):
    """Delete comment (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM comments WHERE id = ?", (comment_id,))
    comment = cursor.fetchone()
    if not comment:
        conn.close()
        raise HTTPException(status_code=404, detail="Comment not found")
    
    cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
    conn.commit()
    
    # Log admin action
    cursor.execute('''
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?)
    ''', (admin['id'], 'delete_comment', 'comment', comment_id, f"Deleted comment {comment_id}"))
    conn.commit()
    
    conn.close()
    return {"status": "success", "message": "Comment deleted successfully"}

@app.post("/admin/comments/{comment_id}/flag")
def flag_comment(comment_id: int, admin: dict = Depends(get_admin_user)):
    """Flag/unflag comment (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM comments WHERE id = ?", (comment_id,))
    comment = cursor.fetchone()
    if not comment:
        conn.close()
        raise HTTPException(status_code=404, detail="Comment not found")
    
    new_flag_status = 0 if comment['is_flagged'] else 1
    cursor.execute("UPDATE comments SET is_flagged = ? WHERE id = ?", (new_flag_status, comment_id))
    conn.commit()
    
    # Log admin action
    action = 'unflag_comment' if new_flag_status == 0 else 'flag_comment'
    cursor.execute('''
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?)
    ''', (admin['id'], action, 'comment', comment_id, f"{action} {comment_id}"))
    conn.commit()
    
    conn.close()
    return {"status": "success", "message": f"Comment {'flagged' if new_flag_status else 'unflagged'} successfully"}

# ============================================
# ADMIN ENDPOINTS - ANALYTICS & REPORTS
# ============================================

@app.get("/admin/analytics")
def get_analytics(admin: dict = Depends(get_admin_user)):
    """Get system analytics (Admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total users
    cursor.execute("SELECT COUNT(*) as total FROM users")
    total_users = cursor.fetchone()['total']
    
    # Active users
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE is_active = 1")
    active_users = cursor.fetchone()['total']
    
    # Blocked users
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE is_blocked = 1")
    blocked_users = cursor.fetchone()['total']
    
    # Total movies
    cursor.execute("SELECT COUNT(*) as total FROM movies")
    total_movies = cursor.fetchone()['total']
    
    # Total interactions
    cursor.execute("SELECT COUNT(*) as total FROM user_interactions")
    total_interactions = cursor.fetchone()['total']
    
    # Total comments
    cursor.execute("SELECT COUNT(*) as total FROM comments")
    total_comments = cursor.fetchone()['total']
    
    # Flagged comments
    cursor.execute("SELECT COUNT(*) as total FROM comments WHERE is_flagged = 1")
    flagged_comments = cursor.fetchone()['total']
    
    # Top rated movies
    cursor.execute('''
        SELECT title, rating, genres 
        FROM movies 
        ORDER BY rating DESC 
        LIMIT 10
    ''')
    top_rated_movies = [dict(row) for row in cursor.fetchall()]
    
    # Trending genres
    cursor.execute('''
        SELECT genres, COUNT(*) as count
        FROM movies
        WHERE genres IS NOT NULL
        GROUP BY genres
        ORDER BY count DESC
        LIMIT 10
    ''')
    trending_genres = [dict(row) for row in cursor.fetchall()]
    
    # User engagement (interactions per user)
    cursor.execute('''
        SELECT COUNT(DISTINCT movie_title) as unique_movies_viewed,
               COUNT(*) as total_interactions
        FROM user_interactions
    ''')
    engagement = dict(cursor.fetchone())
    
    # Recent admin actions
    cursor.execute('''
        SELECT a.*, u.username as admin_username
        FROM admin_actions a
        LEFT JOIN users u ON a.admin_id = u.id
        ORDER BY a.timestamp DESC
        LIMIT 20
    ''')
    recent_actions = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "system_usage": {
            "total_users": total_users,
            "active_users": active_users,
            "blocked_users": blocked_users,
            "total_movies": total_movies,
            "total_interactions": total_interactions,
            "total_comments": total_comments,
            "flagged_comments": flagged_comments
        },
        "top_rated_movies": top_rated_movies,
        "trending_genres": trending_genres,
        "user_engagement": engagement,
        "recent_admin_actions": recent_actions
    }

# ============================================
# USER ENDPOINTS - COMMENTS
# ============================================

@app.post("/comments")
def create_comment(comment_data: CommentCreate):
    """Create a comment/review"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Use user_id from request, default to 1 if not provided
    user_id = comment_data.user_id if comment_data.user_id else 1
    
    cursor.execute('''
        INSERT INTO comments (user_id, movie_title, comment_text, rating, is_approved, is_flagged)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, comment_data.movie_title, comment_data.comment_text, comment_data.rating, 1, 0))
    
    conn.commit()
    comment_id = cursor.lastrowid
    conn.close()
    
    return {"status": "success", "message": "Comment created successfully", "comment_id": comment_id}

@app.get("/comments/{movie_title}")
def get_movie_comments(movie_title: str):
    """Get comments for a movie"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT c.*, u.username 
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.movie_title = ? AND c.is_approved = 1 AND c.is_flagged = 0
        ORDER BY c.created_at DESC
    ''', (movie_title,))
    
    comments = cursor.fetchall()
    conn.close()
    
    return [dict(comment) for comment in comments]

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