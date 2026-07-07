@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Dependency Node.js belum terpasang. Menjalankan npm install...
  npm install
)

start "" http://localhost:3000
npm run dev

if errorlevel 1 (
  echo.
  echo Gagal menjalankan aplikasi. Pastikan Node.js terpasang dan .env.local sudah benar.
  pause
)
