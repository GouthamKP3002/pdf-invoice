// src/routes/extractRoutes.ts
import express from 'express';
import { extractTextFromPDF } from '../services/pdfService.js';
import { extractDataSafely } from '../services/aiServiceManager.js'; // Use the safe wrapper
import { Invoice } from '../models/Invoices.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// POST /extract - Extract data from uploaded PDF
router.post('/', async (req, res) => {
  try {
    const { fileId, model = 'gemini' } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'fileId is required'
      });
    }

    if (!['gemini', 'groq'].includes(model)) {
      return res.status(400).json({
        success: false,
        error: 'model must be either "gemini" or "groq"'
      });
    }

    // Check if file exists
    const filePath = path.join('uploads/pdfs', `${fileId}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found'
      });
    }

    const fileName = `${fileId}.pdf`;

    // Extract text from PDF first
    console.log(`📄 Extracting text from PDF: ${fileName}`);
    const extractedText = await extractTextFromPDF(filePath);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from PDF. The file might be corrupted or contain only images.'
      });
    }

    console.log(`📝 Extracted ${extractedText.length} characters from PDF`);
    console.log(`🤖 Starting AI extraction with ${model.toUpperCase()}`);
    
    // Use the safe extraction method - this will never throw or return undefined
    const extractedData = await extractDataSafely(extractedText, model);
    
    // Check if we got mock data (indicates AI failure)
    const isMockData = extractedData.vendor.name.includes('Mock') || 
                      extractedData.vendor.name.includes('AI Extraction Failed');
    
    let actualModelUsed = model;
    if (isMockData) {
      console.log('⚠️ Using mock data due to AI extraction failure');
      actualModelUsed = 'mock';
    }

    // Create or update invoice record
    let invoice = await Invoice.findOne({ fileId });
    if (!invoice) {
      invoice = new Invoice({
        fileId,
        fileName,
        filePath,
        extractionStatus: 'completed',
        extractionModel: actualModelUsed,
        vendor: extractedData.vendor,
        invoice: extractedData.invoice
      });
    } else {
      invoice.vendor = extractedData.vendor;
      invoice.invoice = extractedData.invoice;
      invoice.extractionStatus = 'completed';
      invoice.extractionModel = actualModelUsed;
    }
    
    await invoice.save();

    res.json({
      success: true,
      message: isMockData ? 
        'PDF processed but AI extraction failed - using fallback data' : 
        'Data extracted successfully',
      data: {
        fileId,
        fileName,
        extractionModel: actualModelUsed,
        extractedData: {
          vendor: extractedData.vendor,
          invoice: extractedData.invoice
        },
        invoiceId: invoice._id,
        status: 'completed',
        warning: isMockData ? 'AI extraction failed, mock data used' : null
      }
    });

  } catch (error) {
    console.error('❌ Extraction error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to extract data from PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /:fileId - Get extraction status
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const invoice = await Invoice.findOne({ fileId });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Extraction record not found'
      });
    }

    res.json({
      success: true,
      data: {
        fileId,
        fileName: invoice.fileName,
        status: invoice.extractionStatus,
        model: invoice.extractionModel,
        extractedData: invoice.extractionStatus === 'completed' ? {
          vendor: invoice.vendor,
          invoice: invoice.invoice
        } : null,
        invoiceId: invoice._id,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Get extraction status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get extraction status'
    });
  }
});

// POST /retry/:fileId - Retry extraction with different model
router.post('/retry/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { model = 'gemini' } = req.body;

    if (!['gemini', 'groq'].includes(model)) {
      return res.status(400).json({
        success: false,
        error: 'model must be either "gemini" or "groq"'
      });
    }

    const invoice = await Invoice.findOne({ fileId });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice record not found'
      });
    }

    // Check if file still exists
    const filePath = path.join('uploads/pdfs', `${fileId}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found'
      });
    }

    // Extract text from PDF
    console.log(`📄 Re-extracting text from PDF: ${invoice.fileName}`);
    const extractedText = await extractTextFromPDF(filePath);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from PDF'
      });
    }

    console.log(`🔄 Retrying extraction with ${model.toUpperCase()}`);
    
    // Use the safe extraction method
    const extractedData = await extractDataSafely(extractedText, model);
    
    // Check if we got mock data (indicates AI failure)
    const isMockData = extractedData.vendor.name.includes('Mock') || 
                      extractedData.vendor.name.includes('AI Extraction Failed');
    
    let actualModelUsed = model;
    if (isMockData) {
      console.log('⚠️ Retry using mock data due to AI extraction failure');
      actualModelUsed = 'mock';
    }

    // Update invoice with extracted data
    invoice.vendor = extractedData.vendor;
    invoice.invoice = extractedData.invoice;
    invoice.extractionStatus = 'completed';
    invoice.extractionModel = actualModelUsed;
    await invoice.save();

    res.json({
      success: true,
      message: isMockData ? 
        'Retry completed but AI extraction failed - using fallback data' : 
        'Data re-extraction completed successfully',
      data: {
        fileId,
        fileName: invoice.fileName,
        extractionModel: actualModelUsed,
        extractedData: {
          vendor: extractedData.vendor,
          invoice: extractedData.invoice
        },
        invoiceId: invoice._id,
        status: 'completed',
        warning: isMockData ? 'AI extraction failed, mock data used' : null
      }
    });

  } catch (error) {
    console.error('❌ Retry extraction error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retry extraction'
    });
  }
});

export default router;