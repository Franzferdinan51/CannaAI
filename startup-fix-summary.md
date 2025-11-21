# Startup.bat Port Configuration Fixes

## Summary
Fixed three critical port configuration issues in startup.bat as identified by the bug-hunter agent.

## Changes Made

### 1. Port 3001 Availability Check (Lines 70-180)
**Problem**: Script offered port 3001 as alternative without checking if it was available.

**Solution**:
- Added port 3001 availability check before offering it as an option
- If both ports are in use, displays error message for both ports
- Provides options to kill processes on either port 3000, 3001, or both
- Shows processes using port 3001 if occupied
- Only offers port 3001 if it's actually available

**New Behavior**:
- When port 3000 is in use, checks port 3001 availability
- If port 3001 is available: offers to use it as alternative
- If port 3001 is also in use: shows clear error message and provides options to kill specific processes
- User can choose to kill processes on port 3000, 3001, both, or exit

### 2. Environment Variable Passing Fix
**Problem**: Using `cmd /c` wrapper created isolated environment scope, preventing PORT variable from being passed to npm run dev/start.

**Locations Fixed**:
- Line 227-228: DEV_MODE section
- Line 256-257: PROD_MODE section
- Line 290-291: DEV_RESET section
- Line 328-330: REMOTE_DEV_MODE section (also fixed HOST variable)

**Changes**:
```batch
# Before (broken):
cmd /c "set PORT=!PORT! && npm run dev"

# After (working):
set PORT=!PORT!
npm run dev
```

**Why This Works**:
- `cmd /c` spawns a new command interpreter with isolated environment
- Setting variables directly in current scope makes them available to child processes
- npm run dev/start will now properly receive the PORT environment variable

### 3. Improved Error Messages
**Enhanced Messages**:
- Clear indication when both ports are occupied
- Shows processes using both ports when applicable
- Better guidance on available options
- More informative exit option message

## Sections Modified
1. Port checking logic (lines 70-180)
2. DEV_MODE startup (lines 211-229)
3. PROD_MODE startup (lines 231-258)
4. DEV_RESET startup (lines 260-292)
5. REMOTE_DEV_MODE startup (lines 308-331)

## Sections NOT Modified (Preserved)
- DEV_MODE_AGENTEVOLVER: Already uses correct `call npm run dev` approach
- PROD_MODE_AGENTEVOLVER: Already uses correct `call npm run start` approach
- AGENTEVOLVER_ONLY: Python server only, no port variable issues
- INSTALL_ONLY: No server startup
- All other functionality and features preserved

## Testing Recommendations
1. Test with port 3000 available (default case)
2. Test with port 3000 occupied, port 3001 available
3. Test with both ports 3000 and 3001 occupied
4. Test port killing functionality for both ports
5. Verify PORT environment variable is properly received by npm scripts
6. Test all startup modes to ensure PORT is correctly passed

## Expected Behavior After Fix
- Port 3001 is only offered if it's actually available
- PORT environment variable properly passed to all npm run commands
- Clear error messages when both ports are occupied
- User can make informed decisions about port conflicts
- All existing startup modes continue to work as expected
