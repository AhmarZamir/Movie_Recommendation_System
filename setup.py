import os
import subprocess
import sys

def install_dependencies():
    """Install all required packages"""
    print("📦 Installing dependencies...")
    
    requirements = [
        "fastapi==0.104.1",
        "uvicorn==0.24.0",
        "pandas==2.1.3",
        "requests==2.31.0",
        "streamlit==1.28.1"
    ]
    
    for package in requirements:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    
    print("✅ Dependencies installed!")

def create_project_structure():
    """Create necessary folders and files"""
    print("📁 Creating project structure...")
    
    folders = ['backend', 'frontend', 'data', 'models']
    for folder in folders:
        os.makedirs(folder, exist_ok=True)
        print(f"  Created {folder}/")
    
    print("✅ Project structure created!")

def check_data_files():
    """Check if data files exist"""
    print("🔍 Checking data files...")
    
    # Create sample movies.csv if it doesn't exist
    if not os.path.exists('data/movies.csv'):
        import pandas as pd
        
        sample_data = {
            'title': ['The Dark Knight', 'Inception', 'Pulp Fiction', 'Forrest Gump', 'The Godfather'],
            'movie_id': [155, 27205, 680, 13, 238],
            'genres': ['Action|Crime|Drama', 'Action|Sci-Fi|Thriller', 'Crime|Drama', 'Drama|Romance', 'Crime|Drama'],
            'rating': [9.0, 8.8, 8.9, 8.8, 9.2]
        }
        
        df = pd.DataFrame(sample_data)
        df.to_csv('data/movies.csv', index=False)
        print("  Created sample movies.csv")
    
    # Create sample similarity matrix
    if not os.path.exists('models/similarity.pkl'):
        import pickle
        import numpy as np
        
        # Create a simple 5x5 similarity matrix
        similarity = np.array([
            [1.0, 0.8, 0.6, 0.4, 0.2],
            [0.8, 1.0, 0.7, 0.5, 0.3],
            [0.6, 0.7, 1.0, 0.6, 0.4],
            [0.4, 0.5, 0.6, 1.0, 0.5],
            [0.2, 0.3, 0.4, 0.5, 1.0]
        ])
        
        with open('models/similarity.pkl', 'wb') as f:
            pickle.dump(similarity, f)
        print("  Created sample similarity.pkl")
    
    print("✅ Data files ready!")

def main():
    print("🚀 Setting up Movie Recommender System...")
    print("=" * 50)
    
    try:
        install_dependencies()
        print("-" * 50)
        create_project_structure()
        print("-" * 50)
        check_data_files()
        print("-" * 50)
        
        print("\n🎉 Setup complete!")
        print("\nTo run the system:")
        print("1. Start backend: python backend/main.py")
        print("2. Start frontend: streamlit run frontend/app.py")
        print("\nOr use run.bat / run.sh")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()