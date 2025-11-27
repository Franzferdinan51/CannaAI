# Automation Templates & Examples

This document provides ready-to-use automation templates for common cannabis cultivation scenarios.

## Table of Contents

1. [Quick Start Templates](#quick-start-templates)
2. [Growth Stage Templates](#growth-stage-templates)
3. [Batch Processing Templates](#batch-processing-templates)
4. [Notification Templates](#notification-templates)
5. [Complex Workflow Examples](#complex-workflow-examples)

## Quick Start Templates

### Template 1: Daily Health Monitoring

**Purpose**: Monitor plant health daily with photo analysis and anomaly detection

```javascript
const dailyMonitoring = {
  type: 'scheduler',
  data: {
    name: 'Daily Health Monitoring',
    plantId: 'your-plant-id',
    analysisType: 'photo',
    frequency: 'daily',
    timeOfDay: '09:00',
    enabled: true,
    config: {
      analysisType: 'comprehensive',
      detectAnomalies: true,
      saveToHistory: true,
      notifyOnIssues: true
    }
  }
};

// POST to /api/automation/schedules
fetch('/api/automation/schedules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(dailyMonitoring)
});
```

### Template 2: Weekly Trichome Analysis

**Purpose**: Monitor trichome development weekly during flowering stage

```javascript
const weeklyTrichome = {
  type: 'scheduler',
  data: {
    name: 'Weekly Trichome Monitoring',
    plantId: 'your-plant-id',
    analysisType: 'trichome',
    frequency: 'weekly',
    timeOfDay: '10:00',
    enabled: true,
    config: {
      deviceType: 'microscope',
      magnification: 200,
      checkHarvestReadiness: true,
      notifyWhenReady: true
    }
  }
};

fetch('/api/automation/schedules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(weeklyTrichome)
});
```

### Template 3: Harvest Readiness Monitor

**Purpose**: Continuous monitoring during late flowering for harvest timing

```javascript
const harvestMonitor = {
  type: 'scheduler',
  data: {
    name: 'Harvest Readiness Monitor',
    plantId: 'your-plant-id',
    analysisType: 'trichome',
    frequency: 'daily',
    timeOfDay: '08:00',
    enabled: true,
    config: {
      deviceType: 'microscope',
      magnification: 200,
      threshold: {
        amberPercentage: 20,
        cloudyPercentage: 60
      }
    }
  }
};
```

## Growth Stage Templates

### Seedling Stage (Weeks 1-3)

**Focus**: Basic health monitoring, gentle lighting checks

```javascript
const seedlingSchedule = {
  plantId: 'your-plant-id',
  analysisType: 'photo',
  frequency: 'bi_weekly',
  timeOfDay: '10:00',
  enabled: true,
  config: {
    focusAreas: ['general_health', 'root_development'],
    checkFor: ['damping_off', 'overwatering', 'nutrient_burn'],
    gentleMode: true
  }
};
```

### Vegetative Stage (Weeks 4-8)

**Focus**: Growth pattern monitoring, light burn detection, pest detection

```javascript
const vegetativeSchedule = {
  plantId: 'your-plant-id',
  analysisType: 'photo',
  frequency: 'daily',
  timeOfDay: '09:00',
  enabled: true,
  config: {
    focusAreas: ['growth_pattern', 'leaf_health', 'pest_detection'],
    checkFor: ['light_burn', 'nitrogen_deficiency', 'spider_mites'],
    analyzeStructure: true,
    nodeSpacing: true
  }
};
```

### Flowering Stage (Weeks 9-16)

**Focus**: Trichome monitoring, bud health, harvest timing

```javascript
const floweringSchedule = {
  plantId: 'your-plant-id',
  analysisType: 'trichome',
  frequency: 'daily',
  timeOfDay: '09:00',
  enabled: true,
  config: {
    deviceType: 'microscope',
    magnification: 200,
    focusAreas: ['trichomes', 'pistils', 'bud_density'],
    dailyTrichomeCheck: true,
    alertOnMaturity: true
  }
};
```

### Late Flower / Ripening Stage (Weeks 10-16)

**Purpose**: Focus on harvest readiness and avoiding over-maturation

```javascript
const lateFlowerSchedule = {
  plantId: 'your-plant-id',
  analysisType: 'trichome',
  frequency: 'daily',
  timeOfDay: '08:00',
  enabled: true,
  config: {
    deviceType: 'microscope',
    magnification: 200,
    checkFor: ['amber_trichomes', 'pistil_browning', 'degradation'],
    maturityThreshold: {
      minAmber: 15,
      maxAmber: 30,
      preferredCloudy: 60
    }
  }
};
```

## Batch Processing Templates

### Template: Full Garden Weekly Analysis

**Purpose**: Analyze all plants in the garden weekly

```javascript
const fullGardenBatch = {
  name: 'Weekly Garden Analysis - All Plants',
  type: 'photo',
  config: {
    analysisType: 'comprehensive',
    generateReport: true,
    detectAnomalies: true,
    compareToPrevious: true
  }
};

// First get all plants
const plants = await fetch('/api/plants').then(r => r.json());

// Create batch
const batch = await fetch('/api/automation/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...fullGardenBatch,
    plantIds: plants.map(p => p.id),
    createdBy: 'system'
  })
});

const result = await batch.json();
console.log(`Batch created: ${result.data.id}`);
```

### Template: Trichome Analysis - Flowering Plants Only

```javascript
// Get flowering plants only
const floweringPlants = await fetch('/api/plants?stage=flowering').then(r => r.json());

const trichomeBatch = {
  name: 'Trichome Analysis - Flowering Plants',
  type: 'trichome',
  plantIds: floweringPlants.map(p => p.id),
  config: {
    deviceType: 'microscope',
    magnification: 200,
    checkHarvestReadiness: true,
    prioritize: true // Process in order of flowering start date
  }
};
```

### Template: Emergency Health Check

**Purpose**: Quick batch analysis when issues are detected

```javascript
const emergencyCheck = {
  name: 'Emergency Health Check',
  type: 'photo',
  config: {
    analysisType: 'emergency',
    checkFor: ['pests', 'diseases', 'deficiencies', 'environmental_stress'],
    priority: 'critical',
    notifyImmediately: true
  }
};
```

## Notification Templates

### Template: Critical Health Alert

```javascript
const criticalAlert = {
  type: 'rule',
  data: {
    name: 'Critical Health Alert',
    ruleType: 'trigger',
    conditions: {
      type: 'less_than',
      key: 'healthScore',
      threshold: 40
    },
    actions: [
      {
        type: 'notify',
        config: {
          type: 'critical_alert',
          channels: ['inApp', 'email', 'sms'],
          urgency: 'critical',
          title: 'URGENT: Plant Health Critical',
          message: 'Plant requires immediate attention'
        }
      },
      {
        type: 'create-task',
        config: {
          title: 'URGENT: Inspect Plant Health',
          priority: 'critical',
          description: 'Health score critically low - immediate inspection required'
        }
      }
    ]
  }
};

fetch('/api/automation/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(criticalAlert)
});
```

### Template: Harvest Ready Notification

```javascript
const harvestReadyNotification = {
  type: 'notification-rule',
  data: {
    name: 'Harvest Ready Alert',
    notificationType: 'harvest_ready',
    conditions: {
      trichomeMaturity: {
        amber: { min: 15, max: 40 },
        cloudy: { min: 50, max: 80 }
      },
      pistilColor: 'browning',
      budDensity: 'dense'
    },
    channels: {
      inApp: true,
      email: true,
      push: true
    },
    cooldown: 86400 // 24 hours
  }
};
```

### Template: Weekly Summary Report

```javascript
const weeklyReport = {
  type: 'schedule',
  data: {
    name: 'Weekly Analysis Summary',
    cronExpression: '0 18 * * 0', // 6 PM every Sunday
    scheduleType: 'report',
    interval: 'weekly',
    config: {
      reportType: 'weekly_summary',
      include: [
        'plant_health_summary',
        'anomalies_detected',
        'analyses_completed',
        'trends',
        'recommendations'
      ],
      recipients: ['email'],
      format: 'detailed'
    }
  }
};
```

## Complex Workflow Examples

### Workflow 1: Complete Trichome Monitoring Pipeline

**Steps**:
1. Capture photo with microscope
2. Analyze trichomes
3. If harvest ready → notify + create task
4. If not ready → check again tomorrow
5. Log results to history

```javascript
const trichomeWorkflow = {
  type: 'workflow',
  data: {
    name: 'Trichome Monitoring Pipeline',
    workflowType: 'harvest',
    steps: [
      {
        type: 'capture',
        config: {
          device: 'microscope',
          magnification: 200,
          focusArea: 'trichomes',
          qualityCheck: true
        }
      },
      {
        type: 'analyze',
        config: {
          type: 'trichome',
          checkMaturity: true,
          measureDensity: true,
          assessHealth: true
        }
      },
      {
        type: 'if',
        condition: {
          type: 'equals',
          key: 'harvestReadiness.ready',
          expected: true
        },
        then: [
          {
            type: 'notify',
            config: {
              type: 'harvest_ready',
              channels: ['inApp', 'email'],
              priority: 'high'
            }
          },
          {
            type: 'create-task',
            config: {
              title: 'Harvest Ready - Action Required',
              priority: 'high',
              description: 'Plants have reached optimal harvest window'
            }
          }
        ],
        else: [
          {
            type: 'notify',
            config: {
              type: 'harvest_monitoring',
              channels: ['inApp'],
              priority: 'low',
              message: 'Continue monitoring - not ready yet'
            }
          },
          {
            type: 'schedule',
            config: {
              frequency: 'daily',
              timeOfDay: '09:00',
              note: 'Automated follow-up'
            }
          }
        ]
      },
      {
        type: 'save-history',
        config: {
          includeImages: true,
          includeAnalysis: true,
          includeRecommendations: true
        }
      }
    ]
  }
};

fetch('/api/automation/workflows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(trichomeWorkflow)
});
```

### Workflow 2: Automated Pest Detection Response

**Steps**:
1. Daily photo analysis
2. Detect pest signs
3. If pests detected → increase monitoring + notify
4. Schedule follow-up analysis
5. Create treatment task

```javascript
const pestDetectionWorkflow = {
  type: 'workflow',
  data: {
    name: 'Automated Pest Detection & Response',
    workflowType: 'monitoring',
    steps: [
      {
        type: 'analyze',
        config: {
          type: 'photo',
          focusAreas: ['pest_detection', 'disease_detection'],
          sensitivity: 'high'
        }
      },
      {
        type: 'if',
        condition: {
          type: 'contains',
          key: 'pestsDetected',
          value: true
        },
        then: [
          {
            type: 'notify',
            config: {
              type: 'pest_alert',
              channels: ['inApp', 'email'],
              severity: 'high',
              title: 'Pests Detected - Immediate Attention Required'
            }
          },
          {
            type: 'create-task',
            config: {
              title: 'URGENT: Pest Inspection & Treatment',
              priority: 'high',
              description: 'Automated pest detection - manual inspection required'
            }
          },
          {
            type: 'schedule',
            config: {
              frequency: 'daily',
              timeOfDay: '08:00',
              note: 'Increased monitoring due to pest detection'
            }
          },
          {
            type: 'analyze',
            config: {
              type: 'photo',
              focusAreas: ['treatment_effectiveness'],
              scheduleIn: '3days'
            }
          }
        ]
      }
    ]
  }
};
```

### Workflow 3: Complete Growth Stage Transition

**Purpose**: Monitor and respond to growth stage changes

```javascript
const growthStageWorkflow = {
  type: 'workflow',
  data: {
    name: 'Growth Stage Transition Monitor',
    workflowType: 'monitoring',
    steps: [
      {
        type: 'analyze',
        config: {
          type: 'photo',
          checkStage: true,
          detectFlowering: true
        }
      },
      {
        type: 'if',
        condition: {
          type: 'changed',
          key: 'growthStage',
          from: 'vegetative',
          to: 'flowering'
        },
        then: [
          {
            type: 'notify',
            config: {
              type: 'stage_change',
              channels: ['inApp', 'email'],
              priority: 'medium',
              title: 'Flowering Stage Started',
              message: 'Plants have entered flowering - adjust care accordingly'
            }
          },
          {
            type: 'schedule',
            config: {
              analysisType: 'trichome',
              frequency: 'daily',
              timeOfDay: '09:00'
            }
          },
          {
            type: 'create-task',
            config: {
              title: 'Adjust Care for Flowering Stage',
              priority: 'medium',
              description: 'Switch nutrients, adjust light schedule, increase monitoring'
            }
          },
          {
            type: 'update-config',
            config: {
              nutrientSchedule: 'bloom',
              lightSchedule: '12_12',
              monitoringFrequency: 'daily'
            }
          }
        ]
      }
    ]
  }
};
```

### Workflow 4: Nutrient Deficiency Response

**Purpose**: Detect deficiencies and recommend treatments

```javascript
const deficiencyResponseWorkflow = {
  type: 'workflow',
  data: {
    name: 'Nutrient Deficiency Response',
    workflowType: 'monitoring',
    steps: [
      {
        type: 'analyze',
        config: {
          type: 'photo',
          checkNutrients: true,
          checkDeficiencies: true,
          detailed: true
        }
      },
      {
        type: 'if',
        condition: {
          type: 'greater_than',
          key: 'nutrientDeficiencies.count',
          threshold: 0
        },
        then: [
          {
            type: 'notify',
            config: {
              type: 'deficiency_alert',
              channels: ['inApp', 'email'],
              severity: 'high',
              includeDeficiencies: true
            }
          },
          {
            type: 'create-task',
            config: {
              title: 'Nutrient Deficiency Detected',
              priority: 'high',
              generateRecommendations: true,
              includeTreatments: true
            }
          },
          {
            type: 'if',
            condition: {
              type: 'equals',
              key: 'severity',
              expected: 'critical'
            },
            then: [
              {
                type: 'notify',
                config: {
                  type: 'critical_alert',
                  channels: ['inApp', 'email', 'sms'],
                  urgency: 'critical'
                }
              }
            ]
          }
        ]
      }
    ]
  }
};
```

### Workflow 5: Environmental Anomaly Response

**Purpose**: Monitor sensor data and respond to environmental issues

```javascript
const environmentalWorkflow = {
  type: 'workflow',
  data: {
    name: 'Environmental Anomaly Response',
    workflowType: 'monitoring',
    steps: [
      {
        type: 'check-sensors',
        config: {
          metrics: ['temperature', 'humidity', 'ph', 'ec']
        }
      },
      {
        type: 'if',
        condition: {
          type: 'out_of_range',
          key: 'temperature',
          min: 20,
          max: 26
        },
        then: [
          {
            type: 'notify',
            config: {
              type: 'environmental_alert',
              channels: ['inApp', 'email'],
              severity: 'high',
              message: 'Temperature out of optimal range'
            }
          }
        ]
      },
      {
        type: 'if',
        condition: {
          type: 'out_of_range',
          key: 'humidity',
          min: 40,
          max: 60
        },
        then: [
          {
            type: 'notify',
            config: {
              type: 'environmental_alert',
              channels: ['inApp', 'email'],
              severity: 'medium',
              message: 'Humidity out of optimal range'
            }
          }
        ]
      },
      {
        type: 'if',
        condition: {
          type: 'equals',
          key: 'anomalies.count',
          expected: 0
        },
        then: [
          {
            type: 'notify',
            config: {
              type: 'all_good',
              channels: ['inApp'],
              message: 'All environmental parameters are optimal'
            }
          }
        ]
      }
    ]
  }
};
```

## Automation Recipes

### Recipe 1: "Set and Forget" Daily Monitoring

```javascript
// Simple daily health check with notifications
const dailyCheck = {
  schedule: {
    plantId: 'auto-detect', // Or specific plant ID
    analysisType: 'photo',
    frequency: 'daily',
    timeOfDay: '09:00'
  },
  rules: [
    {
      condition: 'healthScore < 60',
      action: 'notify_health_alert'
    },
    {
      condition: 'pestsDetected = true',
      action: 'notify_pest_alert'
    }
  ]
};
```

### Recipe 2: "Flowering Focus" During Bloom

```javascript
// Increase monitoring during flowering
const floweringFocus = {
  trigger: 'stage == "flowering"',
  actions: [
    {
      type: 'schedule',
      config: {
        analysisType: 'trichome',
        frequency: 'daily',
        timeOfDay: '09:00'
      }
    },
    {
      type: 'notify',
      config: {
        type: 'flowering_started',
        channels: ['inApp', 'email']
      }
    }
  ]
};
```

### Recipe 3: "Harvest Countdown"

```javascript
// Track days until harvest
const harvestCountdown = {
  workflow: [
    {
      type: 'analyze',
      config: { type: 'trichome' }
    },
    {
      type: 'calculate',
      config: {
        metric: 'daysUntilHarvest',
        basedOn: 'trichomeMaturity'
      }
    },
    {
      type: 'notify',
      config: {
        type: 'harvest_countdown',
        channels: ['inApp'],
        frequency: 'weekly'
      }
    }
  ]
};
```

## Best Practices for Templates

1. **Start Simple**: Begin with basic schedules, add complexity gradually
2. **Test Thoroughly**: Test each automation before setting it to run automatically
3. **Monitor Logs**: Check execution logs to ensure automations are working
4. **Adjust Thresholds**: Fine-tune thresholds based on your specific plants
5. **Use Cooldowns**: Prevent notification spam with cooldown periods
6. **Document Changes**: Keep notes on what automations you have configured
7. **Regular Reviews**: Review and update automations based on plant performance
8. **Backup Configurations**: Save your automation configurations

## Troubleshooting Common Issues

### Issue: Automations Not Running

**Solution**: Check engine status
```javascript
fetch('/api/automation/engine')
  .then(r => r.json())
  .then(status => {
    if (!status.data.enabled) {
      console.error('Automation engine is disabled');
    }
  });
```

### Issue: Too Many Notifications

**Solution**: Increase cooldown periods
```javascript
const notificationRule = {
  cooldown: 86400, // 24 hours
  severityThresholds: {
    critical: 0,
    high: 3600,
    medium: 14400,
    low: 86400
  }
};
```

### Issue: Batch Processing Failures

**Solution**: Process smaller batches
```javascript
const batchConfig = {
  batchSize: 20, // Process 20 plants at a time
  retryFailed: true,
  maxRetries: 3,
  delayBetweenBatches: 60000 // 1 minute
};
```

## Integration Examples

### With Plant Management

```javascript
// When creating a new plant, automatically set up monitoring
const newPlant = await fetch('/api/plants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Plant',
    strain: 'Blue Dream'
  })
});

const plant = await newPlant.json();

// Auto-setup daily monitoring
await fetch('/api/automation/schedules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    plantId: plant.id,
    analysisType: 'photo',
    frequency: 'daily',
    timeOfDay: '09:00'
  })
});
```

### With Sensor Data

```javascript
// Trigger analysis when sensor readings are abnormal
const sensorAlert = {
  type: 'rule',
  conditions: {
    type: 'sensor_anomaly',
    metric: 'temperature',
    threshold: { min: 20, max: 26 }
  },
  actions: [
    {
      type: 'analyze',
      config: { type: 'photo', checkFor: 'heat_stress' }
    }
  ]
};
```

## Conclusion

These templates provide a solid foundation for automating your photo analysis workflows. Start with simple schedules and gradually add more sophisticated workflows as you become comfortable with the system.

Remember to:
- Always test automations before enabling them
- Monitor the results and adjust as needed
- Keep your automation configurations backed up
- Regularly review and optimize your workflows

For more advanced use cases or custom requirements, refer to the full [Automation System Documentation](./AUTOMATION_SYSTEM.md).
