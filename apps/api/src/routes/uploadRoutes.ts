// src/routes/uploadRoutes.ts (Updated with automatic invoice creation)
import express from 'express';
import multer from 'multer';
import { put, del } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { Invoice } from '../models/Invoices.js';

const router = express.Router();

// Configure multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

// GET /upload - Get upload configuration and limits
router.get('/upload', (req, res) => {
  res.json({
    success: true,
    message: 'Upload endpoint ready',
    configuration: {
      maxFileSize: '25MB',
      allowedFormats: ['pdf'],
      uploadPath: '/upload',
      storage: 'vercel-blob',
      autoCreateInvoice: true
    }
  });
});

// POST /upload - Handle PDF upload to Vercel Blob and create invoice record
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided'
      });
    }

    const fileId = uuidv4();
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    
    // Generate a unique blob name
    const blobName = `pdfs/${fileId}.pdf`;

    console.log(`📄 Uploading PDF to Vercel Blob: ${fileName} (${fileSize} bytes)`);

    // Upload to Vercel Blob
    const blob = await put(blobName, req.file.buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    console.log(`✅ PDF uploaded to Vercel Blob: ${blob.url}`);

    // Create initial invoice record in database
    try {
      const invoice = new Invoice({
        fileId,
        fileName,
        fileUrl: blob.url,
        blobName: blobName,
        fileSize,
        vendor: {
          name: '',
          address: '',
          taxId: ''
        },
        invoice: {
          number: '',
          date: new Date().toISOString().split('T')[0],
          currency: 'USD',
          subtotal: 0,
          taxPercent: 0,
          total: 0,
          poNumber: '',
          poDate: '',
          lineItems: []
        },
        extractionStatus: 'pending'
      });

      await invoice.save();
      console.log(`✅ Invoice record created in database: ${invoice._id}`);

      // Return success response with complete info
      res.json({
        success: true,
        message: 'PDF uploaded successfully and invoice record created',
        data: {
          fileId,
          fileName,
          fileUrl: blob.url,
          blobName,
          fileSize,
          invoiceId: invoice._id,
          uploadedAt: new Date().toISOString(),
          nextSteps: {
            extract: `POST /extract with {"fileId": "${fileId}", "model": "gemini"}`,
            view: `GET /invoices/${invoice._id}`,
            pdfUrl: blob.url
          }
        }
      });

    } catch (dbError) {
      console.error('❌ Failed to create invoice record:', dbError);
      
      // If database fails, try to clean up the uploaded file
      try {
        await del(blob.url);
        console.log('🗑️ Cleaned up uploaded file after database error');
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup file:', cleanupError);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create invoice record',
        details: dbError instanceof Error ? dbError.message : 'Database error'
      });
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload PDF to Vercel Blob',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /file/:fileId - Get file info and redirect to Vercel Blob URL
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Get file info from database
    const invoice = await Invoice.findOne({ fileId });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Redirect to the Vercel Blob URL
    res.redirect(invoice.fileUrl);
    
  } catch (error) {
    console.error('❌ File serve error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve PDF file'
    });
  }
});

// DELETE /upload/:fileId - Delete file from Vercel Blob and database
router.delete('/upload/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Find the invoice record
    const invoice = await Invoice.findOne({ fileId });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    console.log(`🗑️ Deleting PDF from Vercel Blob: ${invoice.blobName}`);
    
    try {
      // Delete from Vercel Blob
      await del(invoice.fileUrl);
      console.log(`✅ PDF deleted from Vercel Blob: ${invoice.blobName}`);
    } catch (blobError) {
      console.error('⚠️ Failed to delete from Vercel Blob:', blobError);
      // Continue with database deletion
    }

    // Delete invoice record
    await Invoice.findByIdAndDelete(invoice._id);
    console.log(`✅ Invoice record deleted: ${invoice._id}`);

    res.json({
      success: true,
      message: 'PDF and invoice record deleted successfully',
      data: { 
        fileId, 
        fileName: invoice.fileName,
        blobName: invoice.blobName 
      }
    });

  } catch (error) {
    console.error('❌ File delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete PDF file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;