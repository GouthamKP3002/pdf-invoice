// src/services/pdfService.ts
import fs from 'fs';
import pdf from 'pdf-parse';

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file not found');
    }

    const dataBuffer = fs.readFileSync(filePath);
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