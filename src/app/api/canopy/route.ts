import { NextRequest, NextResponse } from 'next/server';
import { scanInventoryItem, fetchStrainDataFromUrl, findProductAlternatives, analyzeGenetics, fetchCannabisNews, analyzeGrowData } from '@/lib/ai/canopyService';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Scan inventory item (nutrient bottle or seed pack) with AI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;
    const apiKey = body.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    switch (action) {
      case 'scan': {
        const { image, mode } = data;
        const result = await scanInventoryItem(image, mode, apiKey);
        return NextResponse.json({ success: true, data: result });
      }

      case 'fetch-strain': {
        const { url } = data;
        const result = await fetchStrainDataFromUrl(url, apiKey);
        return NextResponse.json({ success: true, data: result });
      }

      case 'alternatives': {
        const { itemName, brand, category } = data;
        const result = await findProductAlternatives(itemName, brand, category, apiKey);
        return NextResponse.json({ success: true, data: result });
      }

      case 'analyze-genetics': {
        const { targetStrain, inventory } = data;
        const result = await analyzeGenetics(targetStrain, inventory, apiKey);
        return NextResponse.json({ success: true, data: result });
      }

      case 'news': {
        const { category } = data;
        const result = await fetchCannabisNews(apiKey, category);
        return NextResponse.json({ success: true, data: result });
      }

      case 'analyze-grow': {
        const { logs, nutrients, strains } = data;
        const result = await analyzeGrowData(logs, nutrients, strains, apiKey);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[CANOPY API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
