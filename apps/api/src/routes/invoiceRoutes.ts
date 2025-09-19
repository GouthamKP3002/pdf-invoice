// src/routes/invoiceRoutes.ts
import express from 'express';
import { Invoice } from '../models/Invoices.js';
import { del } from '@vercel/blob';

const router = express.Router();

// GET /invoices - List all invoices with search and pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, q = '' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    let searchQuery: any = {};
    if (q && typeof q === 'string' && q.trim()) {
      searchQuery = {
        $or: [
          { 'vendor.name': { $regex: q.trim(), $options: 'i' } },
          { 'invoice.number': { $regex: q.trim(), $options: 'i' } }
        ]
      };
    }

    // Get invoices with pagination
    const [invoices, total] = await Promise.all([
      Invoice.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRecords: total,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Get invoices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices'
    });
  }
});

// GET /invoices/:id - Get single invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('❌ Get invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice'
    });
  }
});

// POST /invoices - Create new invoice manually (including after upload)
router.post('/', async (req, res) => {
  try {
    const {
      fileId,
      fileName,
      fileUrl,
      blobName,
      fileSize,
      vendor,
      invoice: invoiceData
    } = req.body;

    // Validate required fields
    if (!fileId || !fileName || !fileUrl || !blobName) {
      return res.status(400).json({
        success: false,
        error: 'fileId, fileName, fileUrl, and blobName are required'
      });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ fileId });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        error: 'Invoice with this fileId already exists'
      });
    }

    // Create default vendor and invoice data if not provided
    const defaultVendor = {
      name: vendor?.name || '',
      address: vendor?.address || '',
      taxId: vendor?.taxId || ''
    };

    const defaultInvoiceData = {
      number: invoiceData?.number || '',
      date: invoiceData?.date || new Date().toISOString().split('T')[0],
      currency: invoiceData?.currency || 'USD',
      subtotal: invoiceData?.subtotal || 0,
      taxPercent: invoiceData?.taxPercent || 0,
      total: invoiceData?.total || 0,
      poNumber: invoiceData?.poNumber || '',
      poDate: invoiceData?.poDate || '',
      lineItems: invoiceData?.lineItems || []
    };

    const newInvoice = new Invoice({
      fileId,
      fileName,
      fileUrl,
      blobName,
      fileSize,
      vendor: defaultVendor,
      invoice: defaultInvoiceData,
      extractionStatus: 'pending'
    });

    await newInvoice.save();

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: newInvoice
    });

  } catch (error) {
    console.error('❌ Create invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invoice'
    });
  }
});

// PUT /invoices/:id - Update existing invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vendor, invoice: invoiceData } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Update vendor data
    if (vendor) {
      invoice.vendor = {
        name: vendor.name || invoice.vendor.name,
        address: vendor.address !== undefined ? vendor.address : invoice.vendor.address,
        taxId: vendor.taxId !== undefined ? vendor.taxId : invoice.vendor.taxId
      };
    }

    // Update invoice data
    if (invoiceData) {
      invoice.invoice = {
        number: invoiceData.number || invoice.invoice.number,
        date: invoiceData.date || invoice.invoice.date,
        currency: invoiceData.currency || invoice.invoice.currency,
        subtotal: invoiceData.subtotal !== undefined ? invoiceData.subtotal : invoice.invoice.subtotal,
        taxPercent: invoiceData.taxPercent !== undefined ? invoiceData.taxPercent : invoice.invoice.taxPercent,
        total: invoiceData.total !== undefined ? invoiceData.total : invoice.invoice.total,
        poNumber: invoiceData.poNumber !== undefined ? invoiceData.poNumber : invoice.invoice.poNumber,
        poDate: invoiceData.poDate !== undefined ? invoiceData.poDate : invoice.invoice.poDate,
        lineItems: invoiceData.lineItems || invoice.invoice.lineItems
      };
    }

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });

  } catch (error) {
    console.error('❌ Update invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update invoice'
    });
  }
});

// DELETE /invoices/:id - Delete invoice and PDF file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    try {
      // Delete PDF from Vercel Blob
      console.log(`🗑️ Deleting PDF from Vercel Blob: ${invoice.blobName}`);
      await del(invoice.fileUrl);
      console.log(`✅ PDF deleted from Vercel Blob: ${invoice.blobName}`);
    } catch (blobError) {
      console.error('⚠️ Failed to delete from Vercel Blob:', blobError);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete invoice record from database
    await Invoice.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Invoice and PDF file deleted successfully',
      data: {
        invoiceId: id,
        fileId: invoice.fileId,
        fileName: invoice.fileName,
        blobName: invoice.blobName
      }
    });

  } catch (error) {
    console.error('❌ Delete invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete invoice'
    });
  }
});

export default router;