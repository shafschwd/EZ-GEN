@echo off
REM EZ-GEN Docker Management Script for Windows

setlocal enabledelayedexpansion

echo 🐳 EZ-GEN Docker Management for Windows
echo.

if "%1"=="" (
    goto :show_usage
)

if "%1"=="help" goto :show_usage
if "%1"=="test" goto :run_tests
if "%1"=="check-env" goto :check_environment
if "%1"=="build" goto :build_image
if "%1"=="build-prod" goto :build_prod_image
if "%1"=="start" goto :start_compose
if "%1"=="start-prod" goto :start_prod_compose
if "%1"=="stop" goto :stop_containers
if "%1"=="clean" goto :cleanup
if "%1"=="logs" goto :show_logs
if "%1"=="shell" goto :access_shell
if "%1"=="status" goto :show_status
if "%1"=="health" goto :check_health

echo ❌ Unknown command: %1
goto :show_usage

:show_usage
echo Usage: %0 [COMMAND]
echo.
echo Commands:
echo   test          Run full test suite
echo   check-env     Check build environment inside container
echo   build         Build the Docker image (dev)
echo   build-prod    Build production Docker image
echo   start         Start with docker-compose (dev)
echo   start-prod    Start with production docker-compose
echo   stop          Stop all containers
echo   clean         Clean up containers and images
echo   logs          Show container logs
echo   shell         Access container shell
echo   status        Show container status
echo   health        Check container health
echo.
goto :end

:run_tests
echo 🧪 Running Docker tests...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    goto :end
)
bash test-docker.sh test
goto :end

:check_environment
echo 🔍 Checking build environment inside container...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    goto :end
)
bash test-docker.sh check-env
goto :end

:build_image
echo 🏗️ Building EZ-GEN Docker image...
docker build -t ez-gen:latest -f Dockerfile ..
if %errorlevel% equ 0 (
    echo ✅ Docker image built successfully!
) else (
    echo ❌ Failed to build Docker image
)
goto :end

:build_prod_image
echo 🏗️ Building EZ-GEN production Docker image...
docker build -t ez-gen:prod -f Dockerfile.prod ..
if %errorlevel% equ 0 (
    echo ✅ Production Docker image built successfully!
) else (
    echo ❌ Failed to build production Docker image
)
goto :end

:start_compose
echo 🚀 Starting EZ-GEN with docker-compose...
docker-compose up -d
if %errorlevel% equ 0 (
    echo ✅ EZ-GEN started! Access at http://localhost:5005
    echo.
    echo Useful commands:
    echo   docker-compose logs -f    # View logs
    echo   docker-compose down       # Stop services
    echo   %0 status                 # Check status
) else (
    echo ❌ Failed to start with docker-compose
)
goto :end

:start_prod_compose
echo 🚀 Starting EZ-GEN in production mode...
docker-compose -f docker-compose.prod.yml up -d
if %errorlevel% equ 0 (
    echo ✅ EZ-GEN production started!
    echo.
    echo Services:
    echo   EZ-GEN App: http://localhost:5005
    echo   Nginx Proxy: http://localhost:80
) else (
    echo ❌ Failed to start production compose
)
goto :end

:stop_containers
echo 🛑 Stopping EZ-GEN containers...
docker-compose down 2>nul
docker-compose -f docker-compose.prod.yml down 2>nul
docker stop ez-gen-app 2>nul
docker rm ez-gen-app 2>nul
echo ✅ Containers stopped!
goto :end

:cleanup
echo ⚠️ This will remove all EZ-GEN containers and images.
set /p response="Continue? (y/N): "
if /i "%response%"=="y" (
    echo 🧹 Cleaning up containers and images...
    call :stop_containers
    docker rmi ez-gen:latest 2>nul
    docker rmi ez-gen:test 2>nul
    docker rmi ez-gen:prod 2>nul
    docker system prune -f
    echo ✅ Cleanup completed!
) else (
    echo ℹ️ Cleanup cancelled.
)
goto :end

:show_logs
echo 📋 Showing EZ-GEN logs...
docker-compose logs -f 2>nul || docker logs -f ez-gen-app 2>nul || echo ❌ No running EZ-GEN containers found!
goto :end

:access_shell
echo 🐚 Accessing container shell...
docker-compose exec ez-gen bash 2>nul || docker exec -it ez-gen-app bash 2>nul || echo ❌ No running EZ-GEN containers found!
goto :end

:show_status
echo 📊 EZ-GEN Docker Status:
echo.
echo 📦 Images:
docker images | findstr "REPOSITORY ez-gen" 2>nul || echo   No EZ-GEN images found
echo.
echo 🐳 Containers:
docker ps -a | findstr "CONTAINER ez-gen" 2>nul || echo   No EZ-GEN containers found
echo.
curl -s http://localhost:5005 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ EZ-GEN is accessible at http://localhost:5005
) else (
    echo ⚠️ EZ-GEN is not accessible at http://localhost:5005
)
goto :end

:check_health
echo 🏥 Checking EZ-GEN container health...
bash test-docker.sh health
goto :end

:end
pause
