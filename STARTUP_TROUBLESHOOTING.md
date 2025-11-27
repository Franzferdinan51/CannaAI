# Startup Troubleshooting Guide

## Quick Reference

### Common Issues and Solutions

---

## Issue: "Node.js is not installed or not in PATH"

**Symptoms:**
- Script exits with error code 1
- Red error message displayed

**Solution:**
1. Install Node.js 18+ from https://nodejs.org/
2. Choose LTS version (recommended)
3. During installation, check "Add to PATH"
4. Restart command prompt after installation
5. Verify installation: `node --version`

**Windows-Specific:**
- Node.js might be installed but not in PATH
- Try: `where node` in command prompt
- If empty, reinstall Node.js with "Add to PATH" option

---

## Issue: "Failed to install dependencies"

**Symptoms:**
- npm install fails
- Network errors or permission errors

**Solution:**
1. Check internet connection
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` folder and `package-lock.json`
4. Run script again (it will reinstall)
5. Try with admin privileges (right-click → Run as Administrator)

**Windows-Specific:**
- May need to configure npm proxy if behind corporate firewall
- Check: `npm config list`
- Corporate networks may need: `npm config set proxy http://proxy:port`

---

## Issue: "Database initialization failed"

**Symptoms:**
- Database check fails
- Prisma errors

**Solution:**
1. Check if `prisma/schema.prisma` exists
2. Ensure DATABASE_URL is set in `.env` file
3. Try: `npm run db:generate` manually
4. Then: `npm run db:push`
5. Check file permissions on `db/` directory

**Sample .env file:**
```env
DATABASE_URL="file:./db/custom.db"
```

---

## Issue: "Port 3000 is already in use"

**Symptoms:**
- Warning about port conflict
- Server fails to start

**Solutions:**

### Option 1: Kill existing process
1. Choose option 1 when prompted
2. Script will kill processes using port 3000
3. Verify port is freed
4. Server should start

### Option 2: Use alternative port
1. Choose option 2 to use port 3001
2. Or option 3 to use port 3002
3. Server starts on alternative port

### Option 3: Find and kill manually
```batch
:: Find process on port 3000
netstat -ano | findstr :3000

:: Kill by PID (replace XXXX with actual PID)
taskkill /PID XXXX /F
```

---

## Issue: "Development server failed to start"

**Symptoms:**
- Build succeeds but server won't start
- Port already in use errors

**Solution:**
1. Verify port 3000 is free
2. Check Windows Firewall settings
3. Ensure no antivirus is blocking the port
4. Try running as Administrator
5. Check server.ts for syntax errors

**Debug Steps:**
```batch
:: Check if port is really free
netstat -ano | findstr :3000

:: Try starting manually
npm run dev:win
```

---

## Issue: "tsx is not installed" / "nodemon is not installed"

**Symptoms:**
- Dependency verification fails
- Script attempts to reinstall

**Solution:**
1. Script will automatically reinstall
2. If it fails:
   - Delete `node_modules` folder
   - Run: `npm install tsx nodemon prisma`
   - Run script again

**Manual Install:**
```batch
npm install --save-dev tsx nodemon
npm install prisma
```

---

## Issue: "AgentEvolver not available" warnings

**Symptoms:**
- Yellow warning about AgentEvolver
- AgentEvolver features disabled

**Solution:**
This is NOT an error! AgentEvolver is optional.
1. If you want AgentEvolver:
   - Create `agentevolver/server.py`
   - Install Python 3.8+
   - Create `agentevolver/requirements.txt`

2. If you don't need it:
   - Ignore the warning
   - Use modes 1, 3, 5, 6, or 7

---

## Issue: "Python is not installed or not in PATH"

**Symptoms:**
- AgentEvolver mode fails
- Python check fails

**Solution:**
1. Install Python from https://python.org/
2. Version 3.8+ required
3. During installation, check "Add Python to PATH"
4. Verify: `python --version`
5. Alternative: Use modes without AgentEvolver

---

## Issue: Script exits immediately

**Symptoms:**
- Script starts but immediately closes

**Solution:**
1. Run from command prompt to see errors:
   ```batch
   cd C:\Users\Ryan\Desktop\CannaAI-New
   startup.bat
   ```
2. If you see errors, note them and refer to this guide
3. If no errors, check last operation in script

---

## Issue: "Permission denied" errors

**Symptoms:**
- Cannot write to database
- Cannot create files

**Solution:**
1. Run command prompt as Administrator
2. Check file/folder permissions
3. Ensure db/ folder is writable
4. Check antivirus isn't blocking file access

