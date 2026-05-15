@echo off
title Lancer Sygalin (Reseau Local)
color 0B

echo ===================================================
echo        LANCEMENT DE SYGALIN SUR LE RESEAU
echo ===================================================
echo.

echo [1/2] Demarrage du Backend (FastAPI)...
start "Sygalin Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Demarrage du Frontend (React/Vite)...
start "Sygalin Frontend" cmd /k "cd frontend && npm run dev -- --host"

echo.
echo ===================================================
echo Les serveurs sont en cours de demarrage dans 
echo de nouvelles fenetres.
echo.
echo Vous pourrez acceder a Sygalin depuis ce PC sur:
echo http://localhost:5173
echo.
echo Depuis n'importe quel telephone/PC du reseau sur:
echo http://VOTRE_ADRESSE_IP:5173
echo ===================================================
echo.
pause
