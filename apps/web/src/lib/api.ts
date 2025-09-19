// lib/api.ts
import axios from 'axios';
import type { 
  UploadResponse, 
  ExtractionResponse, 
  Invoice, 
  InvoiceListResponse, 
  AIModel,
  ApiError 
} from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Upload PDF file
  uploadPDF: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await api.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Extract data from PDF
  extractData: async (fileId: string, model: AIModel): Promise<ExtractionResponse> => {
    const response = await api.post<ExtractionResponse>('/extract', {
      fileId,
      model,
    });

    return response.data;
  },

  // Get extraction status
  getExtractionStatus: async (fileId: string): Promise<ExtractionResponse> => {
    const response = await api.get<ExtractionResponse>(`/extract/${fileId}`);
    return response.data;
  },

  // Retry extraction with different model
  retryExtraction: async (fileId: string, model: AIModel): Promise<ExtractionResponse> => {
    const response = await api.post<ExtractionResponse>(`/extract/retry/${fileId}`, {
      model,
    });

    return response.data;
  },

  // Get all invoices with pagination and search
  getInvoices: async (page = 1, limit = 10, search = ''): Promise<InvoiceListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { q: search }),
    });

    const response = await api.get<InvoiceListResponse>(`/invoices?${params}`);
    return response.data;
  },

  // Get single invoice
  getInvoice: async (id: string): Promise<{ success: true; data: Invoice }> => {
    const response = await api.get<{ success: true; data: Invoice }>(`/invoices/${id}`);
    return response.data;
  },

  // Update invoice
  updateInvoice: async (
    id: string, 
    data: { vendor?: Partial<Invoice['vendor']>; invoice?: Partial<Invoice['invoice']> }
  ): Promise<{ success: true; message: string; data: Invoice }> => {
    const response = await api.put<{ success: true; message: string; data: Invoice }>(
      `/invoices/${id}`,
      data
    );
    return response.data;
  },

  // Delete invoice
  deleteInvoice: async (id: string): Promise<{ success: true; message: string }> => {
    const response = await api.delete<{ success: true; message: string }>(`/invoices/${id}`);
    return response.data;
  },

  // Create invoice manually (rarely used, since upload creates it automatically)
  createInvoice: async (data: {
    fileId: string;
    fileName: string;
    fileUrl: string;
    blobName: string;
    fileSize?: number;
  }): Promise<{ success: true; message: string; data: Invoice }> => {
    const response = await api.post<{ success: true; message: string; data: Invoice }>(
      '/invoices',
      data
    );
    return response.data;
  },
};

// Error handler utility
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};