**Windows Permissions:**
```batch
:: Check permissions
icacls db

:: Grant full control (run as admin)
icacls db /grant Users:F /T
```

---

## Issue: "Build failed" in Production Mode

**Symptoms:**
- npm run build fails
- TypeScript errors
- ESLint errors

**Solution:**
1. Check TypeScript errors in output
2. Fix errors in source code
3. Try Development mode first (more lenient)
4. Check server.ts for syntax errors
5. Ensure all dependencies are installed

**Common Fixes:**
```batch
:: Install all dependencies
npm install

:: Check for TypeScript errors
npm run lint

:: Try building anyway (ignore some errors)
npm run build
```

---

## Issue: "Failed to free port 3000"

**Symptoms:**
- After killing processes, port still in use
- Port verification fails

**Solution:**
1. Some processes may auto-restart
2. Close any CannaAI windows
3. Restart computer if necessary
4. Use alternative port (3001 or 3002)

**Force Kill All:**
```batch
:: Kill all Node.js processes
taskkill /IM node.exe /F

:: Kill all processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F
```

---

## Issue: Server starts but can't access website

**Symptoms:**
- Server starts successfully
- Browser shows "Can't reach this site"

**Solution:**
1. Check server URL printed by script
2. Try: http://127.0.0.1:3000 (not localhost)
3. Check Windows Firewall
4. Disable VPN temporarily
5. Try different browser
6. Check if antivirus blocks localhost

---

## Issue: Database reset fails

**Symptoms:**
- db:reset command fails
- "Foreign key constraint" errors

**Solution:**
1. Stop all server instances
2. Close all connections to database
3. Try manual reset:
   ```batch
   npm run db:generate
   npm run db:push
   ```
4. Delete db/custom.db manually, then restart

---

## Logging and Debugging

### Enable Verbose Logging

Edit startup.bat and add before npm commands:
```batch
set DEBUG=*
```

### Check Script Output

Run script and capture output:
```batch
startup.bat > startup.log 2>&1
type startup.log
```

### Manual Server Start

Test server without script:
```batch
set NODE_ENV=development
set PORT=3000
npm run dev:win
```

---

## Getting More Help

### Enable Debug Mode

1. Edit startup.bat
2. Add `set DEBUG=*` at top
3. Run script
4. Check output for detailed logs

### Save Error Output

```batch
startup.bat 2> errors.log
notepad errors.log
```

### Check System Info

```batch
node --version
npm --version
python --version
where node
where npm
where python
```

---

## Prevention Tips

### 1. Keep Node.js Updated
```batch
npm install -g npm@latest
```

### 2. Clean Install Occasionally
```batch
rmdir /s node_modules
del package-lock.json
npm install
```

### 3. Check Port Before Starting
```batch
netstat -ano | findstr :3000
```

### 4. Use Development Mode First
- Always test in Development mode before Production
- Less strict error checking
- Hot reload for faster debugging

### 5. Monitor Log Files
- Check dev.log for development server logs
- Check server.log for production server logs
- Look for errors and warnings

---

## Emergency Reset

If everything fails:

### Complete Reset:
```batch
:: 1. Kill all Node.js processes
taskkill /IM node.exe /F

:: 2. Delete node_modules
rmdir /s /q node_modules

:: 3. Delete package-lock.json
del package-lock.json

:: 4. Delete database
del db\custom.db

:: 5. Reinstall everything
npm install

:: 6. Run startup.bat
```

This will give you a completely clean slate.

---

## FAQ

**Q: Can I run multiple CannaAI instances?**
A: No, by default. Use different ports (3001, 3002) for multiple instances.

**Q: How do I change the default port?**
A: Edit the script or set PORT environment variable before running.

**Q: Can I run this on Linux/Mac?**
A: No, this is a Windows batch script (.bat). For Linux/Mac, create a shell script (.sh).

**Q: Where are the logs stored?**
A: Check the console output. The script displays logs in real-time.

**Q: How do I backup my database?**
A: Copy `db/custom.db` to a safe location while server is stopped.

**Q: What if I don't want to see colored output?**
A: The colors are for readability. Remove the color codes from the script if needed.

---

## Conclusion

Most issues are caused by:
1. Missing dependencies → Reinstall with script
2. Port conflicts → Use alternative port or kill processes
3. Permissions → Run as Administrator
4. Network issues → Check firewall/antivirus

If issues persist, run the Emergency Reset procedure above.
