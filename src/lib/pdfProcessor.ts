import { recognizeText } from './ocrService';

// pdfjs-dist is loaded lazily so the API route does not evaluate browser-only
// PDF internals during the Next.js production build.

let pdfjsLibPromise: Promise<any> | null = null;

async function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    const isNode = typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node;

    pdfjsLibPromise = (isNode
      ? import('pdfjs-dist/legacy/build/pdf.mjs')
      : import('pdfjs-dist/build/pdf.mjs')
    ).then((pdfjsLib) => {
      if (isNode) {
        return pdfjsLib;
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      return pdfjsLib;
    });
  }

  return pdfjsLibPromise;
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
  const isNode = typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node;
  const pdfjsLib = await getPdfjsLib();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const images: string[] = [];

  // Process up to 20 pages for performance
  const maxPages = Math.min(pdf.numPages, 20);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);

    // Attempt text extraction
    const textContent = await page.getTextContent();
    let pageText = textContent.items.map((item: any) => item.str).join(' ');

    if (!isNode) {
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        images.push(dataUrl.split(',')[1] || '');

        if (pageText.trim().length < 50) {
          console.log(`[Page ${i}] No text layer found. Attempting OCR...`);
          pageText = await recognizeText(dataUrl);
        }
      }
    } else if (pageText.trim().length < 50) {
      console.log(`[Page ${i}] No text layer found. Attempting OCR...`);
      console.log(`[Page ${i}] Skipping OCR because the Node runtime has no canvas renderer configured.`);
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
