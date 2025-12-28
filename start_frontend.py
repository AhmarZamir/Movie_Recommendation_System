import subprocess
import sys
import os

def start_frontend():
    print("🚀 Starting Frontend...")
    os.chdir("frontend")
    subprocess.run([sys.executable, "-m", "streamlit", "run", "app.py"])

if __name__ == "__main__":
    start_frontend()