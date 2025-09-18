// src/services/groqService.ts - SIMPLE FIX
import Groq from 'groq-sdk';

// Updated to use currently supported models
const GROQ_MODELS = {
  primary: 'llama-3.3-70b-versatile',
  fallback: 'llama-3.1-8b-instant'
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

export async function extractDataWithGroq(text: string, useFallback: boolean = false) {
  // Initialize Groq client inside the function to avoid module load issues
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  const modelToUse = useFallback ? GROQ_MODELS.fallback : GROQ_MODELS.primary;
  
  try {
    console.log(`🟦 Sending request to Groq API using model: ${modelToUse}`);
    
    // Truncate text if too long to avoid token limits
    const truncatedText = text.length > 12000 ? text.substring(0, 12000) + '...' : text;
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt + truncatedText
        }
      ],
      model: modelToUse,
      temperature: 0.1,
      max_tokens: 2048,
      top_p: 0.8
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    
    console.log('🟦 Received response from Groq');
    
    if (!responseContent) {
      throw new Error('Empty response from Groq API');
    }

    // Clean up the response text (remove markdown formatting if present)
    let cleanedResponse = responseContent.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse Groq response as JSON:', cleanedResponse);
      throw new Error(`Invalid JSON response from Groq: ${parseError}`);
    }

    // Validate and sanitize the parsed data
    const sanitizedData = sanitizeExtractedData(parsedData);
    
    console.log('✅ Successfully extracted and sanitized data from Groq');
    return sanitizedData;

  } catch (error: any) {
    console.error(`❌ Groq extraction error with model ${modelToUse}:`, error);
    
    // If using primary model and it fails, try fallback model
    if (!useFallback && modelToUse === GROQ_MODELS.primary) {
      console.log('🔄 Trying fallback model...');
      return extractDataWithGroq(text, true);
    }
    
    // Re-throw with more context
    if (error.status === 429) {
      throw new Error(`Groq API rate limit exceeded: ${error.message}`);
    } else if (error.status === 400 && error.message?.includes('model')) {
      throw new Error(`Groq model error: ${error.message}. Please check if the model is still supported.`);
    } else if (error.message?.includes('API key')) {
      throw new Error('Invalid or missing Groq API key');
    } else {
      throw new Error(`Groq AI extraction failed: ${error.message}`);
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