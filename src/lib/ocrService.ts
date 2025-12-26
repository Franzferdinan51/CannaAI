import Tesseract from 'tesseract.js';

/**
 * OCR Service for extracting text from plant photos
 * Useful for reading:
 * - Nutrient bottle labels
 * - Seed packaging
 * - Growth stage indicators
 * - pH/EC meter readings
 * - Calibration documentation
 */
export async function recognizeText(imageSource: string | Blob): Promise<string> {
    try {
        const result = await Tesseract.recognize(
            imageSource,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            }
        );
        return result.data.text;
    } catch (error) {
        console.error("OCR Failed:", error);
        return "";
    }
}

/**
 * Extract text from multiple images in batch
 */
export async function recognizeTextBatch(imageSources: (string | Blob)[]): Promise<string[]> {
    const results = await Promise.allSettled(
        imageSources.map(img => recognizeText(img))
    );

    return results.map(result => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        console.error("OCR batch item failed:", result.reason);
        return "";
    });
}

/**
 * Extract nutrient information from label text
 */
export function parseNutrientLabel(ocrText: string): {
    npk?: string;
    brand?: string;
    product?: string;
    warnings?: string[];
} {
    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const result: any = {};

    // Try to find NPK ratio
    const npkMatch = ocrText.match(\d+-\d+-\d+/);
    if (npkMatch) {
        result.npk = npkMatch[0];
    }

    // Look for brand names (usually first few lines)
    if (lines.length > 0) {
        result.brand = lines[0];
    }

    // Look for product name
    if (lines.length > 1) {
        result.product = lines[1];
    }

    // Extract warnings
    const warningKeywords = ['warning', 'caution', 'danger', 'keep out of reach'];
    result.warnings = lines.filter(line =>
        warningKeywords.some(kw => line.toLowerCase().includes(kw))
    );

    return result;
}

/**
 * Extract pH/EC readings from digital meter display photos
 */
export function parseMeterReading(ocrText: string): {
    ph?: number;
    ec?: number;
    ppm?: number;
    rawText?: string;
} {
    const result: any = { rawText: ocrText };

    // Look for pH readings (typically 0-14 with decimals)
    const phMatch = ocrText.match(/pH[:\s]*([\d.]+)/i);
    if (phMatch) {
        const ph = parseFloat(phMatch[1]);
        if (ph >= 0 && ph <= 14) {
            result.ph = ph;
        }
    }

    // Look for EC readings (typically 0.5-5.0 mS/cm)
    const ecMatch = ocrText.match(/EC[:\s]*([\d.]+)/i);
    if (ecMatch) {
        result.ec = parseFloat(ecMatch[1]);
    }

    // Look for PPM readings (typically 100-3000)
    const ppmMatch = ocrText.match(/(\d{3,4})\s*ppm/i);
    if (ppmMatch) {
        result.ppm = parseInt(ppmMatch[1]);
    }

    return result;
}
