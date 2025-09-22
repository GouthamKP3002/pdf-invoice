// src/services/pdfService.ts
import fetch from 'node-fetch';

// Try pdf-parse as a simpler alternative
async function extractWithPDFParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (error) {
    console.error('pdf-parse failed:', error);
    throw error;
  }
}

// PDF.js extraction function with better error handling
async function extractWithPDFJS(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import of pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    
    // Don't use worker in Node.js
    pdfjsLib.GlobalWorkerOptions.workerSrc;
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      useWorkerFetch: false,
      isEvalSupported: false,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    console.log(`📄 PDF has ${pdf.numPages} pages`);
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => {
            // Handle different item types
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ');
        
        fullText += `Page ${pageNum}:\n${pageText}\n\n`;
        console.log(`📄 Extracted text from page ${pageNum}: ${pageText.length} characters`);
      } catch (pageError) {
        console.warn(`⚠️ Failed to extract text from page ${pageNum}:`, pageError);
      }
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF.js extraction failed:', error);
    throw error;
  }
}

export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    console.log(`📄 Fetching PDF from URL: ${fileUrl}`);
    
    // Fetch the PDF from Vercel Blob
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const dataBuffer = Buffer.from(arrayBuffer);
    
    console.log(`📄 Downloaded PDF buffer: ${dataBuffer.length} bytes`);
    
    // Try pdf-parse first as it's simpler and more reliable for Node.js
    try {
      const extractedText = await extractWithPDFParse(dataBuffer);
      if (extractedText && extractedText.trim().length > 0) {
        console.log(`📄 Successfully extracted ${extractedText.length} characters from PDF using pdf-parse`);
        return extractedText;
      }
    } catch (parseError) {
      console.warn('pdf-parse failed, trying PDF.js:', parseError);
    }
    
    // Fallback to PDF.js
    const extractedText = await extractWithPDFJS(dataBuffer);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    console.log(`📄 Successfully extracted ${extractedText.length} characters from PDF using PDF.js`);
    return extractedText;
    
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log(`📄 Processing PDF buffer: ${buffer.length} bytes`);
    
    // Try pdf-parse first
    try {
      const extractedText = await extractWithPDFParse(buffer);
      if (extractedText && extractedText.trim().length > 0) {
        console.log(`📄 Successfully extracted ${extractedText.length} characters from PDF using pdf-parse`);
        return extractedText;
      }
    } catch (parseError) {
      console.warn('pdf-parse failed, trying PDF.js:', parseError);
    }
    
    // Fallback to PDF.js
    const extractedText = await extractWithPDFJS(buffer);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    console.log(`📄 Successfully extracted ${extractedText.length} characters from PDF using PDF.js`);
    return extractedText;
    
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}