// src/services/pdfService.ts
import fetch from 'node-fetch';

// PDF.js extraction function
async function extractWithPDFJS(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import of pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    
    // In Node.js environments, we don't need/can't use web workers
    // Set worker to null to disable worker usage
    pdfjsLib.GlobalWorkerOptions.workerSrc='';
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      // Disable worker for Node.js
      useWorkerFetch: false,
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
    
    // Use PDF.js to extract text
    const extractedText = await extractWithPDFJS(dataBuffer);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    console.log(`📄 Successfully extracted ${extractedText.length} characters from PDF`);
    return extractedText;
    
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log(`📄 Processing PDF buffer: ${buffer.length} bytes`);
    
    // Use PDF.js to extract text
    const extractedText = await extractWithPDFJS(buffer);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    console.log(`📄 Successfully extracted ${extractedText.length} characters from PDF`);
    return extractedText;
    
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}