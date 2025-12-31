import streamlit as st
import requests
import pandas as pd
import sqlite3

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
if 'user' not in st.session_state:
    st.session_state.user = None
if 'page' not in st.session_state:
    st.session_state.page = 'home'

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
        user_id = st.session_state.user.get('id') if st.session_state.user else None
        data = {"movie_title": movie_title, "action": action}
        if user_id:
            data["user_id"] = user_id
        
        response = requests.post(f"{BACKEND_URL}/log_interaction", 
                     json=data,
                     timeout=2)
        if response.status_code == 200:
            result = response.json()
            if result.get('status') == 'error':
                return result.get('message', 'Error')
        return "success"
    except:
        return None

def check_user_liked(movie_title):
    """Check if current user has liked a movie"""
    if not st.session_state.user:
        return False
    try:
        user_id = st.session_state.user.get('id')
        response = requests.get(f"{BACKEND_URL}/user/{user_id}/liked/{movie_title}", timeout=2)
        if response.status_code == 200:
            return response.json().get('liked', False)
    except:
        pass
    return False

def create_comment(movie_title, comment_text, rating=None):
    """Create a comment for a movie"""
    try:
        user_id = st.session_state.user.get('id') if st.session_state.user else None
        data = {
            "movie_title": movie_title,
            "comment_text": comment_text,
            "rating": rating
        }
        if user_id:
            data["user_id"] = user_id
        
        response = requests.post(f"{BACKEND_URL}/comments", json=data, timeout=5)
        return response.status_code == 200
    except:
        return False

def get_movie_comments(movie_title):
    """Get comments for a movie"""
    try:
        response = requests.get(f"{BACKEND_URL}/comments/{movie_title}", timeout=5)
        if response.status_code == 200:
            return response.json()
        return []
    except:
        return []

def check_backend():
    """Check if backend is running"""
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=2)
        return response.status_code == 200
    except:
        return False

def login_user(username, password):
    """Login user"""
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"username": username, "password": password},
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

def logout_user():
    """Logout user"""
    st.session_state.user = None
    st.session_state.page = 'home'
    st.rerun()

