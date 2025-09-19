// types/index.ts

export interface LineItem {
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Vendor {
  name: string;
  address?: string;
  taxId?: string;
}

export interface InvoiceData {
  number: string;
  date: string;
  currency?: string;
  subtotal?: number;
  taxPercent?: number;
  total?: number;
  poNumber?: string;
  poDate?: string;
  lineItems: LineItem[];
}

export interface Invoice {
  _id: string;
  fileId: string;
  fileName: string;
  fileUrl: string;
  blobName: string;
  fileSize?: number;
  vendor: Vendor;
  invoice: InvoiceData;
  extractionStatus: 'pending' | 'completed' | 'failed';
  extractionModel?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    fileId: string;
    fileName: string;
    fileUrl: string;
    blobName: string;
    fileSize: number;
    invoiceId: string;
    uploadedAt: string;
    nextSteps: {
      extract: string;
      view: string;
      pdfUrl: string;
    };
  };
}

export interface ExtractionResponse {
  success: boolean;
  message: string;
  data: {
    fileId: string;
    fileName: string;
    fileUrl: string;
    extractionModel: string;
    extractedData: {
      vendor: Vendor;
      invoice: InvoiceData;
    };
    invoiceId: string;
    status: string;
    warning?: string;
  };
}

export interface InvoiceListResponse {
  success: boolean;
  data: {
    invoices: Invoice[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalRecords: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface ApiError {
  success: false;
  error: string;
  details?: string;
}

export type AIModel = 'gemini' | 'groq';