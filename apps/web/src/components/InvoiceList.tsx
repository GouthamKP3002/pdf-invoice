// components/InvoiceList.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileText, Eye, Edit, Trash2, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface InvoiceListProps {
  onEdit?: (invoice: Invoice) => void;
}

export default function InvoiceList({ onEdit }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invoices`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.status}`);
      }

      const data = await response.json();
      const invoicesList = data.data.invoices || [];
      setInvoices(invoicesList);
      setFilteredInvoices(invoicesList);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This will also delete the PDF file.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invoices/${invoiceId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      await fetchInvoices(); // Refresh the list
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete invoice');
    }
  };

  // Filter invoices based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(
        (invoice) =>
          invoice.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInvoices(filtered);
    }
  }, [searchTerm, invoices]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {filteredInvoices.length} of {invoices.length} invoices
          </p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard'}>
          <Plus className="h-4 w-4 mr-2" />
          Upload New PDF
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by vendor name, invoice number, or filename..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Invoice Grid */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No matching invoices found' : 'No invoices yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Upload your first PDF invoice to get started'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => window.location.href = '/dashboard'}>
                <Plus className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {invoice.vendor.name || 'Unknown Vendor'}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Invoice #{invoice.invoice.number || 'N/A'}
                    </p>
                  </div>
                  <Badge 
                    variant={invoice.extractionStatus === 'completed' ? 'default' : 'secondary'}
                  >
                    {invoice.extractionStatus === 'completed' ? 'Extracted' : 'Pending'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Invoice Details */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>
                        {invoice.invoice.date 
                          ? new Date(invoice.invoice.date).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold">
                        ${invoice.invoice.total?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency:</span>
                      <span>{invoice.invoice.currency || 'USD'}</span>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="text-xs text-gray-500 border-t pt-2">
                    <p className="truncate" title={invoice.fileName}>
                      📄 {invoice.fileName}
                    </p>
                    <p>
                      Uploaded: {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                    {invoice.extractionModel && (
                      <p>Model: {invoice.extractionModel}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invoice.fileUrl, '_blank')}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit?.(invoice)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteInvoice(invoice._id, invoice.invoice.number)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}