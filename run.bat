@echo off
echo Starting Movie Recommender System...
echo.

echo Step 1: Creating project structure...
mkdir backend frontend 2>nul

echo.
echo Step 2: Installing dependencies...
pip install fastapi uvicorn pandas requests streamlit numpy

echo.
echo Step 3: Starting Backend...
start cmd /k "cd backend && python main.py"

timeout /t 5 /nobreak >nul

echo.
echo Step 4: Starting Frontend...
start cmd /k "cd frontend && streamlit run app.py"

echo.
echo ========================================
echo 🎬 Movie Recommender System is RUNNING!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:8501
echo.
echo Press any key to show instructions...
pause >nul

echo.
echo INSTRUCTIONS:
echo 1. Backend will create necessary files automatically
echo 2. Wait for "Application startup complete" message
echo 3. Frontend will open in your browser automatically
echo 4. If it doesn't open, go to http://localhost:8501
echo.
echo Press Ctrl+C in both terminal windows to stop
pause