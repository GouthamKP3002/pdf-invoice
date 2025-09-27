// src/services/pdfService.ts - Debug version with health checks
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();
// Configuration
const PYTHON_PDF_SERVICE_URL = process.env.PYTHON_PDF_SERVICE_URL || 'https://pdf-text-ectract.vercel.app';

interface PythonExtractionResult {
  success: boolean;
  text?: string;
  method?: string;
  confidence?: number;
  processing_time_ms?: number;
  text_length?: number;
  sample?: string;
  error?: string;
}

// Test the Python service health and structure
async function debugPythonService(): Promise<void> {
  console.log(`🔍 Debugging Python service: ${PYTHON_PDF_SERVICE_URL}`);
  
  try {
    // Test base URL
    console.log('📞 Testing base URL...');
    const baseResponse = await fetch(PYTHON_PDF_SERVICE_URL, {
      method: 'GET',
      timeout: 5000
    });
    console.log(`📞 Base URL status: ${baseResponse.status} ${baseResponse.statusText}`);
    
    if (baseResponse.ok) {
      const baseText = await baseResponse.text();
      console.log(`📞 Base URL response: ${baseText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error('❌ Base URL test failed:', error.message);
  }
  
  try {
    // Test health endpoint
    console.log('🏥 Testing health endpoint...');
    const healthResponse = await fetch(`${PYTHON_PDF_SERVICE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    console.log(`🏥 Health endpoint status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`🏥 Health data:`, healthData);
    }
  } catch (error) {
    console.error('❌ Health endpoint test failed:', error.message);
  }
  
  try {
    // Test extract endpoint structure
    console.log('🧪 Testing extract endpoint...');
    const extractResponse = await fetch(`${PYTHON_PDF_SERVICE_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body to test error handling
      timeout: 5000
    });
    console.log(`🧪 Extract endpoint status: ${extractResponse.status} ${extractResponse.statusText}`);
    
    const extractText = await extractResponse.text();
    console.log(`🧪 Extract endpoint response: ${extractText.substring(0, 300)}...`);
  } catch (error) {
    console.error('❌ Extract endpoint test failed:', error.message);
  }
}

// Simple fallback extraction when Python service is not available
async function fallbackTextExtraction(fileUrl: string): Promise<string> {
  console.log('🔧 Using fallback text extraction (simple method)...');
  
  try {
    const response = await fetch(fileUrl, { timeout: 30000 });
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`📊 PDF buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Simple text extraction from PDF binary
    const pdfString = buffer.toString('latin1'); // Use latin1 for better binary handling
    
    let extractedText = '';
    
    // Method 1: Extract text between parentheses (most common PDF text storage)
    const parenthesesMatches = pdfString.match(/\(([^)]+)\)/g);
    if (parenthesesMatches) {
      extractedText = parenthesesMatches
        .map(match => match.slice(1, -1)) // Remove parentheses
        .filter(text => text.length > 1 && /[a-zA-Z0-9]/.test(text)) // Must contain alphanumeric
        .join(' ')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\/g, ''); // Remove other backslashes
    }
    
    // Method 2: If not enough text, try extracting from text objects
    if (extractedText.length < 50) {
      const textObjectMatches = pdfString.match(/BT\s*(.*?)\s*ET/gs);
      if (textObjectMatches) {
        const textFromObjects = textObjectMatches
          .map(match => {
            // Extract text between Tj commands
            const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g);
            if (tjMatches) {
              return tjMatches
                .map(tj => tj.match(/\(([^)]*)\)/)?.[1] || '')
                .filter(text => text.length > 0)
                .join(' ');
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ');
        
        if (textFromObjects.length > extractedText.length) {
          extractedText = textFromObjects;
        }
      }
    }
    
    // Method 3: Last resort - extract any readable ASCII sequences
    if (extractedText.length < 20) {
      console.log('🔍 Using last resort ASCII extraction...');
      const asciiMatches = pdfString.match(/[A-Za-z0-9\s.,;:!?$€£¥₹-]{20,}/g);
      if (asciiMatches) {
        extractedText = asciiMatches
          .filter(match => {
            // Must contain at least some letters and reasonable content
            const letterCount = (match.match(/[A-Za-z]/g) || []).length;
            const digitCount = (match.match(/[0-9]/g) || []).length;
            return letterCount > 5 && (letterCount + digitCount) > match.length * 0.3;
          })
          .join(' ');
      }
    }
    
    // Clean up extracted text
    extractedText = extractedText
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (extractedText.length < 10) {
      throw new Error('Could not extract meaningful text from PDF using fallback method');
    }
    
    console.log(`📝 Fallback extraction successful: ${extractedText.length} characters`);
    console.log(`📝 Sample text: "${extractedText.substring(0, 150)}..."`);
    
    return extractedText;
    
  } catch (error) {
    console.error('❌ Fallback extraction failed:', error);
    throw error;
  }
}

// Main extraction function with debugging and fallback
export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  const startTime = Date.now();
  console.log(`📄 Starting PDF text extraction: ${fileUrl.substring(0, 100)}...`);
  
  // Run debug check first (only in development)
  if (process.env.NODE_ENV !== 'production') {
    await debugPythonService();
  }
  
  try {
    // Try Python service first
    console.log(`🐍 Attempting Python service extraction: ${PYTHON_PDF_SERVICE_URL}/extract`);
    
    const response = await fetch(`${PYTHON_PDF_SERVICE_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NodeJS-PDF-Extractor/1.0',
      },
      body: JSON.stringify({
        fileUrl: fileUrl
      }),
      timeout: 45000
    });

    console.log(`🐍 Python service response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result: PythonExtractionResult = await response.json();
      console.log('🐍 Python service result:', { 
        success: result.success, 
        textLength: result.text?.length,
        method: result.method,
        confidence: result.confidence 
      });

      if (result.success && result.text && result.text.trim().length > 10) {
        const processingTime = Date.now() - startTime;
        console.log(`🎉 Python extraction successful in ${processingTime}ms`);
        return result.text;
      } else {
        console.log(`⚠️ Python service returned insufficient text: ${result.error || 'No error message'}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`⚠️ Python service HTTP error: ${errorText}`);
    }

  } catch (pythonError: unknown) {
    const errorMessage = pythonError instanceof Error ? pythonError.message : 'Unknown error';
    console.log(`⚠️ Python service error: ${errorMessage}`);
  }

  // Fallback to simple extraction
  console.log('🔄 Falling back to simple text extraction...');
  try {
    const text = await fallbackTextExtraction(fileUrl);
    const processingTime = Date.now() - startTime;
    console.log(`🎉 Fallback extraction completed in ${processingTime}ms`);
    return text;
    
  } catch (fallbackError: unknown) {
    const processingTime = Date.now() - startTime;
    const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
    console.error(`❌ All extraction methods failed after ${processingTime}ms:`, errorMessage);
    throw new Error(`PDF text extraction failed: ${errorMessage}`);
  }
}

// Enhanced extraction with retry logic
export async function extractTextFromPDFWithRetry(
  fileUrl: string, 
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 PDF extraction attempt ${attempt}/${maxRetries}`);
      const result = await extractTextFromPDF(fileUrl);
      
      if (attempt > 1) {
        console.log(`✅ PDF extraction succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Unknown extraction error');
      console.error(`❌ PDF extraction attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  const errorMessage = lastError ? lastError.message : 'Unknown error';
  throw new Error(`PDF extraction failed after ${maxRetries} attempts. Last error: ${errorMessage}`);
}

// Legacy function for backward compatibility
export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  throw new Error('Buffer extraction not supported. Please use URL-based extraction.');
}