# Admin API functions
def get_admin_users():
    """Get all users (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.get(f"{BACKEND_URL}/admin/users", auth=auth, timeout=5)
        if response.status_code == 200:
            return response.json()
        return []
    except:
        return []

def update_admin_user(user_id, updates):
    """Update user (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.put(
            f"{BACKEND_URL}/admin/users/{user_id}",
            json=updates,
            auth=auth,
            timeout=5
        )
        return response.status_code == 200
    except:
        return False

def delete_admin_user(user_id):
    """Delete user (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.delete(f"{BACKEND_URL}/admin/users/{user_id}", auth=auth, timeout=5)
        return response.status_code == 200
    except:
        return False

def block_admin_user(user_id):
    """Block/unblock user (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.post(f"{BACKEND_URL}/admin/users/{user_id}/block", auth=auth, timeout=5)
        return response.status_code == 200
    except:
        return False

def get_admin_movies():
    """Get all movies from database (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.get(f"{BACKEND_URL}/admin/movies", auth=auth, timeout=5)
        if response.status_code == 200:
            return response.json()
        return []
    except:
        return []

def create_admin_movie(movie_data):
    """Create movie (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.post(
            f"{BACKEND_URL}/admin/movies",
            json=movie_data,
            auth=auth,
            timeout=5
        )
        return response.status_code == 200
    except:
        return False

def update_admin_movie(movie_id, updates):
    """Update movie (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.put(
            f"{BACKEND_URL}/admin/movies/{movie_id}",
            json=updates,
            auth=auth,
            timeout=5
        )
        return response.status_code == 200
    except:
        return False

def delete_admin_movie(movie_id):
    """Delete movie (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.delete(f"{BACKEND_URL}/admin/movies/{movie_id}", auth=auth, timeout=5)
        return response.status_code == 200
    except:
        return False

def get_admin_comments(flagged_only=False):
    """Get comments (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.get(
            f"{BACKEND_URL}/admin/comments?flagged_only={flagged_only}",
            auth=auth,
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        return []
    except:
        return []

def delete_admin_comment(comment_id):
    """Delete comment (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.delete(f"{BACKEND_URL}/admin/comments/{comment_id}", auth=auth, timeout=5)
        return response.status_code == 200
    except:
        return False

def flag_admin_comment(comment_id):
    """Flag comment (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.post(f"{BACKEND_URL}/admin/comments/{comment_id}/flag", auth=auth, timeout=5)
        return response.status_code == 200
    except:
        return False

def get_admin_analytics():
    """Get analytics (Admin)"""
    try:
        auth = (st.session_state.user['username'], st.session_state.user.get('password', ''))
        response = requests.get(f"{BACKEND_URL}/admin/analytics", auth=auth, timeout=5)
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

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
    
    # Navigation and Authentication
    col1, col2, col3 = st.columns([3, 1, 1])
    with col1:
        pass
    with col2:
        if st.session_state.user:
            if st.button("🏠 Home"):
                st.session_state.page = 'home'
                st.rerun()
        else:
            if st.button("🔐 Login"):
                st.session_state.page = 'login'
                st.rerun()
    with col3:
        if st.session_state.user:
            if st.session_state.user.get('role') == 'admin':
                if st.button("⚙️ Admin"):
                    st.session_state.page = 'admin'
                    st.rerun()
            if st.button("🚪 Logout"):
                logout_user()
    
    # Login Page
    if st.session_state.page == 'login':
        login_tab, register_tab = st.tabs(["🔐 Login", "📝 Create User"])
        
        with login_tab:
            st.markdown("### Login to your account")
            st.markdown("---")
            
            with st.form("login_form"):
                username = st.text_input("Username")
                password = st.text_input("Password", type="password")
                submit = st.form_submit_button("Login", type="primary")
                
                if submit:
                    result = login_user(username, password)
                    if result and result.get('status') == 'success':
                        st.session_state.user = result['user']
                        st.session_state.user['password'] = password  # Store for auth
                        st.session_state.page = 'home'
                        st.success("✅ Login successful!")
                        st.rerun()
                    else:
                        st.error("❌ Invalid username or password")
            
            st.info("**Default Admin:** username: `admin`, password: `admin123`")
        
        with register_tab:
            st.markdown("### Create a new account")
            st.markdown("---")
            
            with st.form("register_form"):
                new_username = st.text_input("Username *")
                new_email = st.text_input("Email *")
                new_password = st.text_input("Password *", type="password")
                confirm_password = st.text_input("Confirm Password *", type="password")
                register_submit = st.form_submit_button("Create Account", type="primary")
                
                if register_submit:
                    if not new_username or not new_email or not new_password:
                        st.error("❌ Please fill in all required fields")
                    elif new_password != confirm_password:
                        st.error("❌ Passwords do not match")
                    else:
                        try:
                            response = requests.post(
                                f"{BACKEND_URL}/auth/register",
                                json={
                                    "username": new_username,
                                    "email": new_email,
                                    "password": new_password,
                                    "role": "user"
                                },
                                timeout=5
                            )
                            if response.status_code == 200:
                                st.success("✅ Account created successfully! Please login.")
                                st.session_state.page = 'login'
                                st.rerun()
                            else:
                                error_msg = response.json().get('detail', 'Error creating account')
                                st.error(f"❌ {error_msg}")
                        except Exception as e:
                            st.error(f"❌ Error: {str(e)}")
        
        if st.button("← Back to Home"):
            st.session_state.page = 'home'
            st.rerun()
        st.stop()
    
    # Admin Panel
    if st.session_state.page == 'admin':
        if not st.session_state.user or st.session_state.user.get('role') != 'admin':
            st.error("❌ Admin access required. Please login as admin.")
            if st.button("Go to Login"):
                st.session_state.page = 'login'
                st.rerun()
            st.stop()
        
        st.markdown("## ⚙️ Admin Panel")
        st.markdown("---")
        
        admin_tab1, admin_tab2, admin_tab3, admin_tab4 = st.tabs([
            "👥 Manage Users", "🎬 Manage Movies", "💬 Moderate Comments", "📊 Analytics"
        ])
        
        # Tab 1: Manage Users
        with admin_tab1:
            st.markdown("### 👥 User Management")
            
            users = get_admin_users()
            if users:
                df_users = pd.DataFrame(users)
                st.dataframe(df_users, use_container_width=True, hide_index=True)
                
                st.markdown("#### Update User")
                user_id = st.number_input("User ID", min_value=1, step=1)
                if user_id:
                    user = next((u for u in users if u['id'] == user_id), None)
                    if user:
                        with st.form(f"update_user_{user_id}"):
                            new_username = st.text_input("Username", value=user['username'])
                            new_email = st.text_input("Email", value=user['email'])
                            new_role = st.selectbox("Role", ["user", "admin"], index=0 if user['role'] == 'user' else 1)
                            is_active = st.checkbox("Active", value=bool(user['is_active']))
                            is_blocked = st.checkbox("Blocked", value=bool(user['is_blocked']))
                            
                            col1, col2 = st.columns(2)
                            with col1:
                                if st.form_submit_button("Update User", type="primary"):
                                    if update_admin_user(user_id, {
                                        "username": new_username,
                                        "email": new_email,
                                        "role": new_role,
                                        "is_active": is_active,
                                        "is_blocked": is_blocked
                                    }):
                                        st.success("✅ User updated!")
                                        st.rerun()
                            with col2:
                                if st.form_submit_button("Block/Unblock"):
                                    if block_admin_user(user_id):
                                        st.success("✅ User status updated!")
                                        st.rerun()
                                if st.form_submit_button("Delete User"):
                                    if delete_admin_user(user_id):
                                        st.success("✅ User deleted!")
                                        st.rerun()
            else:
                st.info("No users found")
        
        # Tab 2: Manage Movies
        with admin_tab2:
            st.markdown("### 🎬 Movie Management")
            
            tab2_col1, tab2_col2 = st.columns(2)
            
            with tab2_col1:
                st.markdown("#### Add New Movie")
                with st.form("add_movie_form"):
                    new_title = st.text_input("Title *")
                    new_movie_id = st.number_input("Movie ID", min_value=1, step=1)
                    new_genres = st.text_input("Genres (separated by |)")
                    new_rating = st.number_input("Rating", min_value=0.0, max_value=10.0, step=0.1)
                    new_overview = st.text_area("Overview")
                    
                    if st.form_submit_button("Add Movie", type="primary"):
                        if new_title:
                            if create_admin_movie({
                                "title": new_title,
                                "movie_id": int(new_movie_id) if new_movie_id else None,
                                "genres": new_genres if new_genres else None,
                                "rating": float(new_rating) if new_rating else None,
                                "overview": new_overview if new_overview else None
                            }):
                                st.success("✅ Movie added!")
                                st.rerun()
                        else:
                            st.error("Title is required")
            
            with tab2_col2:
                st.markdown("#### Existing Movies")
                movies = get_admin_movies()
                if movies:
                    movie_df = pd.DataFrame(movies)
                    st.dataframe(movie_df[['id', 'title', 'genres', 'rating']], use_container_width=True, hide_index=True)
                    
                    st.markdown("#### Update/Delete Movie")
                    movie_to_manage = st.selectbox("Select movie", [m['title'] for m in movies])
                    if movie_to_manage:
                        selected_movie = next((m for m in movies if m['title'] == movie_to_manage), None)
                        if selected_movie:
                            with st.form(f"manage_movie_{selected_movie['id']}"):
                                update_title = st.text_input("Title", value=selected_movie.get('title', ''))
                                update_genres = st.text_input("Genres", value=selected_movie.get('genres', ''))
                                update_rating = st.number_input("Rating", value=float(selected_movie.get('rating', 0)), min_value=0.0, max_value=10.0, step=0.1)
                                update_overview = st.text_area("Overview", value=selected_movie.get('overview', ''))
                                
                                col1, col2 = st.columns(2)
                                with col1:
                                    if st.form_submit_button("Update Movie", type="primary"):
                                        if update_admin_movie(selected_movie['id'], {
                                            "title": update_title,
                                            "genres": update_genres,
                                            "rating": update_rating,
                                            "overview": update_overview
                                        }):
                                            st.success("✅ Movie updated!")
                                            st.rerun()
                                with col2:
                                    if st.form_submit_button("Delete Movie"):
                                        if delete_admin_movie(selected_movie['id']):
                                            st.success("✅ Movie deleted!")
                                            st.rerun()
        
        # Tab 3: Moderate Comments
        with admin_tab3:
            st.markdown("### 💬 Comment Moderation")
            
            show_flagged = st.checkbox("Show only flagged comments")
            comments = get_admin_comments(flagged_only=show_flagged)
            
            if comments:
                for comment in comments:
                    with st.expander(f"Comment #{comment['id']} - {comment.get('username', 'Unknown')} on {comment['movie_title']}"):
                        st.write(f"**Comment:** {comment['comment_text']}")
                        if comment.get('rating'):
                            st.write(f"**Rating:** {comment['rating']}/10")
                        st.write(f"**Created:** {comment['created_at']}")
                        st.write(f"**Flagged:** {'Yes' if comment['is_flagged'] else 'No'}")
                        
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            if st.button(f"Flag/Unflag", key=f"flag_{comment['id']}"):
                                if flag_admin_comment(comment['id']):
                                    st.success("✅ Comment status updated!")
                                    st.rerun()
                        with col2:
                            if st.button(f"Delete", key=f"delete_{comment['id']}"):
                                if delete_admin_comment(comment['id']):
                                    st.success("✅ Comment deleted!")
                                    st.rerun()
            else:
                st.info("No comments found")
        
        # Tab 4: Analytics
        with admin_tab4:
            st.markdown("### 📊 Analytics & Reports")
            
            analytics = get_admin_analytics()
            if analytics:
                # System Usage
                st.markdown("#### System Usage")
                usage = analytics['system_usage']
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Total Users", usage['total_users'])
                    st.metric("Active Users", usage['active_users'])
                with col2:
                    st.metric("Blocked Users", usage['blocked_users'])
                    st.metric("Total Movies", usage['total_movies'])
                with col3:
                    st.metric("Total Interactions", usage['total_interactions'])
                    st.metric("Total Comments", usage['total_comments'])
                with col4:
                    st.metric("Flagged Comments", usage['flagged_comments'])
                
                # Top Rated Movies
                st.markdown("#### Top Rated Movies")
                if analytics['top_rated_movies']:
                    top_movies_df = pd.DataFrame(analytics['top_rated_movies'])
                    st.dataframe(top_movies_df, use_container_width=True, hide_index=True)
                
                # Trending Genres
                st.markdown("#### Trending Genres")
                if analytics['trending_genres']:
                    genres_df = pd.DataFrame(analytics['trending_genres'])
                    st.dataframe(genres_df, use_container_width=True, hide_index=True)
                
                # User Engagement
                st.markdown("#### User Engagement")
                engagement = analytics['user_engagement']
                st.metric("Unique Movies Viewed", engagement.get('unique_movies_viewed', 0))
                st.metric("Total Interactions", engagement.get('total_interactions', 0))
                
                # Recent Admin Actions
                st.markdown("#### Recent Admin Actions")
                if analytics['recent_admin_actions']:
                    actions_df = pd.DataFrame(analytics['recent_admin_actions'])
                    st.dataframe(actions_df[['admin_username', 'action_type', 'target_type', 'timestamp']], 
                               use_container_width=True, hide_index=True)
            else:
                st.error("Failed to load analytics")
        
        if st.button("← Back to Home"):
            st.session_state.page = 'home'
            st.rerun()
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
            
            # Comments section for selected movie
            st.markdown("### 💬 Comments")
            comments_selected = get_movie_comments(st.session_state.selected_movie)
            if comments_selected:
                for comment in comments_selected:
                    with st.container():
                        st.markdown(f"**{comment.get('username', 'Anonymous')}** ⭐ {comment.get('rating', 'N/A')}/10")
                        st.write(comment.get('comment_text', ''))
                        st.caption(f"Posted: {comment.get('created_at', '')}")
                        st.markdown("---")
            else:
                st.info("No comments yet. Be the first to comment!")
            
            # Add comment form for selected movie
            if st.session_state.user:
                with st.expander("💬 Leave a comment", expanded=False):
                    with st.form("comment_form_selected"):
                        comment_text_selected = st.text_area("Your comment *")
                        comment_rating_selected = st.slider("Rating (1-10)", 1, 10, 5, key="rating_selected")
                        submit_comment_selected = st.form_submit_button("Submit Comment", type="primary")
                        
                        if submit_comment_selected:
                            if comment_text_selected:
                                if create_comment(st.session_state.selected_movie, comment_text_selected, float(comment_rating_selected)):
                                    st.success("✅ Comment submitted!")
                                    st.rerun()
                                else:
                                    st.error("❌ Failed to submit comment")
                            else:
                                st.error("❌ Please enter a comment")
            else:
                st.info("🔐 Please login to leave a comment")
            
            st.markdown("---")
            
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
                        
                        # Action buttons - only show if user is logged in
                        if st.session_state.user:
                            btn_col1, btn_col2 = st.columns(2)
                            user_liked = check_user_liked(movie['title'])
                            
                            with btn_col1:
                                if user_liked:
                                    st.button("👍 Liked", key=f"like_{idx}", disabled=True)
                                else:
                                    if st.button("👍", key=f"like_{idx}"):
                                        result = log_action(movie['title'], "like")
                                        if result == "success":
                                            st.success("✓ Liked")
                                            st.rerun()
                                        elif result:
                                            st.warning(result)
                            with btn_col2:
                                if st.button("💬 Comment", key=f"comment_btn_{idx}"):
                                    st.session_state[f"show_comment_{idx}"] = not st.session_state.get(f"show_comment_{idx}", False)
                                    st.rerun()
                        else:
                            st.info("🔐 Login to like and comment on movies")
                        
                        st.markdown('</div>', unsafe_allow_html=True)
                        
                        # Comment form
                        if st.session_state.user and st.session_state.get(f"show_comment_{idx}", False):
                            with st.expander(f"💬 Leave a comment on {movie['title']}", expanded=True):
                                with st.form(f"comment_form_{idx}"):
                                    comment_text = st.text_area("Your comment *")
                                    comment_rating = st.slider("Rating (1-10)", 1, 10, 5, key=f"rating_{idx}")
                                    submit_comment = st.form_submit_button("Submit Comment", type="primary")
                                    
                                    if submit_comment:
                                        if comment_text:
                                            if create_comment(movie['title'], comment_text, float(comment_rating)):
                                                st.success("✅ Comment submitted!")
                                                st.session_state[f"show_comment_{idx}"] = False
                                                st.rerun()
                                            else:
                                                st.error("❌ Failed to submit comment")
                                        else:
                                            st.error("❌ Please enter a comment")
                        
                        # Display comments for this movie
                        comments = get_movie_comments(movie['title'])
                        if comments:
                            with st.expander(f"💬 View Comments ({len(comments)})"):
                                for comment in comments[:5]:  # Show max 5 comments
                                    st.markdown(f"**{comment.get('username', 'Anonymous')}** ({comment.get('rating', 'N/A')}/10)")
                                    st.write(comment.get('comment_text', ''))
                                    st.caption(f"Posted: {comment.get('created_at', '')}")
                                    st.markdown("---")
    
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