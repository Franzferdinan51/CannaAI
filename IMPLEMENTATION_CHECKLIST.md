# Database Optimization Implementation Checklist

## ✅ Pre-Implementation

- [ ] **Backup Database**
  ```bash
  cp db/custom.db db/custom.db.backup.$(date +%Y%m%d)
  ```

- [ ] **Review Current Performance**
  ```bash
  curl -s http://localhost:3000/api/analytics?timeframe=24h > /tmp/before-optimization.json
  ```

- [ ] **Check Disk Space** (Migration will temporarily use extra space)
  ```bash
  df -h
  ```

## 🚀 Implementation Steps

### Step 1: Apply Schema Changes

- [ ] **Generate Prisma Client**
  ```bash
  npm run db:generate
  ```

- [ ] **Review Migration Script**
  ```bash
  cat prisma/migrations/20241126_optimize_database_indexes.sql | head -50
  ```

- [ ] **Apply Migration (Development)**
  ```bash
  npm run db:push
  ```

- [ ] **Apply Migration (Production)**
  ```bash
  npm run db:migrate
  ```

- [ ] **Verify Indexes Created**
  ```bash
  sqlite3 db/custom.db "SELECT COUNT(*) as index_count FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL;"
  ```
  **Expected:** 60+ indexes

- [ ] **Check Database Size**
  ```bash
  ls -lh db/custom.db
  ```

### Step 2: Test Optimized Routes

- [ ] **Test Sensor Analytics (Optimized)**
  ```bash
  curl -s "http://localhost:3000/api/analytics/sensors-optimized?limit=50&page=1&timeframe=24h" | jq '.data.analytics | length'
  ```
  **Expected:** 50 items

- [ ] **Test Database Health API**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=metrics" | jq '.data.health.databaseSize'
  ```
  **Expected:** JSON response with health metrics

- [ ] **Check for Slow Queries**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=slow-queries" | jq '.data | length'
  ```
  **Expected:** List of slow queries (should be empty initially)

- [ ] **Get Optimization Recommendations**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=recommendations" | jq '.data'
  ```
  **Expected:** Array of recommendations

### Step 3: Run Database Validation

- [ ] **Create Validation Test Script**
  ```bash
  cat > test-validation.js << 'EOF'
  import { dbValidator } from './src/lib/db-validation.js';
  const report = await dbValidator.validateAll();
  console.log(`Passed: ${report.passed}/${report.totalChecks}`);
  console.log(`Failed: ${report.failed}`);
  report.results.forEach(r => {
    if (!r.passed) {
      console.log(`❌ ${r.table}: ${r.errors.join(', ')}`);
    }
  });
  EOF
  ```

- [ ] **Run Validation**
  ```bash
  node test-validation.js
  ```
  **Expected:** All checks pass (or fix any issues found)

### Step 4: Performance Testing

- [ ] **Test Query Performance**
  ```bash
  # Test a complex analytics query
  time curl -s "http://localhost:3000/api/analytics/sensors?timeframe=24h" > /dev/null
  ```

- [ ] **Monitor Query Stats**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=stats" | jq '.'
  ```
  **Expected:** Query count, average duration, success rate

