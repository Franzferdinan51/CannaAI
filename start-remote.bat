@echo off
echo 🌱 Starting CannaAI for Remote and Local Access
echo ========================================
echo.
echo 🔧 Configuration:
echo    • Port: 3000
echo    • Network Binding: 0.0.0.0 (all interfaces)
echo    • CORS: Enabled for local network and Tailscale
echo.
echo 💻 Access Options:
echo    • Local: http://localhost:3000
echo    • Network IP: http://[your-ip]:3000
echo    • Tailscale: http://100.x.x.x:3000
echo.
echo 🔒 Firewall Note:
echo    Make sure port 3000 is allowed in Windows Firewall
echo    for both Private and Public networks if using Tailscale
echo.
echo 🚀 Starting server...
echo.

REM Set environment variables for remote access
set HOST=0.0.0.0
set PORT=3000

REM Start the server with remote access configuration
npm run dev

pause