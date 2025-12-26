import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const preference = await prisma.notificationPreference.findUnique({
      where: { id: params.id }
    });

    if (!preference) {
      return NextResponse.json(
        { success: false, error: 'Notification preference not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: preference,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API-NOTIFICATIONS-PREFERENCES-ID-GET] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();

    // Validate quiet hours format if provided
    if (body.quietHoursStart && !/^\d{2}:\d{2}$/.test(body.quietHoursStart)) {
      return NextResponse.json(
        { success: false, error: 'quietHoursStart must be in HH:MM format' },
        { status: 400 }
      );
    }

    if (body.quietHoursEnd && !/^\d{2}:\d{2}$/.test(body.quietHoursEnd)) {
      return NextResponse.json(
        { success: false, error: 'quietHoursEnd must be in HH:MM format' },
        { status: 400 }
      );
    }

    const preference = await prisma.notificationPreference.update({
      where: { id: params.id },
      data: {
        ...(body.userId !== undefined && { userId: body.userId }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.emailEnabled !== undefined && { emailEnabled: body.emailEnabled }),
        ...(body.smsEnabled !== undefined && { smsEnabled: body.smsEnabled }),
        ...(body.pushEnabled !== undefined && { pushEnabled: body.pushEnabled }),
        ...(body.webhookEnabled !== undefined && { webhookEnabled: body.webhookEnabled }),
        ...(body.discordEnabled !== undefined && { discordEnabled: body.discordEnabled }),
        ...(body.slackEnabled !== undefined && { slackEnabled: body.slackEnabled }),
        ...(body.inAppEnabled !== undefined && { inAppEnabled: body.inAppEnabled }),
        ...(body.minSeverity !== undefined && { minSeverity: body.minSeverity }),
        ...(body.quietHoursStart !== undefined && { quietHoursStart: body.quietHoursStart }),
        ...(body.quietHoursEnd !== undefined && { quietHoursEnd: body.quietHoursEnd }),
        ...(body.throttleRate !== undefined && { throttleRate: body.throttleRate })
      }
    });

    return NextResponse.json({
      success: true,
      data: preference,
      message: 'Notification preference updated successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API-NOTIFICATIONS-PREFERENCES-ID-PUT] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: error instanceof Error && error.message.includes('Record to update not found') ? 404 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await prisma.notificationPreference.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification preference deleted successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API-NOTIFICATIONS-PREFERENCES-ID-DELETE] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: error instanceof Error && error.message.includes('Record to delete not found') ? 404 : 500 }
    );
  }
}
