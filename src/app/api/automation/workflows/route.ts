import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const enabled = searchParams.get('enabled');

    const where: any = {};
    if (type) where.type = type;
    if (enabled !== null) where.enabled = enabled === 'true';

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('Workflows fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch workflows',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      type,
      steps,
      config,
      enabled
    } = body;

    // Validate workflow steps
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow steps are required' },
        { status: 400 }
      );
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        type: type || 'photo_analysis',
        enabled: enabled ?? true,
        steps: steps,
        config: config || {}
      }
    });

    return NextResponse.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Workflow creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const workflow = await prisma.workflow.update({
      where: { id },
      data
    });

    return NextResponse.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Workflow update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    await prisma.workflow.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Workflow deletion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
