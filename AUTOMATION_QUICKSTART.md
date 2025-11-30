# Quick Start Guide: Photo Analysis Automation

## Overview

This guide will get you up and running with automated photo analysis in under 10 minutes. We'll cover the basics of setting up automated plant monitoring, batch processing, and notifications.

## What You'll Learn

- How to set up your first automated daily health check
- How to create a weekly trichome analysis schedule
- How to run batch analysis on multiple plants
- How to set up smart notifications
- How to monitor your automations

## Prerequisites

- Node.js 18+ installed
- CultivAI Pro application running
- Database initialized with Prisma
- At least one plant in your database

## Step 1: Initialize Your Database

First, ensure your database is set up with the new automation models:

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push
```

## Step 2: Set Up Your First Automation - Daily Health Check

Let's start with the most basic automation: a daily photo analysis at 9 AM.

### Option A: Using the API (Programmatic)

```bash
# Create a daily health check schedule
curl -X POST http://localhost:3000/api/automation/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "plantId": "your-plant-id-here",
    "analysisType": "photo",
    "frequency": "daily",
    "timeOfDay": "09:00",
    "enabled": true
  }'
```

### Option B: Using JavaScript in Browser Console

```javascript
// 1. First, get your plant ID
fetch('/api/plants')
  .then(r => r.json())
  .then(plants => {
    const plantId = plants[0].id; // Use first plant
    console.log('Plant ID:', plantId);

    // 2. Create the daily schedule
    return fetch('/api/automation/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plantId: plantId,
        analysisType: 'photo',
        frequency: 'daily',
        timeOfDay: '09:00',
        enabled: true
      })
    });
  })
  .then(r => r.json())
  .then(result => {
    console.log('Schedule created:', result);
  })
  .catch(err => console.error('Error:', err));
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "schedule-123",
    "plantId": "plant-123",
    "analysisType": "photo",
    "frequency": "daily",
    "timeOfDay": "09:00",
    "enabled": true,
    "nextRun": "2024-01-15T09:00:00.000Z"
  }
}
```

## Step 3: Test the Automation Engine

The automation engine needs to run to execute your schedules. You can either:

### A. Run Manually (For Testing)

```bash
curl -X POST http://localhost:3000/api/automation/engine \
  -H "Content-Type: application/json" \
  -d '{"action": "run"}'
```

### B. Set Up Automatic Execution

Create a cron job (Linux/Mac) or Scheduled Task (Windows):

**Linux/Mac:**
```bash
# Edit crontab
crontab -e

# Add line to run every 5 minutes
*/5 * * * * curl -X POST http://localhost:3000/api/automation/engine
```

**Windows (Scheduled Task):**
```
Action: Start a program
Program: curl
Arguments: -X POST http://localhost:3000/api/automation/engine
Schedule: Every 5 minutes
```

## Step 4: Set Up Weekly Trichome Analysis

If your plants are in flowering stage, add trichome monitoring:

```javascript
fetch('/api/automation/schedules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    plantId: 'your-plant-id',
    analysisType: 'trichome',
    frequency: 'weekly',
    timeOfDay: '10:00',
    enabled: true,
    config: {
      deviceType: 'microscope',
      magnification: 200
    }
  })
});
```

## Step 5: Create a Batch Analysis (Multiple Plants)

Analyze all plants in your garden:

```javascript
// Get all plants
fetch('/api/plants')
  .then(r => r.json())
  .then(plants => {
    // Create batch analysis
    return fetch('/api/automation/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weekly Garden Health Check',
        type: 'photo',
        plantIds: plants.map(p => p.id),
        config: {
          analysisType: 'comprehensive',
          detectAnomalies: true
        }
      })
    });
  })
  .then(r => r.json())
  .then(batch => {
    console.log('Batch created:', batch.data.id);
    console.log('Total plants to analyze:', batch.data.totalCount);
  });
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "batch-456",
    "name": "Weekly Garden Health Check",
    "type": "photo",
    "totalCount": 5,
    "status": "running",
    "startedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

## Step 6: Set Up Notifications (Optional)

Get notified when issues are detected:

```javascript
fetch('/api/automation/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'rule',
    data: {
      name: 'Health Alert',
      ruleType: 'trigger',
      conditions: {
        type: 'less_than',
        key: 'healthScore',
        threshold: 60
      },
      actions: [
        {
          type: 'notify',
          config: {
            type: 'health_alert',
            channels: ['inApp']
          }
        }
      ]
    }
  })
});
```

## Step 7: Monitor Your Automations

### Check Active Schedules

