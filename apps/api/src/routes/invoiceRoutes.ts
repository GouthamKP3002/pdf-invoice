// src/routes/invoiceRoutes.ts
import express from 'express';
import { Invoice } from '../models/Invoices.js';
import fs from 'fs';
import path from 'path';

// Define interfaces for type safety
interface InvoiceLineItem {
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

interface QueryParams {
  page?: string;
  limit?: string;
  q?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

const router = express.Router();

// GET / - List all invoices with search and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '10',
      q = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as QueryParams;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10))); // Limit between 1-100
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    const searchQuery: any = {};
    
    if (q && typeof q === 'string' && q.trim()) {
      searchQuery.$or = [
        { 'vendor.name': { $regex: q, $options: 'i' } },
        { 'invoice.number': { $regex: q, $options: 'i' } },
        { fileName: { $regex: q, $options: 'i' } }
      ];
    }

    if (status && typeof status === 'string' && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      searchQuery.extractionStatus = status;
    }

    // Build sort query
    const sortQuery: any = {};
    const validSortFields = ['createdAt', 'updatedAt', 'fileName', 'vendor.name', 'invoice.number'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    sortQuery[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [invoices, total] = await Promise.all([
      Invoice.find(searchQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNum + 1 : null,
          prevPage: hasPrevPage ? pageNum - 1 : null
        },
        filters: {
          searchQuery: q,
          status,
          sortBy: sortField,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('❌ Get invoices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /:id - Get single invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID format'
      });
    }

    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Check if PDF file still exists
    const pdfExists = invoice.filePath ? fs.existsSync(invoice.filePath) : false;

    res.json({
      success: true,
      data: {
        invoice,
        pdfExists,
        pdfUrl: pdfExists ? `/file/${invoice.fileId}` : null
      }
    });

  } catch (error) {
    console.error('❌ Get invoice error:', error);
    
    // Handle invalid ObjectId
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST / - Create new invoice manually
router.post('/', async (req, res) => {
  try {
    const {
      fileId,
      fileName,
      vendor,
      invoice: invoiceData,
      extractionModel
    } = req.body;

    // Validate required fields
    if (!fileId || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileId and fileName are required'
      });
    }

    if (!vendor || !vendor.name) {
      return res.status(400).json({
        success: false,
        error: 'vendor.name is required'
      });
    }

    if (!invoiceData || !invoiceData.number || !invoiceData.date) {
      return res.status(400).json({
        success: false,
        error: 'invoice.number and invoice.date are required'
      });
    }

    // Check if invoice with same fileId already exists
    const existingInvoice = await Invoice.findOne({ fileId });
    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        error: 'Invoice with this fileId already exists'
      });
    }

    // Create new invoice
    const newInvoice = new Invoice({
      fileId,
      fileName,
      filePath: `uploads/pdfs/${fileId}.pdf`,
      vendor: {
        name: vendor.name,
        address: vendor.address || '',
        taxId: vendor.taxId || ''
      },
      invoice: {
        number: invoiceData.number,
        date: invoiceData.date,
        currency: invoiceData.currency || 'USD',
        subtotal: parseFloat(invoiceData.subtotal) || 0,
        taxPercent: parseFloat(invoiceData.taxPercent) || 0,
        total: parseFloat(invoiceData.total) || 0,
        poNumber: invoiceData.poNumber || '',
        poDate: invoiceData.poDate || '',
        lineItems: Array.isArray(invoiceData.lineItems) ? invoiceData.lineItems.map((item: any): InvoiceLineItem => ({
          description: item.description || '',
          unitPrice: parseFloat(item.unitPrice) || 0,
          quantity: parseFloat(item.quantity) || 0,
          total: parseFloat(item.total) || 0
        })) : []
      },
      extractionStatus: 'completed',
      extractionModel: extractionModel || 'manual'
    });

    const savedInvoice = await newInvoice.save();

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        invoice: savedInvoice
      }
    });

  } catch (error) {
    console.error('❌ Create invoice error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.message
      });
    }

    // Handle duplicate key errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        error: 'Invoice with this fileId already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /:id - Update existing invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID format'
      });
    }

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.fileId;
    delete updateData.createdAt;
    delete updateData.__v;

    // Validate vendor data if provided
    if (updateData.vendor) {
      if (!updateData.vendor.name) {
        return res.status(400).json({
          success: false,
          error: 'vendor.name is required'
        });
      }
    }

    // Validate invoice data if provided
    if (updateData.invoice) {
      if (!updateData.invoice.number || !updateData.invoice.date) {
        return res.status(400).json({
          success: false,
          error: 'invoice.number and invoice.date are required'
        });
      }

      // Ensure numeric fields are properly converted
      if (updateData.invoice.subtotal !== undefined) {
        updateData.invoice.subtotal = parseFloat(updateData.invoice.subtotal);
      }
      if (updateData.invoice.taxPercent !== undefined) {
        updateData.invoice.taxPercent = parseFloat(updateData.invoice.taxPercent);
      }
      if (updateData.invoice.total !== undefined) {
        updateData.invoice.total = parseFloat(updateData.invoice.total);
      }

      // Process line items if provided
      if (updateData.invoice.lineItems && Array.isArray(updateData.invoice.lineItems)) {
        updateData.invoice.lineItems = updateData.invoice.lineItems.map((item: any): InvoiceLineItem => ({
          description: item.description || '',
          unitPrice: parseFloat(item.unitPrice) || 0,
          quantity: parseFloat(item.quantity) || 0,
          total: parseFloat(item.total) || 0
        }));
      }
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedInvoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: {
        invoice: updatedInvoice
      }
    });

  } catch (error) {
    console.error('❌ Update invoice error:', error);
    
    // Handle invalid ObjectId
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID format'
      });
    }

    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /:id - Delete invoice and PDF file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { keepFile } = req.query;
    const keepFileFlag = keepFile === 'true';

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID format'
      });
    }

    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Delete PDF file if requested and exists
    let fileDeleted = false;
    if (!keepFileFlag && invoice.filePath) {
      try {
        if (fs.existsSync(invoice.filePath)) {
          fs.unlinkSync(invoice.filePath);
          fileDeleted = true;
          console.log(`🗑️ Deleted PDF file: ${invoice.filePath}`);
        }
      } catch (fileError) {
        console.warn('⚠️ Could not delete PDF file:', fileError);
      }
    }

    // Delete invoice from database
    await Invoice.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
      data: {
        deletedInvoice: {
          id: invoice._id,
          fileName: invoice.fileName,
          fileId: invoice.fileId
        },
        fileDeleted: fileDeleted,
        fileKept: keepFileFlag
      }
    });

  } catch (error) {
    console.error('❌ Delete invoice error:', error);
    
    // Handle invalid ObjectId
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;