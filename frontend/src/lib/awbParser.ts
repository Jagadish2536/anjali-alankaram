/**
 * AWB & Shipping Label Barcode / QR Code Parsing Utility
 * 
 * Supports:
 * - DTDC 1D & 2D Barcodes (e.g. 7D13567031400000106955324522007029 -> 7D135670314)
 * - India Post Consignment Numbers (e.g. CA807216051IN)
 * - Delhivery Tracking Numbers (e.g. 123456789012)
 * - BlueDart, Ekart, XpressBees, and JSON QR payloads
 */

export interface ParsedAwbResult {
  awb: string;
  carrierId?: string;
  originalText: string;
}

export function parseAwbFromScannedText(rawText: string): ParsedAwbResult {
  const originalText = rawText.trim();
  let text = originalText;

  // 1. Check for JSON structured payload in QR code
  try {
    const parsed = JSON.parse(text);
    const code = parsed.awb || parsed.trackingNumber || parsed.awbCode || parsed.waybill;
    if (code) {
      const cleanAwb = String(code).trim().toUpperCase();
      return {
        awb: cleanAwb,
        carrierId: detectCarrierFromCode(cleanAwb, parsed.carrier || parsed.courier),
        originalText,
      };
    }
  } catch {
    // Not JSON, continue with pattern matching
  }

  // 2. DTDC Shipping Label Barcode Parsing (e.g. 7D13567031400000106955324522007029)
  // DTDC barcodes contain 11-char AWB starting with 7D, Z, V, D, B, N, P etc. followed by numbers
  if (/^7D\d{9}/i.test(text)) {
    // Standard DTDC AWB starting with 7D + 9 digits (total 11 chars)
    const dtdcAwb = text.substring(0, 11).toUpperCase();
    return {
      awb: dtdcAwb,
      carrierId: 'dtdc',
      originalText,
    };
  }

  // General DTDC 11-character barcode match within long barcode string
  const dtdcGeneralMatch = text.match(/(7D\d{9}|[A-Z][0-9]{10}|[A-Z]{2}[0-9]{9})/i);
  if (dtdcGeneralMatch && text.length > 15) {
    const dtdcAwb = dtdcGeneralMatch[1].toUpperCase();
    return {
      awb: dtdcAwb,
      carrierId: 'dtdc',
      originalText,
    };
  }

  // 3. India Post Consignment Number (e.g. CA807216051IN or CP123456789IN)
  const indiaPostMatch = text.match(/([A-Z]{2}\d{9}IN)/i);
  if (indiaPostMatch) {
    return {
      awb: indiaPostMatch[1].toUpperCase(),
      carrierId: 'india_post',
      originalText,
    };
  }

  // 4. Delhivery Tracking Number (12-14 numeric digits)
  if (/^\d{12,14}$/.test(text)) {
    return {
      awb: text,
      carrierId: 'delhivery',
      originalText,
    };
  }

  // 5. BlueDart Waybill Number (8-11 numeric digits)
  if (/^\d{8,11}$/.test(text)) {
    return {
      awb: text,
      carrierId: 'bluedart',
      originalText,
    };
  }

  // 6. Ekart (e.g. FMPP1234567890)
  if (/^FMPP\d+/i.test(text) || /^EKART/i.test(text)) {
    return {
      awb: text.toUpperCase(),
      carrierId: 'ekart',
      originalText,
    };
  }

  // 7. Fallback: Clean string, extract alphanumeric chars (if 6-25 chars)
  const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length >= 6 && cleaned.length <= 35) {
    // If string was very long and starts with 7D, extract first 11 chars
    if (cleaned.startsWith('7D') && cleaned.length >= 11) {
      return {
        awb: cleaned.substring(0, 11),
        carrierId: 'dtdc',
        originalText,
      };
    }
    return {
      awb: cleaned,
      carrierId: detectCarrierFromCode(cleaned),
      originalText,
    };
  }

  return {
    awb: text.toUpperCase(),
    carrierId: detectCarrierFromCode(text),
    originalText,
  };
}

function detectCarrierFromCode(code: string, hintedCarrier?: string): string | undefined {
  const upper = code.toUpperCase();
  const hint = (hintedCarrier || '').toLowerCase();

  if (hint.includes('dtdc') || upper.startsWith('7D')) return 'dtdc';
  if (hint.includes('post') || upper.endsWith('IN')) return 'india_post';
  if (hint.includes('blue') || hint.includes('dart')) return 'bluedart';
  if (hint.includes('delhi')) return 'delhivery';
  if (hint.includes('ekart') || upper.startsWith('FMPP')) return 'ekart';
  if (hint.includes('xpress')) return 'xpressbees';

  return undefined;
}
