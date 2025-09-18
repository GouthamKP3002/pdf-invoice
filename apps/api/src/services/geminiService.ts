// src/services/geminiService.ts - ENHANCED VERSION
import { GoogleGenerativeAI } from '@google/generative-ai';

// Updated to use currently supported models with fallback strategy
const GEMINI_MODELS = {
  primary: 'gemini-1.5-flash',
  fallback: 'gemini-1.5-flash-8b'
} as const;

const prompt = `
You are an expert at extracting structured data from invoice text. 
Extract the following information from the invoice text and return it as a JSON object.

Required fields:
- vendor.name (string, required)
- vendor.address (string, optional)
- vendor.taxId (string, optional)
- invoice.number (string, required)
- invoice.date (string, required, format: YYYY-MM-DD)
- invoice.currency (string, default: "USD")
- invoice.subtotal (number, optional)
- invoice.taxPercent (number, optional)
- invoice.total (number, optional)
- invoice.poNumber (string, optional)
- invoice.poDate (string, optional, format: YYYY-MM-DD)
- invoice.lineItems (array of objects with description, unitPrice, quantity, total)

IMPORTANT RULES:
1. Always provide valid values for required fields (vendor.name, invoice.number, invoice.date)
2. If a required field cannot be found, use a reasonable placeholder like "Unknown Vendor" or "INV-UNKNOWN"
3. For dates, always use YYYY-MM-DD format
4. Return ONLY valid JSON, no markdown formatting or extra text
5. Ensure all numbers are valid (not NaN or null)

Invoice text to extract from:
`;

export async function extractDataWithGemini(text: string, useFallback: boolean = false) {
  // Initialize Gemini client inside the function to avoid module load issues
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelToUse = useFallback ? GEMINI_MODELS.fallback : GEMINI_MODELS.primary;

  const model = genAI.getGenerativeModel({ 
    model: modelToUse,
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 2048,
    }
  });

  try {
    console.log(`🔷 Sending request to Gemini API using model: ${modelToUse}`);
    
    // Truncate text if too long to avoid token limits
    const truncatedText = text.length > 10000 ? text.substring(0, 10000) + '...' : text;
    
    const result = await model.generateContent(prompt + truncatedText);
    const response = await result.response;
    const responseText = response.text();

    console.log('🔷 Received response from Gemini');
    
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    // Clean up the response text (remove markdown formatting if present)
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON:', cleanedResponse);
      throw new Error(`Invalid JSON response from Gemini: ${parseError}`);
    }

    // Validate and sanitize the parsed data
    const sanitizedData = sanitizeExtractedData(parsedData);
    
    console.log('✅ Successfully extracted and sanitized data from Gemini');
    return sanitizedData;

  } catch (error: any) {
    console.error(`❌ Gemini extraction error with model ${modelToUse}:`, error);
    
    // If using primary model and it fails, try fallback model
    if (!useFallback && modelToUse === GEMINI_MODELS.primary) {
      console.log('🔄 Trying fallback model...');
      return extractDataWithGemini(text, true);
    }
    
    // Re-throw with more context based on error type
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error(`Gemini API rate limit exceeded: ${error.message}`);
    } else if (error.status === 400 && error.message?.includes('model')) {
      throw new Error(`Gemini model error: ${error.message}. Please check if the model is still supported.`);
    } else if (error.status === 400 && (error.message?.includes('API key') || error.message?.includes('key not valid'))) {
      throw new Error('Invalid or missing Gemini API key. Please check your GEMINI_API_KEY environment variable.');
    } else if (error.status === 403) {
      throw new Error('Gemini API access denied. Please check your API key permissions and billing status.');
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error(`Gemini API network error: ${error.message}`);
    } else {
      throw new Error(`Gemini AI extraction failed: ${error.message}`);
    }
  }
}

function sanitizeExtractedData(data: any) {
  // Ensure required fields have valid values
  const sanitized = {
    vendor: {
      name: data.vendor?.name?.trim() || 'Unknown Vendor',
      address: data.vendor?.address?.trim() || undefined,
      taxId: data.vendor?.taxId?.trim() || undefined
    },
    invoice: {
      number: data.invoice?.number?.trim() || `INV-${Date.now()}`,
      date: validateAndFormatDate(data.invoice?.date) || new Date().toISOString().split('T')[0],
      currency: data.invoice?.currency?.trim() || 'USD',
      subtotal: parseFloat(data.invoice?.subtotal) || undefined,
      taxPercent: parseFloat(data.invoice?.taxPercent) || undefined,
      total: parseFloat(data.invoice?.total) || undefined,
      poNumber: data.invoice?.poNumber?.trim() || undefined,
      poDate: validateAndFormatDate(data.invoice?.poDate) || undefined,
      lineItems: sanitizeLineItems(data.invoice?.lineItems || [])
    }
  };

  return sanitized;
}

function validateAndFormatDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return undefined;
  }
}

function sanitizeLineItems(items: any[]): Array<{description: string; unitPrice: number; quantity: number; total: number}> {
  if (!Array.isArray(items)) return [];
  
  const sanitizedItems = items
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      description: item.description?.trim() || 'Unknown Item',
      unitPrice: parseFloat(item.unitPrice) || 0,
      quantity: parseFloat(item.quantity) || 1,
      total: parseFloat(item.total) || 0
    }))
    .filter(item => item.description && item.description !== 'Unknown Item');

  // If no valid items, create a placeholder
  if (sanitizedItems.length === 0) {
    return [{
      description: 'Unable to extract line items',
      unitPrice: 0,
      quantity: 1,
      total: 0
    }];
  }

  return sanitizedItems;
}