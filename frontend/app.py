import streamlit as st
import requests
import pandas as pd

# Backend URL
BACKEND_URL = "http://localhost:8000"

# Page config
st.set_page_config(
    page_title="Movie Recommender",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS - Black & Grey Theme
st.markdown("""
<style>
    /* Main background */
    .stApp {
        background: #0a0a0a;
        min-height: 100vh;
        padding: 20px;
    }
    
    /* Main content container */
    .main-container {
        background: #1a1a1a;
        border-radius: 15px;
        padding: 30px;
        border: 1px solid #333;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        margin: 20px;
    }
    
    /* Movie cards */
    .movie-card {
        background: linear-gradient(145deg, #222 0%, #1a1a1a 100%);
        border-radius: 12px;
        padding: 15px;
        margin: 10px 0;
        border-left: 4px solid #666;
        border-top: 1px solid #333;
        border-bottom: 1px solid #333;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .movie-card:hover {
        transform: translateY(-5px);
        border-left: 4px solid #888;
        box-shadow: 0 10px 25px rgba(0,0,0,0.8);
        background: linear-gradient(145deg, #252525 0%, #1e1e1e 100%);
    }
    
    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, #333 0%, #555 100%);
        color: #ddd !important;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 10px 20px;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .stButton > button:hover {
        background: linear-gradient(135deg, #444 0%, #666 100%);
        border-color: #666;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(100, 100, 100, 0.3);
        color: #fff !important;
    }
    
    /* Primary button */
    div[data-testid="stButton"] > button[kind="primary"] {
        background: linear-gradient(135deg, #666 0%, #888 100%);
        color: #fff !important;
        border: none;
    }
    
    div[data-testid="stButton"] > button[kind="primary"]:hover {
        background: linear-gradient(135deg, #777 0%, #999 100%);
        box-shadow: 0 4px 15px rgba(150, 150, 150, 0.4);
    }
    
    /* Title styling */
    .title-text {
        background: linear-gradient(45deg, #aaa, #ddd);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
        letter-spacing: 1px;
        text-align: center;
    }
    
    .subtitle-text {
        color: #bbb;
        text-align: center;
        font-size: 18px;
        margin-bottom: 30px;
    }
    
    /* Sidebar */
    section[data-testid="stSidebar"] {
        background: #111;
        border-right: 1px solid #333;
    }
    
    section[data-testid="stSidebar"] > div {
        background: #111;
    }
    
    /* Sidebar text */
    section[data-testid="stSidebar"] h1,
    section[data-testid="stSidebar"] h2,
    section[data-testid="stSidebar"] h3,
    section[data-testid="stSidebar"] div,
    section[data-testid="stSidebar"] p,
    section[data-testid="stSidebar"] label {
        color: #ddd !important;
    }
    
    /* Input fields */
    .stTextInput > div > div > input {
        background: #222;
        color: #ddd;
        border: 1px solid #444;
        border-radius: 8px;
    }
    
    .stSelectbox > div > div {
        background: #222;
        color: #ddd;
        border: 1px solid #444;
        border-radius: 8px;
    }
    
    /* Dataframe */
    .stDataFrame {
        background: #1a1a1a;
        border: 1px solid #333;
    }
    
    /* Progress bar */
    .stProgress > div > div > div {
        background: linear-gradient(90deg, #666, #999);
    }
    
    /* Metrics */
    [data-testid="stMetricValue"], [data-testid="stMetricLabel"] {
        color: #ddd !important;
    }
    
    [data-testid="stMetricDelta"] {
        color: #aaa !important;
    }
    
    /* Success/Error/Info boxes */
    .stAlert {
        background: #222;
        border: 1px solid #444;
        color: #ddd;
        border-radius: 8px;
    }
    
    /* Divider */
    hr {
        border-color: #333;
        margin: 25px 0;
    }
    
    /* Text colors */
    h1, h2, h3, h4, h5, h6 {
        color: #eee;
    }
    
    p, label, div, span {
        color: #ccc;
    }
    
    /* Scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    
    ::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
    
    /* Card content */
    .movie-title {
        color: #eee;
        font-size: 14px;
        font-weight: 600;
        margin: 8px 0;
        text-align: center;
    }
    
    .movie-rating {
        color: #ffd700;
        font-size: 13px;
        text-align: center;
    }
    
    .movie-match {
        color: #aaa;
        font-size: 12px;
        text-align: center;
    }
    
    /* Footer */
    .footer {
        color: #777;
        text-align: center;
        padding: 20px;
        font-size: 14px;
        border-top: 1px solid #333;
        margin-top: 30px;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'recommendations' not in st.session_state:
    st.session_state.recommendations = []
if 'selected_movie' not in st.session_state:
    st.session_state.selected_movie = ""
if 'all_movies' not in st.session_state:
    st.session_state.all_movies = []

def get_all_movies():
    """Get all movies from backend"""
    try:
        response = requests.get(f"{BACKEND_URL}/movies", timeout=3)
        if response.status_code == 200:
            return response.json()
        return []
    except:
        st.error("⚠️ Cannot connect to backend. Make sure it's running!")
        return []

def get_recommendations(movie_title):
    """Get recommendations from backend"""
    try:
        response = requests.get(f"{BACKEND_URL}/recommend/{movie_title}", timeout=5)
        if response.status_code == 200:
            return response.json()
        return {"error": "Failed to get recommendations"}
    except Exception as e:
        return {"error": f"Backend error: {str(e)}"}

def log_action(movie_title, action):
    """Log user action to backend"""
    try:
        requests.post(f"{BACKEND_URL}/log_interaction", 
                     json={"movie_title": movie_title, "action": action},
                     timeout=2)
    except:
        pass

def check_backend():
    """Check if backend is running"""
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=2)
        return response.status_code == 200
    except:
        return False

# Main container
with st.container():
    st.markdown('<div class="main-container">', unsafe_allow_html=True)
    
    # Title with icon
    st.markdown('<h1 class="title-text">🎬 CINEMATIC AI</h1>', unsafe_allow_html=True)
    st.markdown('<p class="subtitle-text">Discover your next favorite movie with intelligent recommendations</p>', unsafe_allow_html=True)
    st.markdown("---")
    
    # Check backend status
    if not check_backend():
        st.error("""
        ⚠️ **Backend Service Offline**
        
        Start the backend server first:
        ```bash
        cd backend
        python main.py
        ```
        
        Wait for "Application startup complete" then refresh.
        """)
        st.stop()
    
    # Get all movies for dropdown
    if not st.session_state.all_movies:
        st.session_state.all_movies = get_all_movies()
    
    # Sidebar - Dark Theme
    with st.sidebar:
        st.markdown("### 🔍 NAVIGATION")
        st.markdown("---")
        
        # Movie selection dropdown
        if st.session_state.all_movies:
            movie_titles = [movie['title'] for movie in st.session_state.all_movies]
            selected = st.selectbox(
                "SELECT A MOVIE",
                movie_titles,
                index=None,
                placeholder="Choose a movie..."
            )
            
            if selected:
                st.session_state.selected_movie = selected
        
        st.markdown("---")
        st.markdown("### 🔎 SEARCH")
        search_query = st.text_input("", placeholder="Type movie name...")
        
        if search_query:
            try:
                response = requests.get(f"{BACKEND_URL}/search/{search_query}", timeout=3)
                if response.status_code == 200:
                    results = response.json()
                    if results:
                        st.markdown("**Results:**")
                        for movie in results[:5]:
                            if st.button(f"▸ {movie['title']}", key=f"search_{movie['title']}"):
                                st.session_state.selected_movie = movie['title']
                                st.rerun()
            except:
                pass
        
        st.markdown("---")
        st.markdown("### 🔥 TRENDING")
        try:
            response = requests.get(f"{BACKEND_URL}/popular?limit=5", timeout=3)
            if response.status_code == 200:
                popular = response.json()
                for movie in popular:
                    if st.button(f"★ {movie['title']} ({movie['rating']})", key=f"pop_{movie['title']}"):
                        st.session_state.selected_movie = movie['title']
                        st.rerun()
        except:
            pass
        
        st.markdown("---")
        st.markdown("### 📊 STATISTICS")
        try:
            response = requests.get(f"{BACKEND_URL}/stats", timeout=2)
            if response.status_code == 200:
                stats = response.json()
                col1, col2 = st.columns(2)
                with col1:
                    st.metric("Movies", stats['total_movies'])
                with col2:
                    st.metric("Interactions", stats['interactions_logged'])
        except:
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Movies", len(st.session_state.all_movies))
            with col2:
                st.metric("Interactions", "0")
    
    # Main content area
    col1, col2 = st.columns([3, 1])
    
    with col1:
        # Display selected movie
        if st.session_state.selected_movie:
            st.success(f"✅ **SELECTED:** {st.session_state.selected_movie}")
            
            # Get and display recommendations
            if st.button("🎯 GET RECOMMENDATIONS", type="primary", use_container_width=True):
                with st.spinner("Analyzing preferences..."):
                    recommendations = get_recommendations(st.session_state.selected_movie)
                    st.session_state.recommendations = recommendations
                    
                    # Log the action
                    log_action(st.session_state.selected_movie, "search")
    
    with col2:
        if st.button("🔄 CLEAR", use_container_width=True):
            st.session_state.recommendations = []
            st.session_state.selected_movie = ""
            st.rerun()
    
    # Display recommendations
    if st.session_state.recommendations:
        st.markdown("## 🎉 RECOMMENDATIONS")
        st.markdown("---")
        
        # Check for errors
        if isinstance(st.session_state.recommendations, dict) and 'error' in st.session_state.recommendations:
            st.error(f"**Error:** {st.session_state.recommendations['error']}")
            
            # Show available movies
            st.info(f"**Available movies:** {', '.join([m['title'] for m in st.session_state.all_movies[:10]])}...")
        
        else:
            # Display in columns
            cols = st.columns(5)
            
            for idx, movie in enumerate(st.session_state.recommendations):
                if idx >= 5:
                    break
                    
                with cols[idx % 5]:
                    with st.container():
                        st.markdown('<div class="movie-card">', unsafe_allow_html=True)
                        
                        # Movie poster
                        if movie.get('poster'):
                            st.image(movie['poster'], use_column_width=True)
                        else:
                            st.image("https://via.placeholder.com/150x225/333/666?text=NO+POSTER", 
                                    use_column_width=True)
                        
                        # Movie title
                        st.markdown(f'<p class="movie-title">{movie["title"]}</p>', unsafe_allow_html=True)
                        
                        # Rating
                        if movie.get('rating'):
                            st.markdown(f'<p class="movie-rating">⭐ {movie["rating"]}/10</p>', unsafe_allow_html=True)
                        
                        # Similarity score
                        if movie.get('similarity'):
                            similarity_percent = int(movie['similarity'] * 100)
                            st.progress(similarity_percent / 100)
                            st.markdown(f'<p class="movie-match">Match: {similarity_percent}%</p>', unsafe_allow_html=True)
                        
                        # Genres
                        if movie.get('genres'):
                            st.caption(f"🎭 {movie['genres']}")
                        
                        # Action buttons
                        btn_col1, btn_col2 = st.columns(2)
                        with btn_col1:
                            if st.button("👍", key=f"like_{idx}"):
                                log_action(movie['title'], "like")
                                st.success("✓ Liked")
                        with btn_col2:
                            if st.button("👎", key=f"dislike_{idx}"):
                                log_action(movie['title'], "dislike")
                                st.info("✓ Disliked")
                        
                        st.markdown('</div>', unsafe_allow_html=True)
    
    # If no movie selected, show all movies
    elif not st.session_state.selected_movie:
        st.markdown("## 🎬 MOVIE LIBRARY")
        st.markdown("---")
        
        # Display all movies in a table
        if st.session_state.all_movies:
            df = pd.DataFrame(st.session_state.all_movies)
            # Style the dataframe
            st.dataframe(
                df[['title', 'genres', 'rating']].rename(
                    columns={'title': '🎬 Title', 'genres': '🎭 Genres', 'rating': '⭐ Rating'}
                ),
                use_container_width=True,
                hide_index=True
            )
    
    # Footer
    st.markdown("---")
    st.markdown(
        """
        <div class="footer">
            <p>🎬 CINEMATIC AI • Movie Recommendation System</p>
            <p style="font-size: 12px; color: #666;">Powered by FastAPI & Streamlit</p>
            <p style="font-size: 11px; color: #555;">Backend: http://localhost:8000 • Frontend: http://localhost:8501</p>
        </div>
        """,
        unsafe_allow_html=True
    )
    
    st.markdown('</div>', unsafe_allow_html=True)