// src/models/Invoice.ts
import mongoose, { Document, Schema } from 'mongoose';

interface ILineItem {
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

interface IVendor {
  name: string;
  address?: string;
  taxId?: string;
}

interface IInvoiceData {
  number: string;
  date: string;
  currency?: string;
  subtotal?: number;
  taxPercent?: number;
  total?: number;
  poNumber?: string;
  poDate?: string;
  lineItems: ILineItem[];
}

export interface IInvoice extends Document {
  fileId: string;
  fileName: string;
  fileUrl: string; // Vercel Blob URL
  blobName: string; // Blob path for deletion
  fileSize?: number;
  vendor: IVendor;
  invoice: IInvoiceData;
  extractionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractionModel?: 'gemini' | 'groq' | 'mock';
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<ILineItem>({
  description: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  total: { type: Number, required: true }
});

const VendorSchema = new Schema<IVendor>({
  name: { type: String, required: false, default: '' },
  address: { type: String },
  taxId: { type: String }
});

const InvoiceDataSchema = new Schema<IInvoiceData>({
  number: { type: String, required: false },
  date: { type: String, required: true },
  currency: { type: String, default: 'USD' },
  subtotal: { type: Number },
  taxPercent: { type: Number },
  total: { type: Number },
  poNumber: { type: String },
  poDate: { type: String },
  lineItems: [LineItemSchema]
});

const InvoiceSchema = new Schema<IInvoice>({
  fileId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true }, // Vercel Blob URL
  blobName: { type: String, required: true }, // For blob deletion
  fileSize: { type: Number },
  vendor: { type: VendorSchema, required: true },
  invoice: { type: InvoiceDataSchema, required: true },
  extractionStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  extractionModel: { 
    type: String, 
    enum: ['gemini', 'groq', 'mock'] 
  }
}, {
  timestamps: true
});

// Indexes for search functionality
InvoiceSchema.index({ 'vendor.name': 'text', 'invoice.number': 'text' });
InvoiceSchema.index({ fileId: 1 });
InvoiceSchema.index({ createdAt: -1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);