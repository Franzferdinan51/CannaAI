# Phase 4: Testing & Bug Fixes

**Duration:** 1-2 days  
**Priority:** CRITICAL  
**Status:** 🔄 In Progress

---

## 🎯 **Phase Objectives:**

1. ✅ Comprehensive testing of all new features
2. ✅ Bug identification and resolution
3. ✅ Performance optimization
4. ✅ Error handling improvements
5. ✅ User experience refinement
6. ✅ Documentation updates based on testing

---

## 📋 **Testing Checklist:**

### **Unit Tests**

#### Python Bridge Script
- [ ] Syntax validation (`python3 -m py_compile`)
- [ ] CLI argument parsing
- [ ] Data extraction from AC Infinity JSON
- [ ] Screenshot fallback logic
- [ ] API payload construction
- [ ] Error handling (connection refused, timeout, invalid JSON)
- [ ] Verbose mode output

#### TypeScript API Routes
- [ ] GET endpoint parameter parsing
- [ ] POST endpoint validation
- [ ] Prisma database queries
- [ ] Alert generation logic
- [ ] Photo storage integration
- [ ] Error responses
- [ ] Type safety (where applicable)

---

### **Integration Tests**

#### API Endpoints
```bash
# 1. Test OpenClaw status endpoint
curl http://localhost:3000/api/openclaw/status
# Expected: {"status": "online", "rooms": X, "plants": X}

# 2. Test grow monitor data GET
curl "http://localhost:3000/api/grow-monitor/data?limit=10"
# Expected: {"success": true, "count": X, "readings": [...]}

# 3. Test grow monitor data POST
curl -X POST http://localhost:3000/api/grow-monitor/data \
  -H "Content-Type: application/json" \
  -d '{"environmental":{"temperature":75.1,"humidity":38.7,"vpd":1.81},"roomId":"3x3_tent","source":"test"}'
# Expected: {"success": true, "readingId": X, "alerts": null}

# 4. Test invalid POST (missing required fields)
curl -X POST http://localhost:3000/api/grow-monitor/data \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 Bad Request with error message

# 5. Test data filtering
curl "http://localhost:3000/api/grow-monitor/data?roomId=3x3_tent&startDate=2026-02-23&endDate=2026-02-24"
# Expected: Filtered results for specified date range
```

#### Bridge Script
```bash
# 1. Test connection
python3 integrations/openclaw-grow-bridge.py --test
# Expected: ✅ CannaAI connection successful

# 2. Test manual run
python3 integrations/openclaw-grow-bridge.py --manual
# Expected: ✅ Bridge operation successful

# 3. Test verbose mode
python3 integrations/openclaw-grow-bridge.py --manual --verbose
# Expected: Detailed output of payload and response

# 4. Test with missing AC Infinity data
# (Remove ac-infinity-latest.json temporarily)
# Expected: Graceful fallback or clear error message
```

---

### **End-to-End Tests**

#### Full Data Pipeline
1. [ ] AC Infinity screen capture → OCR extraction → CannaAI API → Database storage
2. [ ] Alert generation → Telegram notification → User acknowledgment
3. [ ] Historical data retrieval → Dashboard display → Graph rendering
4. [ ] Photo capture → Storage → Retrieval → Display

#### Error Scenarios
1. [ ] Gateway restart → Node disconnect → Auto-reconnect → Resume sync
2. [ ] CannaAI server down → Bridge script error → Retry logic → Alert
3. [ ] Database corruption → Error handling → Recovery procedure
4. [ ] Network interruption → Connection timeout → Retry with backoff

---

## 🐛 **Bug Fixing Workflow:**

### **Bug Report Template:**
```markdown
**Bug ID:** [AUTO-GENERATED]
**Severity:** Critical / High / Medium / Low
**Component:** API / Bridge / Database / UI
**Description:** [Clear description]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Expected Behavior:** [What should happen]
**Actual Behavior:** [What actually happens]
**Error Messages:** [Copy-paste errors]
**Environment:** [Server version, OS, etc.]
**Proposed Fix:** [If known]
```

### **Bug Triage:**

#### **Critical** (Fix Immediately)
- Data loss or corruption
- Security vulnerabilities
- Complete system failure
- Alert system failure

#### **High** (Fix Within 24 Hours)
- Feature not working as documented
- Performance degradation (>50% slower)
- Intermittent failures
- Data sync issues

