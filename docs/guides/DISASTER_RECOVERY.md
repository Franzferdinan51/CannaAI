# Disaster Recovery Plan

## Overview

This document outlines the disaster recovery strategy for the CultivAI Pro production environment.

## Recovery Objectives

- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour
- **Maximum Tolerable Downtime (MTD)**: 8 hours
- **High Availability SLA**: 99.9% uptime

## Disaster Scenarios

### 1. Database Failure

**Impact**: Complete data unavailability
**Detection**:
- Health check failures
- Application logs showing database errors
- Monitoring alerts from Prometheus/Grafana

**Recovery Steps**:
1. Identify the scope of the failure
2. Check if primary database is recoverable
3. If not, promote read replica to primary
4. Update connection strings in application
5. Restart application services
6. Verify data integrity
7. Create new read replica

**Recovery Time**: 30-60 minutes

### 2. Redis Cache Failure

**Impact**: Performance degradation, loss of cached data
**Detection**:
- Redis health check failures
- High database load (due to cache misses)
- Application performance alerts

**Recovery Steps**:
1. Restart Redis service
2. If cluster, fail over to another node
3. Monitor connection recovery
4. Warm up cache with critical data
5. Verify cache functionality

**Recovery Time**: 5-15 minutes

### 3. Application Server Failure

**Impact**: Service unavailability
**Detection**:
- Load balancer health check failures
- Application down alerts
- Increased error rates

**Recovery Steps**:
1. Identify failed instances
2. Terminate failed instances
3. Scale up new instances automatically (via Kubernetes HPA)
4. Verify new instances are healthy
5. Update load balancer configuration
6. Monitor for automatic recovery

**Recovery Time**: 5-10 minutes

### 4. Complete Infrastructure Failure

**Impact**: Total service unavailability
**Detection**:
- All monitoring endpoints failing
- Complete loss of connectivity

**Recovery Steps**:
1. Activate disaster recovery site
2. Restore database from latest backup
3. Deploy application to DR site
4. Update DNS to point to DR site
5. Verify all services
6. Notify stakeholders

**Recovery Time**: 2-4 hours

## Backup Strategy

### Database Backups

**Frequency**:
- Full backup: Daily at 2:00 AM UTC
- Incremental backup: Every 6 hours
- Transaction log backup: Every 15 minutes

**Retention**:
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months

**Storage**:
- Primary: Local storage with replication
- Secondary: Cloud storage (AWS S3, Azure Blob, or Google Cloud Storage)
- Encryption: AES-256

### File System Backups

**What to Back Up**:
- Application uploads directory
- Configuration files
- SSL certificates
- Log files

**Frequency**: Daily
**Retention**: 30 days

### Configuration Backups

**Version Control**:
- All infrastructure as code in Git
- Application configuration in Git
- Database schemas in Git
- Environment variables in secret management system

## Recovery Procedures

### Database Recovery Procedure

```bash
#!/bin/bash
# Run: ./scripts/restore-database.sh <backup-file>

BACKUP_FILE=$1
NEW_DB_NAME="cannaai_production_recovered_$(date +%Y%m%d_%H%M%S)"

echo "Starting database recovery..."
echo "Backup file: $BACKUP_FILE"
echo "New database: $NEW_DB_NAME"

# Create new database
createdb $NEW_DB_NAME

# Restore from backup
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE | psql $NEW_DB_NAME
else
    psql $NEW_DB_NAME < $BACKUP_FILE
fi

echo "Database restored to: $NEW_DB_NAME"
echo "Please update DATABASE_URL environment variable"
```

### Application Recovery Procedure

```bash
#!/bin/bash
# Run: ./scripts/restore-application.sh

echo "Starting application recovery..."

# Pull latest image
docker pull cannaai/cannaai-pro:latest

# Scale down existing deployment
kubectl scale deployment cannaai-app --replicas=0 -n cannaai-production

# Update image
kubectl set image deployment/cannaai-app cannaai-app=cannaai/cannaai-pro:latest -n cannaai-production

# Scale up
kubectl scale deployment cannaai-app --replicas=5 -n cannaai-production

# Wait for rollout
kubectl rollout status deployment/cannaai-app -n cannaai-production

echo "Application recovery completed"
```

### Full Disaster Recovery Procedure

