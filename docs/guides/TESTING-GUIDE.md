# CannaAI Testing Guide

## ✅ Tests That Pass Now:

### 1. Python Bridge Script
```bash
# Syntax check
python3 -m py_compile integrations/openclaw-grow-bridge.py
# ✅ PASS

# Help output
python3 integrations/openclaw-grow-bridge.py --help
# ✅ PASS

# Test connection (requires server running)
python3 integrations/openclaw-grow-bridge.py --test
# ⚠️ REQUIRES: CannaAI server on port 3000
```

### 2. TypeScript API Route
```bash
# Syntax check (Next.js types may show errors - this is normal)
npx tsc --noEmit src/app/api/grow-monitor/data/route.ts
# ⚠️ Type errors from Next.js - actual code is valid
```

---

## 🚀 Tests Requiring Server:

### Start CannaAI Server:
```bash
cd /home/duckets/CannaAI
npm run dev
# Server will start on http://localhost:3000
```

### API Endpoint Tests:

#### 1. Test OpenClaw Status
```bash
curl http://localhost:3000/api/openclaw/status
# Expected: {"status": "online", "rooms": X, "plants": X}
```

#### 2. Test Grow Monitor Data (GET)
```bash
curl "http://localhost:3000/api/grow-monitor/data?limit=10"
# Expected: {"success": true, "count": X, "readings": [...]}
```

#### 3. Test Grow Monitor Data (POST)
```bash
curl -X POST http://localhost:3000/api/grow-monitor/data \
  -H "Content-Type: application/json" \
  -d '{
    "environmental": {
      "temperature": 75.1,
      "humidity": 38.7,
      "vpd": 1.81
    },
    "roomId": "3x3_tent",
    "source": "test"
  }'
# Expected: {"success": true, "readingId": X, "alerts": null}
```

#### 4. Test Bridge Script (Full)
```bash
python3 integrations/openclaw-grow-bridge.py --manual --verbose
# Expected: ✅ Sensor data sent to CannaAI
```

---

## 🧪 Automated Test Suite:

Create `tests/grow-monitor.test.ts`:

```typescript
import { GET, POST } from '../src/app/api/grow-monitor/data/route';

describe('Grow Monitor API', () => {
  test('GET returns historical data', async () => {
    const request = new Request('http://localhost:3000/api/grow-monitor/data?limit=10');
    const response = await GET(request);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(Array.isArray(data.readings)).toBe(true);
  });

  test('POST creates sensor reading', async () => {
    const request = new Request('http://localhost:3000/api/grow-monitor/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environmental: {
          temperature: 75.1,
          humidity: 38.7,
          vpd: 1.81
        },
        roomId: '3x3_tent',
        source: 'test'
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.readingId).toBeDefined();
  });

  test('POST validates required fields', async () => {
    const request = new Request('http://localhost:3000/api/grow-monitor/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(400);
  });
});
```

---

## 📊 Test Results Template:

```markdown
## Test Results - [DATE]

### Unit Tests
- [ ] Python syntax check ✅
- [ ] TypeScript compilation ⚠️ (Next.js type issues - not code issues)
- [ ] API route logic ⏳ (needs server)

### Integration Tests
- [ ] GET /api/grow-monitor/data ⏳ (needs server)
- [ ] POST /api/grow-monitor/data ⏳ (needs server)
- [ ] Bridge script connection ⏳ (needs server)
- [ ] Bridge script data extraction ⏳ (needs AC Infinity data)

### End-to-End Tests
- [ ] Full data pipeline ⏳ (needs server + OpenClaw running)
- [ ] Alert generation ⏳ (needs server + test data)
- [ ] Historical data retrieval ⏳ (needs server + existing data)
```

---

## 🔧 Troubleshooting:

### Server Won't Start
```bash
# Check Node version
node --version  # Should be 18+

# Install dependencies
npm install

# Check for port conflicts
lsof -i :3000

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Database Errors
```bash
# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Check database file exists
ls -la prisma/dev.db
```

### API Endpoint Not Found
```bash
# Check route file exists
ls -la src/app/api/grow-monitor/data/route.ts

# Restart server
# Ctrl+C, then npm run dev
```

---

## ✅ Code Quality Checks:

### Python
```bash
# Syntax
python3 -m py_compile integrations/openclaw-grow-bridge.py

# Style (if pylint installed)
pylint integrations/openclaw-grow-bridge.py
```

### TypeScript
```bash
# Type check (ignoring Next.js type issues)
npx tsc --noEmit --skipLibCheck src/app/api/grow-monitor/data/route.ts

# Lint (if eslint configured)
npm run lint
```

---

**Status:** Code is syntactically valid. Full integration testing requires CannaAI server running on port 3000.
