@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Instale o Node.js 20 ou superior em https://nodejs.org e rode este arquivo de novo. & pause & exit /b 1)
if not exist node_modules (
  echo Instalando dependencias, so na primeira vez...
  call npm install --omit=dev --no-audit --no-fund || (echo Falha ao instalar. & pause & exit /b 1)
)
if not exist .next (
  echo Gerando o build de producao, so na primeira vez...
  call npm install --no-audit --no-fund && call npm run build || (echo Falha no build. & pause & exit /b 1)
)
echo.
echo Raiz em http://localhost:3000  (Ctrl+C para encerrar)
start "" http://localhost:3000
call npm run start -- -p 3000
