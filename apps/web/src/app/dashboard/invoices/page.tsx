// app/dashboard/invoices/page.tsx - UPDATED WITH SPLIT SCREEN SUPPORT
'use client';

import { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InvoiceList from '@/components/InvoiceList';
import PDFViewer from '@/components/PDFViewer';
import ExtractionForm from '@/components/ExtractionForm';

interface Invoice {
  _id: string;
  fileId: string;
  fileName: string;
  fileUrl: string;
  vendor: {
    name: string;
    address: string;
    taxId: string;
  };
  invoice: {
    number: string;
    date: string;
    currency: string;
    subtotal: number;
    taxPercent: number;
    total: number;
    poNumber: string;
    poDate: string;
    lineItems: Array<{
      description: string;
      unitPrice: number;
      quantity: number;
      total: number;
    }>;
  };
  extractionStatus: string;
  extractionModel: string;
  createdAt: string;
}

export default function InvoicesPage() {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
  };

  const handleBackToList = () => {
    setEditingInvoice(null);
  };

  const handleDataSaved = (data: any) => {
    // Update the editing invoice with saved data
    if (editingInvoice && data) {
      setEditingInvoice({ ...editingInvoice, ...data });
    }
  };

  const handleDataDeleted = () => {
    // Go back to list after deletion
    setEditingInvoice(null);
  };

  // List View - Show all invoices in a grid
  if (!editingInvoice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/dashboard'}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-lg font-semibold text-gray-900">All Invoices</h1>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-8">
          <InvoiceList onEdit={handleEdit} />
        </div>
      </div>
    );
  }

  // Split Screen Edit View - PDF Viewer + Form
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={handleBackToList}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Edit Invoice: {editingInvoice.invoice.number || 'Unknown'}
              </h1>
              <p className="text-sm text-gray-600">
                {editingInvoice.vendor.name || 'Unknown Vendor'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={handleBackToList}
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Split Screen Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - PDF Viewer */}
        <div className="w-1/2 border-r border-gray-200">
          <PDFViewer 
            fileUrl={editingInvoice.fileUrl}
            fileName={editingInvoice.fileName}
          />
        </div>

        {/* Right Panel - Extraction Form */}
        <div className="w-1/2">
          <ExtractionForm
            fileId={editingInvoice.fileId}
            initialData={{
              vendor: editingInvoice.vendor,
              invoice: editingInvoice.invoice,
            }}
            onDataSaved={handleDataSaved}
            onDataDeleted={handleDataDeleted}
            invoiceId={editingInvoice._id}
          />
        </div>
      </div>
    </div>
  );
}