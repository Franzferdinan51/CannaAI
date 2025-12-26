import * as pdfjsLib from 'pdfjs-dist';
import { recognizeText } from './ocrService';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * Process PDF files for cultivation document analysis
 * Handles:
 * - Nutrient schedules
 * - Grow guides
 * - Strain documentation
 * - Seed packaging inserts
 * - Calibration certificates
 */
export async function processPdf(file: File | Blob): Promise<{ text: string; images: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const images: string[] = [];

  // Process up to 20 pages for performance
  const maxPages = Math.min(pdf.numPages, 20);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);

    // Render page for visuals and OCR
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context!, viewport: viewport }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    images.push(dataUrl.split(',')[1]);

    // Attempt text extraction
    const textContent = await page.getTextContent();
    let pageText = textContent.items.map((item: any) => item.str).join(' ');

    // Fallback to OCR if text is empty or very short (scanned PDF)
    if (pageText.trim().length < 50) {
      console.log(`[Page ${i}] No text layer found. Attempting OCR...`);
      pageText = await recognizeText(dataUrl);
    }

    fullText += `[Page ${i}]\n${pageText}\n\n`;
  }

  return { text: fullText, images };
}

/**
 * Extract cultivation-specific data from PDF text
 */
export function extractCultivationData(pdfText: string): {
  strainNames?: string[];
  nutrientSchedules?: any[];
  floweringTimes?: string[];
  yields?: string[];
  recommendations?: string[];
} {
  const result: any = {};

  // Extract strain names (capitalized words in context)
  const strainPatterns = [
    /([A-Z][a-z]+\s+[A-Z][a-z]+)/g,  // Two words capitalized
    /([A-Z][a-z]+\s+[0-9]+\s*%)/g,   // Strain with THC percentage
  ];

  const strainSet = new Set<string>();
  strainPatterns.forEach(pattern => {
    const matches = pdfText.match(pattern);
    if (matches) {
      matches.forEach(m => strainSet.add(m.trim()));
    }
  });
  result.strainNames = Array.from(strainSet).slice(0, 20); // Limit to 20

  // Look for flowering time information
  const floweringMatch = pdfText.match(/flowering[:\s]*([0-9]+[-\s]*(weeks|days))/gi);
  if (floweringMatch) {
    result.floweringTimes = floweringMatch;
  }

  // Look for yield information
  const yieldMatch = pdfText.match(/yield[:\s]*([0-9]+[-\s]*(g|kg|oz|lbs))/gi);
  if (yieldMatch) {
    result.yields = yieldMatch;
  }

  return result;
}

/**
 * Classify document type based on content
 */
export function classifyDocument(text: string, images: string[]): {
  type: string;
  confidence: number;
} {
  const lowerText = text.toLowerCase();

  // Nutrient schedule indicators
  if (lowerText.includes('nutrient') || lowerText.includes('feeding') || lowerText.includes('npk')) {
    return { type: 'Nutrient Schedule', confidence: 0.85 };
  }

  // Grow guide indicators
  if (lowerText.includes('germination') || lowerText.includes('vegetative') || lowerText.includes('flowering')) {
    return { type: 'Grow Guide', confidence: 0.9 };
  }

  // Strain documentation
  if (lowerText.includes('strain') || lowerText.includes('genetics') || lowerText.includes('phenotype')) {
    return { type: 'Strain Documentation', confidence: 0.8 };
  }

  // Seed packaging
  if (lowerText.includes('seeds') || lowerText.includes('feminized') || lowerText.includes('autoflower')) {
    return { type: 'Seed Packaging', confidence: 0.85 };
  }

  // Calibration/certificate
  if (lowerText.includes('calibration') || lowerText.includes('certificate') || lowerText.includes('laboratory')) {
    return { type: 'Calibration Document', confidence: 0.75 };
  }

  // Default
  return { type: 'General Document', confidence: 0.5 };
}
