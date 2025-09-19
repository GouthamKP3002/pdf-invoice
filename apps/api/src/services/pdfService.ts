// src/services/pdfService.ts
import pdf from 'pdf-parse';
import fetch from 'node-fetch';

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
    
    // Parse the PDF
    const pdfData = await pdf(dataBuffer);
    
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    console.log(`📄 Extracted ${pdfData.text.length} characters from PDF`);
    console.log(`📊 PDF metadata: ${pdfData.numpages} pages`);

    return pdfData.text;
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Alternative function that accepts buffer directly (useful for direct processing)
export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log(`📄 Processing PDF buffer: ${buffer.length} bytes`);
    
    const pdfData = await pdf(buffer);
    
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    console.log(`📄 Extracted ${pdfData.text.length} characters from PDF`);
    console.log(`📊 PDF metadata: ${pdfData.numpages} pages`);

    return pdfData.text;
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}