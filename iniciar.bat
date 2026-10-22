@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Instale o Node.js 20.9 ou superior em https://nodejs.org e tente novamente. & pause & exit /b 1)
if not exist node_modules (
  echo Instalando dependencias do projeto (internet necessaria)...
  call npm ci --no-audit --no-fund || (echo Falha na instalacao. & pause & exit /b 1)
)
if not exist .next (
  echo Compilando a versao local para teste de producao...
  if "%NEXT_PUBLIC_SITE_URL%"=="" set NEXT_PUBLIC_SITE_URL=http://localhost:3000
  set RAIZ_PREVIEW_DRAFTS=0
  call npm run build || (echo Falha na compilacao. Confira o terminal. & pause & exit /b 1)
)
echo.
echo Abrindo RAIZ em http://localhost:3000
start "" http://localhost:3000
call npm run start -- -p 3000
