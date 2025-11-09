import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Mock inventory data
let inventory = [
  { id: 1, name: 'General Hydroponics Flora Series', category: 'Nutrients', quantity: 2, unit: 'L', cost: 45, lastRestocked: '2024-05-01', lowStockThreshold: 1 },
  { id: 2, name: 'Fox Farm Ocean Forest', category: 'Soil', quantity: 3, unit: 'bags', cost: 25, lastRestocked: '2024-04-15', lowStockThreshold: 2 },
  { id: 3, name: 'LED Grow Light 1000W', category: 'Equipment', quantity: 4, unit: 'units', cost: 299, lastRestocked: '2024-03-20', lowStockThreshold: 1 },
  { id: 4, name: 'Cal-Mag Supplement', category: 'Nutrients', quantity: 0.5, unit: 'L', cost: 20, lastRestocked: '2024-05-10', lowStockThreshold: 1 },
  { id: 5, name: 'pH Down Solution', category: 'Nutrients', quantity: 1, unit: 'L', cost: 15, lastRestocked: '2024-04-28', lowStockThreshold: 0.5 }
];

export async function GET() {
  try {
    // Calculate inventory statistics
    const totalValue = inventory.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    const lowStockItems = inventory.filter(item => item.quantity <= item.lowStockThreshold);
    const categoryBreakdown = inventory.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + (item.cost * item.quantity);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      inventory,
      statistics: {
        totalValue,
        totalItems: inventory.length,
        lowStockCount: lowStockItems.length,
        categoryBreakdown
      },
      lowStockItems
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, quantity, unit, cost, lowStockThreshold } = body;

    // Validate required fields
    if (!name || !category || quantity === undefined || !unit || cost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new inventory item
    const newItem = {
      id: Date.now(),
      name,
      category,
      quantity,
      unit,
      cost,
      lowStockThreshold: lowStockThreshold || 1,
      lastRestocked: new Date().toISOString().split('T')[0]
    };

    // Add to inventory
    inventory.push(newItem);

    return NextResponse.json({
      success: true,
      item: newItem,
      message: 'Item added to inventory successfully'
    });

  } catch (error) {
    console.error('Add inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to add inventory item' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Find and update item
    const itemIndex = inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    inventory[itemIndex] = { ...inventory[itemIndex], ...updateData };

    return NextResponse.json({
      success: true,
      item: inventory[itemIndex],
      message: 'Item updated successfully'
    });

  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
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
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Find and delete item
    const itemIndex = inventory.findIndex(item => item.id === parseInt(id));
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const deletedItem = inventory.splice(itemIndex, 1)[0];

    return NextResponse.json({
      success: true,
      item: deletedItem,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Delete inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}