```bash
#!/bin/bash
# Run: ./scripts/disaster-recovery.sh

echo "=========================================="
echo "DISASTER RECOVERY PROCEDURE"
echo "=========================================="

# Step 1: Prepare DR site
echo "Step 1: Preparing DR site..."
kubectl config use-context cannaai-dr
kubectl apply -f k8s/overlays/production/

# Step 2: Restore database
echo "Step 2: Restoring database..."
./scripts/restore-database.sh latest-backup.sql.gz

# Step 3: Deploy application
echo "Step 3: Deploying application..."
./scripts/restore-application.sh

# Step 4: Update DNS
echo "Step 4: Updating DNS..."
# Use your DNS provider's API or dashboard

# Step 5: Verify services
echo "Step 5: Verifying services..."
curl -f https://yourdomain.com/api/health || exit 1

echo "=========================================="
echo "DISASTER RECOVERY COMPLETED"
echo "=========================================="
```

## Testing Schedule

### Monthly Tests
- Database recovery test (restore to test environment)
- Application deployment test
- Backup verification

### Quarterly Tests
- Full disaster recovery drill
- Recovery time measurement
- Recovery point verification

### Annual Tests
- Complete failover to DR site
- Business continuity test
- Update and validate procedures

## Communication Plan

### Incident Response Team

| Role | Name | Contact | Backup Contact |
|------|------|---------|----------------|
| Incident Commander | TBD | TBD | TBD |
| Tech Lead | TBD | TBD | TBD |
| Database Administrator | TBD | TBD | TBD |
| Operations Lead | TBD | TBD | TBD |
| Communications Lead | TBD | TBD | TBD |

### Escalation Matrix

1. **Level 1**: On-call engineer (0-15 minutes)
2. **Level 2**: Tech lead (15-30 minutes)
3. **Level 3**: Engineering manager (30-60 minutes)
4. **Level 4**: CTO (60+ minutes)

### Stakeholder Notification

**Initial Notification** (within 15 minutes):
- Engineering team
- Product team
- Customer support

**Update Schedule**:
- Every 30 minutes during active incident
- Hourly during recovery
- Final report within 24 hours

**Communication Channels**:
- Slack #incidents channel
- Email distribution list
- Status page updates

## Preventive Measures

### High Availability Architecture

```
Internet
    |
[Load Balancer]
    |
[App Servers - 3+ instances]
    |
[Database - Primary + Read Replica]
    |
[Redis - Cluster Mode]
```

### Monitoring and Alerting

- **Infrastructure Monitoring**: Prometheus + Grafana
- **Application Monitoring**: APM tools (New Relic, Datadog)
- **Log Aggregation**: ELK Stack or Fluentd
- **Uptime Monitoring**: Pingdom, UptimeRobot
- **Error Tracking**: Sentry

### Automatic Failover

- **Kubernetes**: HPA, PodDisruptionBudget
- **Database**: Automatic failover to read replica
- **Redis**: Redis Sentinel or Redis Cluster
- **Load Balancer**: Health checks and automatic removal of unhealthy instances

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database corruption | Low | High | Regular backups, read replicas |
| Hardware failure | Medium | High | Cloud infrastructure, redundancy |
| Human error | Medium | Medium | RBAC, staged deployments |
| DDoS attack | Medium | High | WAF, rate limiting, CDN |
| Data center outage | Low | Very High | Multi-region deployment |
| Security breach | Low | High | Security audits, penetration testing |

## Post-Incident Review

After each disaster recovery event:

1. **What happened?**
   - Timeline of events
   - Root cause analysis
   - Impact assessment

2. **What worked well?**
   - Procedures that were effective
   - Tools that helped

3. **What needs improvement?**
   - Gaps identified
   - Bottlenecks discovered

4. **Action items**
   - Short-term fixes
   - Long-term improvements
   - Owner assignments
   - Due dates

5. **Documentation updates**
   - Update procedures
   - Update runbooks
   - Update contact information

## Testing Checklist

- [ ] Backup files are valid
- [ ] Recovery procedures are documented
- [ ] Recovery time meets RTO
- [ ] Recovery point meets RPO
- [ ] Team knows procedures
- [ ] Communication plan tested
- [ ] DR site is ready
- [ ] Monitoring is in place
- [ ] Alerting is configured
- [ ] Rollback procedures are tested

## Contact Information

**Cloud Provider Support**:
- AWS: https://aws.amazon.com/support
- Azure: https://azure.microsoft.com/support
- Google Cloud: https://cloud.google.com/support

**Database Support**:
- PostgreSQL: https://www.postgresql.org/support/
- MongoDB: https://support.mongodb.com/

**Emergency Contacts**:
[To be filled with actual contacts]

## Document Control

- **Version**: 1.0
- **Last Updated**: [Date]
- **Next Review**: [Date + 6 months]
- **Owner**: DevOps Team
- **Approved By**: CTO