```javascript
fetch('/api/automation/schedules')
  .then(r => r.json())
  .then(schedules => {
    console.table(schedules.data.map(s => ({
      ID: s.id,
      Plant: s.plant?.name,
      Type: s.analysisType,
      Frequency: s.frequency,
      NextRun: s.nextRun,
      Status: s.enabled ? 'Active' : 'Disabled'
    })));
  });
```

### Check Batch Status

```javascript
fetch('/api/automation/batch')
  .then(r => r.json())
  .then(batches => {
    console.table(batches.data.map(b => ({
      ID: b.id,
      Name: b.name,
      Status: b.status,
      Progress: `${b.completedCount}/${b.totalCount}`,
      Created: b.createdAt
    })));
  });
```

### Check Automation Engine Status

```javascript
fetch('/api/automation/engine')
  .then(r => r.json())
  .then(status => {
    console.log('Engine Status:', status.data);
    console.log('Active Schedules:', status.data.activeSchedulers);
    console.log('Pending Batches:', status.data.pendingBatches);
  });
```

## Step 8: View Analysis History

Check what has been analyzed automatically:

```javascript
fetch('/api/automation/trends?startDate=2024-01-01')
  .then(r => r.json())
  .then(trends => {
    console.log('Total Analyses:', trends.data.summary.totalAnalyses);
    console.log('Health Trend:', trends.data.trends.healthScoreTrend);
    console.log('Changes Detected:', trends.data.trends.changesDetected);

    // View recent analyses
    trends.data.history.forEach(h => {
      console.log(`${h.createdAt}: ${h.analysisType} - Plant: ${h.plant?.name}`);
    });
  });
```

## Common Use Cases

### Use Case 1: "Morning Garden Check"

Automatically check all plants every morning at 9 AM:

```javascript
// Get all plants
fetch('/api/plants')
  .then(r => r.json())
  .then(plants => {
    // Create schedules for each plant
    const promises = plants.map(plant => {
      return fetch('/api/automation/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantId: plant.id,
          analysisType: 'photo',
          frequency: 'daily',
          timeOfDay: '09:00',
          enabled: true
        })
      });
    });

    return Promise.all(promises);
  })
  .then(() => {
    console.log('All plants now have daily morning checks!');
  });
```

### Use Case 2: "Flowering Stage Monitoring"

When plants enter flowering, automatically switch to trichome monitoring:

```javascript
// This would be triggered when stage changes to 'flowering'
fetch('/api/automation/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'workflow',
    data: {
      name: 'Flowering Stage Setup',
      workflowType: 'photo_analysis',
      steps: [
        {
          type: 'schedule',
          config: {
            plantId: 'your-plant-id',
            analysisType: 'trichome',
            frequency: 'daily',
            timeOfDay: '09:00'
          }
        },
        {
          type: 'notify',
          config: {
            type: 'stage_change',
            channels: ['inApp'],
            message: 'Flowering stage detected - trichome monitoring enabled'
          }
        }
      ]
    }
  })
});
```

### Use Case 3: "Emergency Health Scan"

Quick health check on all plants when issues are suspected:

```javascript
// Emergency batch analysis
fetch('/api/plants')
  .then(r => r.json())
  .then(plants => {
    return fetch('/api/automation/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Emergency Health Scan',
        type: 'photo',
        plantIds: plants.map(p => p.id),
        config: {
          analysisType: 'emergency',
          checkFor: ['pests', 'diseases', 'deficiencies'],
          priority: 'critical'
        }
      })
    });
  })
  .then(r => r.json())
  .then(batch => {
    console.log(`Emergency scan started: ${batch.data.id}`);
    console.log(`Analyzing ${batch.data.totalCount} plants`);
  });
```

## Checking Results

### View Recent Analyses

```bash
# Using curl
curl http://localhost:3000/api/automation/trends \
  | jq '.data.history[] | {date: .createdAt, type: .analysisType, plant: .plant.name}'
```

### Check Anomalies

```javascript
fetch('/api/automation/anomalies')
  .then(r => r.json())
  .then(data => {
    console.log('Active Anomalies:', data.data.anomalies.length);
    data.data.anomalies.forEach(a => {
      console.log(`${a.plant?.name}: ${a.metric} - ${a.severity}`);
    });
  });
```

### View Milestones

```javascript
// Get harvest-ready plants
fetch('/api/automation/trends')
  .then(r => r.json())
  .then(trends => {
    const harvestReady = trends.data.milestones.filter(
      m => m.type === 'harvest_ready' && !m.acknowledged
    );
    console.log(`Harvest Ready Plants: ${harvestReady.length}`);
  });
```