#### **Medium** (Fix Within 1 Week)
- Minor feature bugs
- UI/UX issues
- Documentation errors
- Non-critical performance issues

#### **Low** (Fix When Time Permits)
- Cosmetic issues
- Enhancement requests
- Documentation typos
- Nice-to-have features

---

## 🔧 **Common Issues & Fixes:**

### **Issue: API Returns 500 Error**

**Symptoms:**
```bash
curl http://localhost:3000/api/grow-monitor/data
# Returns: {"error": "Internal Server Error"}
```

**Diagnosis:**
```bash
# Check server logs
tail -f /home/duckets/CannaAI/logs/error.log

# Check database connection
npx prisma studio
```

**Fix:**
1. Check Prisma schema is valid
2. Verify database file exists
3. Check database migrations are applied
4. Restart server

---

### **Issue: Bridge Script Connection Refused**

**Symptoms:**
```bash
python3 integrations/openclaw-grow-bridge.py --test
# ❌ Connection error: Connection refused
```

**Diagnosis:**
```bash
# Check if server is running
pgrep -f "next start\|node.*3000"

# Check port 3000
lsof -i :3000
```

**Fix:**
```bash
# Start server
cd /home/duckets/CannaAI
npm run dev

# Or if already running, restart
pkill -f "next start"
npm run dev
```

---

### **Issue: Database Lock**

**Symptoms:**
```
Error: database is locked
```

**Diagnosis:**
```bash
# Check for multiple processes
lsof prisma/dev.db
```

**Fix:**
```bash
# Kill processes holding lock
lsof prisma/dev.db | tail -n +2 | awk '{print $2}' | xargs kill

# Or restart server
pkill -f "next start"
npm run dev
```

---

### **Issue: TypeScript Compilation Errors**

**Symptoms:**
```
error TS2307: Cannot find module...
```

**Diagnosis:**
```bash
# Check Node modules
ls node_modules/next

# Check TypeScript config
cat tsconfig.json
```

**Fix:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or skip lib check for testing
npx tsc --noEmit --skipLibCheck
```

---

## 📊 **Test Results Tracking:**

### **Test Run Template:**
```markdown
## Test Run - [DATE] [TIME]

**Tester:** [Name/AI Agent]
**Environment:** [Server version, OS, Node version, Python version]

### Results Summary
- **Total Tests:** X
- **Passed:** Y
- **Failed:** Z
- **Skipped:** W

### Failed Tests
1. **[Test Name]** - [Brief description of failure]
   - **Bug ID:** [Link to bug report]
   - **Severity:** [Critical/High/Medium/Low]
   - **Status:** [Open/In Progress/Fixed]

### Notes
[Any observations, performance metrics, etc.]
```

---

## 🎯 **Performance Benchmarks:**

### **API Response Times**
- GET /api/grow-monitor/data: < 200ms
- POST /api/grow-monitor/data: < 500ms
- GET /api/openclaw/status: < 100ms

### **Bridge Script Execution**
- Connection test: < 2 seconds
- Data extraction: < 1 second
- API POST: < 3 seconds
- Total execution: < 5 seconds

### **Database Queries**
- Simple SELECT: < 50ms
- JOIN queries: < 200ms
- INSERT with relations: < 100ms

---

## ✅ **Phase 4 Completion Criteria:**

- [ ] All unit tests passing (95%+ coverage)
- [ ] All integration tests passing
- [ ] All end-to-end tests passing
- [ ] No critical or high severity bugs
- [ ] Performance benchmarks met
- [ ] Error handling comprehensive
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Testing guide updated with real results

---

## 📝 **Deliverables:**

1. ✅ **Test Suite** - Comprehensive test scripts
2. ✅ **Bug Reports** - Documented issues with fixes
3. ✅ **Performance Report** - Benchmark results
4. ✅ **Test Results** - Pass/fail summary
5. ✅ **Updated Documentation** - Based on testing findings
6. ✅ **Bug Fix Commits** - All fixes committed and pushed

---

## 🚀 **Next Phase:**

**Phase 5: Production Deployment**
- Deployment checklist
- Monitoring setup
- Alerting configuration
- Backup verification
- User training
- Go-live preparation

---

**Phase 4 Start Date:** 2026-02-24  
**Phase 4 Target End Date:** 2026-02-25  
**Current Status:** 🔄 In Progress
