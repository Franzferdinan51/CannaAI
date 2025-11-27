import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let rule;

    switch (type) {
      case 'rule':
        rule = await prisma.automationRule.create({
          data: {
            name: data.name,
            description: data.description,
            type: data.ruleType || 'schedule',
            enabled: data.enabled ?? true,
            conditions: data.conditions || {},
            actions: data.actions || {},
            config: data.config || {},
            plantId: data.plantId || null
          }
        });
        break;

      case 'schedule':
        rule = await prisma.schedule.create({
          data: {
            name: data.name,
            description: data.description,
            cronExpression: data.cronExpression,
            timezone: data.timezone || 'UTC',
            type: data.scheduleType || 'analysis',
            interval: data.interval,
            enabled: data.enabled ?? true,
            config: data.config || {},
            nextRun: data.nextRun ? new Date(data.nextRun) : null
          }
        });
        break;

      case 'workflow':
        rule = await prisma.workflow.create({
          data: {
            name: data.name,
            description: data.description,
            type: data.workflowType || 'photo_analysis',
            enabled: data.enabled ?? true,
            steps: data.steps || {},
            config: data.config || {}
          }
        });
        break;

      case 'trigger':
        rule = await prisma.trigger.create({
          data: {
            name: data.name,
            description: data.description,
            type: data.triggerType || 'anomaly',
            conditions: data.conditions || {},
            config: data.config || {},
            enabled: data.enabled ?? true,
            cooldown: data.cooldown || 3600
          }
        });
        break;

      case 'scheduler':
        rule = await prisma.analysisScheduler.create({
          data: {
            plantId: data.plantId || null,
            analysisType: data.analysisType || 'photo',
            frequency: data.frequency || 'daily',
            timeOfDay: data.timeOfDay,
            enabled: data.enabled ?? true,
            config: data.config || {},
            nextRun: data.nextRun ? new Date(data.nextRun) : null
          }
        });
        break;

      case 'notification-rule':
        rule = await prisma.notificationRule.create({
          data: {
            name: data.name,
            type: data.notificationType || 'anomaly',
            conditions: data.conditions || {},
            channels: JSON.stringify(data.channels || {}),
            template: data.template,
            enabled: data.enabled ?? true,
            cooldown: data.cooldown || 3600
          }
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid automation type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Automation creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create automation rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let result;

    if (type) {
      switch (type) {
        case 'rules':
          result = await prisma.automationRule.findMany({
            include: {
              plant: true,
              schedule: true,
              trigger: true
            },
            orderBy: { createdAt: 'desc' }
          });
          break;
        case 'schedules':
          result = await prisma.schedule.findMany({
            include: {
              rules: true
            },
            orderBy: { createdAt: 'desc' }
          });
          break;
        case 'workflows':
          result = await prisma.workflow.findMany({
            orderBy: { createdAt: 'desc' }
          });
          break;
        case 'triggers':
          result = await prisma.trigger.findMany({
            include: {
              rules: true
            },
            orderBy: { createdAt: 'desc' }
          });
          break;
        case 'schedulers':
          result = await prisma.analysisScheduler.findMany({
            include: {
              plant: true
            },
            orderBy: { createdAt: 'desc' }
          });
          break;
        case 'notification-rules':
          result = await prisma.notificationRule.findMany({
            orderBy: { createdAt: 'desc' }
          });
          break;
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid type parameter' },
            { status: 400 }
          );
      }
    } else {
      // Return all automation configurations
      const [rules, schedules, workflows, triggers, schedulers, notificationRules] = await Promise.all([
        prisma.automationRule.findMany({
          include: { plant: true, schedule: true, trigger: true },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.schedule.findMany({ include: { rules: true }, orderBy: { createdAt: 'desc' } }),
        prisma.workflow.findMany({ orderBy: { createdAt: 'desc' } }),
        prisma.trigger.findMany({ include: { rules: true }, orderBy: { createdAt: 'desc' } }),
        prisma.analysisScheduler.findMany({ include: { plant: true }, orderBy: { createdAt: 'desc' } }),
        prisma.notificationRule.findMany({ orderBy: { createdAt: 'desc' } })
      ]);

      result = {
        rules,
        schedules,
        workflows,
        triggers,
        schedulers,
        notificationRules
      };
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Automation list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch automation rules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
