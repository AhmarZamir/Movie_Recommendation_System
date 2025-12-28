import subprocess
import sys
import os

def start_backend():
    print("🚀 Starting Backend Server...")
    os.chdir("backend")
    subprocess.run([sys.executable, "main.py"])

if __name__ == "__main__":
    start_backend()