- [ ] **Export Metrics**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=export" | jq '.data.filePath'
  ```
  **Expected:** Path to exported metrics file

### Step 5: Fix Critical Issues (If Any)

- [ ] **Fix Sensor Reading Retrieval** (if broken)
  - Check: `src/app/api/plants/[id]/environment/route.ts`
  - Ensure WHERE clause includes `sensor.roomId = plant.locationId`

- [ ] **Fix Memory-Intensive Aggregations** (if found)
  - Check: Reports route for `findMany()` + `reduce()` patterns
  - Replace with Prisma `aggregate()` queries

- [ ] **Add Pagination** (if missing)
  - Check all list endpoints: plants, alerts, tasks, actions
  - Ensure `take` and `skip` parameters are used

### Step 6: Update Environment Variables

- [ ] **Add to .env**
  ```env
  PRISMA_LOG_LEVEL=query
  PRISMA_QUERY_TIMEOUT=30000
  LOG_QUERIES=false  # Set to true only for debugging
  ```

- [ ] **Restart Application**
  ```bash
  npm run dev
  # or
  npm run start
  ```

## 📊 Verification Steps

### Database Verification

- [ ] **List All Indexes**
  ```bash
  sqlite3 db/custom.db ".indexes" | wc -l
  ```
  **Expected:** 60+ indexes

- [ ] **Check Index on Critical Table**
  ```bash
  sqlite3 db/custom.db "EXPLAIN QUERY PLAN SELECT * FROM SensorAnalytics WHERE sensorId = 'test' AND timestamp > '2024-01-01';" | grep "USING INDEX"
  ```
  **Expected:** Index usage confirmed

- [ ] **Verify Composite Index**
  ```bash
  sqlite3 db/custom.db "PRAGMA index_list(SensorAnalytics);"
  ```
  **Expected:** Multiple indexes including composite ones

### API Verification

- [ ] **Test Pagination Parameters**
  ```bash
  curl -s "http://localhost:3000/api/analytics/sensors-optimized?limit=10&page=1" | jq '.data.pagination'
  ```
  **Expected:** Correct pagination metadata

- [ ] **Test Query Tracking**
  ```bash
  # Make a few API calls, then:
  curl -s "http://localhost:3000/api/db/health?action=stats" | jq '.data.totalQueries'
  ```
  **Expected:** Query count increased

- [ ] **Test Slow Query Detection**
  ```bash
  # Make a complex query:
  curl -s "http://localhost:3000/api/analytics/reports?type=daily&date=2024-01-01"
  # Then check:
  curl -s "http://localhost:3000/api/db/health?action=slow-queries" | jq '.data | length'
  ```

### Performance Verification

- [ ] **Measure Response Time Improvement**
  ```bash
  # Before optimization:
  time curl -s "http://localhost:3000/api/analytics/sensors?timeframe=7d" > /dev/null

  # After optimization:
  time curl -s "http://localhost:3000/api/analytics/sensors-optimized?timeframe=7d&limit=100" > /dev/null
  ```

- [ ] **Check Memory Usage**
  ```bash
  # During heavy query:
  ps aux | grep "node\|next" | awk '{print $4}'
  ```
  **Expected:** Stable memory usage with pagination

## 🔧 Post-Implementation

### Daily Monitoring

- [ ] **Check Slow Queries**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=slow-queries&limit=5"
  ```

- [ ] **Monitor Database Size**
  ```bash
  ls -lh db/custom.db
  ```

- [ ] **Review Query Stats**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=stats"
  ```

### Weekly Tasks

- [ ] **Export and Review Metrics**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=export"
  ```

- [ ] **Run Database Validation**
  ```bash
  node test-validation.js
  ```

- [ ] **Review Optimization Recommendations**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=recommendations"
  ```

### Monthly Maintenance

- [ ] **Vacuum Database** (during maintenance window)
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=vacuum"
  ```

- [ ] **Analyze Database**
  ```bash
  curl -s "http://localhost:3000/api/db/health?action=analyze"
  ```

- [ ] **Archive Old Records** (if applicable)
  ```bash
  # Example: Archive sensor readings older than 90 days
  curl -X POST -H "Content-Type: application/json" \
    -d '{"action":"archive-old-records","params":{"modelName":"sensorReading","dateField":"timestamp","cutoffDate":"2024-08-01"}}' \
    http://localhost:3000/api/db/health
  ```

## 🐛 Troubleshooting Checklist

### Issue: Indexes Not Created

- [ ] Check migration was applied
  ```bash
  npm run db:push
  ```

