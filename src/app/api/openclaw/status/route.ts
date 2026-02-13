import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple endpoint for OpenClaw bots to query CannaAI
// Returns easy-to-parse JSON for agent consumption

export async function GET() {
  try {
    const rooms = await prisma.room.findMany();
    const plants = await prisma.plant.findMany();
    const strains = await prisma.strain.findMany();
    
    // Simple status for bots
    const status = {
      status: 'online',
      rooms: rooms.length,
      activeRooms: rooms.filter(r => r.active).length,
      plants: plants.length,
      strains: strains.length,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 500 }
    );
  }
}