## Troubleshooting

### Issue: Schedules Not Running

**Check 1**: Is the automation engine running?

```javascript
fetch('/api/automation/engine')
  .then(r => r.json())
  .then(status => {
    if (!status.data.enabled) {
      console.error('Automation engine is disabled!');
    }
  });
```

**Check 2**: Is the nextRun time in the past?

```javascript
fetch('/api/automation/schedules')
  .then(r => r.json())
  .then(schedules => {
    schedules.data.forEach(s => {
      if (new Date(s.nextRun) < new Date()) {
        console.log(`Schedule ${s.id} is overdue!`);
      }
    });
  });
```

**Solution**: Run the engine manually

```bash
curl -X POST http://localhost:3000/api/automation/engine \
  -H "Content-Type: application/json" \
  -d '{"action": "run"}'
```

### Issue: No Anomaly Detection

**Check**: Are analyses being saved to history?

```javascript
fetch('/api/automation/trends')
  .then(r => r.json())
  .then(trends => {
    console.log('Total history records:', trends.data.history.length);
    if (trends.data.history.length === 0) {
      console.log('No analyses in history - check if analyses are running');
    }
  });
```

### Issue: Notifications Not Working

**Check**: Are notification rules configured?

```javascript
fetch('/api/automation/create?type=notification-rules')
  .then(r => r.json())
  .then(rules => {
    console.log('Notification rules:', rules.data.length);
  });
```

## Next Steps

1. **Explore Advanced Workflows**: Check out [AUTOMATION_TEMPLATES.md](./AUTOMATION_TEMPLATES.md) for complex automation examples

2. **Read Full Documentation**: See [AUTOMATION_SYSTEM.md](./AUTOMATION_SYSTEM.md) for complete API reference

3. **Customize for Your Needs**: Modify templates to match your growing style

4. **Monitor and Adjust**: Watch the results and fine-tune your automations

## Example Complete Setup Script

Here's a complete script to set up a full automation system:

```javascript
// Complete automation setup
async function setupAutomation() {
  try {
    // 1. Get all plants
    const plants = await fetch('/api/plants').then(r => r.json());
    console.log(`Setting up automation for ${plants.length} plants`);

    // 2. Create daily health checks
    for (const plant of plants) {
      await fetch('/api/automation/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantId: plant.id,
          analysisType: 'photo',
          frequency: 'daily',
          timeOfDay: '09:00',
          enabled: true
        })
      });
      console.log(`✓ Daily check scheduled for ${plant.name}`);
    }

    // 3. Create notification rules
    await fetch('/api/automation/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'rule',
        data: {
          name: 'Health Alert',
          ruleType: 'trigger',
          conditions: { type: 'less_than', key: 'healthScore', threshold: 60 },
          actions: [{ type: 'notify', config: { type: 'health_alert', channels: ['inApp'] } }]
        }
      })
    });
    console.log('✓ Health alert configured');

    // 4. Run first batch analysis
    const batch = await fetch('/api/automation/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Initial Garden Analysis',
        type: 'photo',
        plantIds: plants.map(p => p.id)
      })
    }).then(r => r.json());

    console.log(`✓ Batch analysis started: ${batch.data.id}`);
    console.log('\n🎉 Automation setup complete!');
    console.log('\nNext steps:');
    console.log('1. Set up a cron job to run /api/automation/engine every 5 minutes');
    console.log('2. Monitor results in /api/automation/trends');
    console.log('3. Check anomalies in /api/automation/anomalies');

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

// Run the setup
setupAutomation();
```

## Support Resources

- **Full Documentation**: [AUTOMATION_SYSTEM.md](./AUTOMATION_SYSTEM.md)
- **Templates & Examples**: [AUTOMATION_TEMPLATES.md](./AUTOMATION_TEMPLATES.md)
- **API Reference**: See API endpoint documentation in code comments
- **Database Schema**: Check `prisma/schema.prisma` for model definitions

## Summary

You now have:

✅ Daily automated health checks set up
✅ Batch processing capability
✅ Notification system configured
✅ Monitoring dashboard access
✅ Knowledge of how to troubleshoot issues

**Your plants are now being monitored automatically!** 🚀

The automation engine will check for due tasks every time it runs, execute analyses, detect anomalies, and keep you informed about your plants' health.

Remember to:
- Check the automation engine is running (set up a cron job!)
- Monitor results regularly
- Adjust schedules based on plant growth stages
- Fine-tune notification thresholds

Happy growing! 🌿