- [ ] Verify SQLite version supports indexes
  ```bash
  sqlite3 db/custom.db "SELECT sqlite_version();"
  ```

- [ ] Check for errors in migration output

### Issue: Queries Still Slow

- [ ] Verify index exists
  ```bash
  sqlite3 db/custom.db "PRAGMA index_info(idx_sensor_analytics_sensor_timestamp);"
  ```

- [ ] Check query plan
  ```bash
  sqlite3 db/custom.db "EXPLAIN QUERY PLAN <your query>;"
  ```

- [ ] Run ANALYZE
  ```bash
  curl "http://localhost:3000/api/db/health?action=analyze"
  ```

- [ ] Check slow query log
  ```bash
  curl "http://localhost:3000/api/db/health?action=slow-queries"
  ```

### Issue: High Memory Usage

- [ ] Verify pagination is enabled on all endpoints
- [ ] Check for unbounded queries (no `take` limit)
- [ ] Review include statements (use `select` instead)
- [ ] Monitor query history
  ```bash
  curl "http://localhost:3000/api/db/health?action=stats"
  ```

### Issue: API Errors After Deployment

- [ ] Check Prisma client is regenerated
  ```bash
  npm run db:generate
  ```

- [ ] Verify environment variables
  ```bash
  cat .env | grep PRISMA
  ```

- [ ] Check application logs for errors
  ```bash
  tail -f logs/server.log
  ```

## 📝 Documentation Updates

- [ ] Update API documentation with pagination parameters
- [ ] Document new `/api/db/health` endpoint
- [ ] Update monitoring dashboard with new metrics
- [ ] Add database optimization section to runbook

## 🎯 Success Criteria

### Performance Targets Met

- [ ] Time-series queries < 100ms (average)
- [ ] Filtered queries < 100ms (average)
- [ ] Dashboard load time < 2 seconds
- [ ] Memory usage stable during heavy queries

### Quality Targets Met

- [ ] 100% of API endpoints support pagination
- [ ] 0 N+1 queries in optimized routes
- [ ] All foreign key relationships validated
- [ ] Database integrity checks pass

### Monitoring Targets Met

- [ ] Query performance tracking active
- [ ] Slow query detection working
- [ ] Database health API accessible
- [ ] Metrics export functional

## 🚨 Rollback Plan

If issues occur:

1. **Stop Application**
   ```bash
   pkill -f "next\|node"
   ```

2. **Restore Database**
   ```bash
   cp db/custom.db.backup.$(date +%Y%m%d) db/custom.db
   ```

3. **Revert Schema Changes**
   ```bash
   git checkout HEAD -- prisma/schema.prisma
   npm run db:push
   ```

4. **Restart Application**
   ```bash
   npm run dev
   ```

5. **Investigate and Re-apply**
   - Review error logs
   - Test migration on staging environment
   - Apply fixes and re-run checklist

## ✅ Sign-off

### Development Team
- [ ] **Lead Developer**: Database schema changes reviewed and tested
- [ ] **QA Engineer**: All tests passed, performance targets met
- [ ] **DevOps Engineer**: Deployment completed successfully

### Production Readiness
- [ ] **Performance**: All targets met
- [ ] **Reliability**: Error handling validated
- [ ] **Monitoring**: Dashboards configured
- [ ] **Documentation**: Updated and accessible

---

## 📞 Emergency Contacts

- **Database Issues**: [DBA Contact]
- **Performance Problems**: [DevOps Contact]
- **Application Errors**: [Engineering Lead]

## 📚 Additional Resources

- Database Optimization Summary: `DATABASE_OPTIMIZATION_SUMMARY.md`
- Execution Summary: `DATABASE_OPTIMIZATION_EXECUTION_SUMMARY.md`
- API Documentation: [Internal Wiki]
- Prisma Docs: https://www.prisma.io/docs

---

**✅ Implementation Checklist Complete**

All items checked = Production Ready! 🎉
