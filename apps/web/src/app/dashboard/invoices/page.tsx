// app/dashboard/invoices/page.tsx - SIMPLE INVOICE LIST WITH EDIT
'use client';

import { useState, useEffect } from 'react';
import { FileText, Eye, Edit, Trash2, ArrowLeft, Save, X } from 'lucide-react';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch all invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invoices`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setInvoices(data.data.invoices || []);
      console.log('Invoices loaded:', data.data.invoices?.length || 0);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  // Delete invoice
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the list
      await fetchInvoices();
      console.log('Invoice deleted successfully');
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete invoice');
    }
  };

  // Save edited invoice
  const saveInvoice = async () => {
    if (!editingInvoice) return;

    try {
      setSaving(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invoices/${editingInvoice._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor: editingInvoice.vendor,
            invoice: editingInvoice.invoice,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Invoice updated successfully:', result);

      // Update the local state
      setInvoices(prev => 
        prev.map(inv => inv._id === editingInvoice._id ? result.data : inv)
      );
      
      setEditingInvoice(null);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  // Load invoices on component mount
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Update editing invoice field
  const updateField = (section: 'vendor' | 'invoice', field: string, value: any) => {
    if (!editingInvoice) return;
    
    setEditingInvoice(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value,
      },
    }));
  };

  // Update line item
  const updateLineItem = (index: number, field: string, value: any) => {
    if (!editingInvoice) return;
    
    const updatedLineItems = [...editingInvoice.invoice.lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value,
    };
    
    // Recalculate total for this line item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedLineItems[index].total = updatedLineItems[index].quantity * updatedLineItems[index].unitPrice;
    }
    
    // Recalculate invoice totals
    const subtotal = updatedLineItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + (subtotal * (editingInvoice.invoice.taxPercent / 100));
    
    setEditingInvoice(prev => ({
      ...prev!,
      invoice: {
        ...prev!.invoice,
        lineItems: updatedLineItems,
        subtotal,
        total,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  // Edit Mode
  if (editingInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <button 
                  onClick={() => setEditingInvoice(null)}
                  className="mr-4 p-2 hover:bg-gray-100 rounded"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2 inline" />
                  Cancel
                </button>
                <button
                  onClick={saveInvoice}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2 inline" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Vendor Information */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Vendor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editingInvoice.vendor.name}
                      onChange={(e) => updateField('vendor', 'name', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                    <input
                      type="text"
                      value={editingInvoice.vendor.taxId}
                      onChange={(e) => updateField('vendor', 'taxId', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={editingInvoice.vendor.address}
                      onChange={(e) => updateField('vendor', 'address', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={editingInvoice.invoice.number}
                      onChange={(e) => updateField('invoice', 'number', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={editingInvoice.invoice.date}
                      onChange={(e) => updateField('invoice', 'date', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <input
                      type="text"
                      value={editingInvoice.invoice.currency}
                      onChange={(e) => updateField('invoice', 'currency', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Percent</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingInvoice.invoice.taxPercent}
                      onChange={(e) => updateField('invoice', 'taxPercent', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                    <input
                      type="text"
                      value={editingInvoice.invoice.poNumber}
                      onChange={(e) => updateField('invoice', 'poNumber', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PO Date</label>
                    <input
                      type="date"
                      value={editingInvoice.invoice.poDate}
                      onChange={(e) => updateField('invoice', 'poDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Line Items</h3>
                <div className="space-y-4">
                  {editingInvoice.invoice.lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div className="md:col-span-4 text-right">
                        <span className="font-semibold">Total: ${item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Invoice Totals */}
                <div className="mt-6 p-4 bg-blue-50 rounded">
                  <div className="text-right space-y-2">
                    <div>Subtotal: <span className="font-semibold">${editingInvoice.invoice.subtotal.toFixed(2)}</span></div>
                    <div>Tax ({editingInvoice.invoice.taxPercent}%): <span className="font-semibold">${((editingInvoice.invoice.subtotal * editingInvoice.invoice.taxPercent) / 100).toFixed(2)}</span></div>
                    <div className="text-lg">Total: <span className="font-bold">${editingInvoice.invoice.total.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List Mode
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="mr-4 p-2 hover:bg-gray-100 rounded"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">All Invoices</h1>
                  <p className="text-gray-600">{invoices.length} invoices found</p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload New PDF
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-600 mb-6">Upload your first PDF invoice to get started</p>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Upload PDF
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Vendor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Invoice #</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Total</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{invoice.vendor.name || 'Unknown Vendor'}</p>
                            <p className="text-sm text-gray-600 truncate max-w-[200px]">{invoice.fileName}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{invoice.invoice.number || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {invoice.invoice.date ? new Date(invoice.invoice.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-semibold">${invoice.invoice.total?.toFixed(2) || '0.00'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            invoice.extractionStatus === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.extractionStatus === 'completed' ? 'Extracted' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => window.open(invoice.fileUrl, '_blank')}
                              className="p-2 hover:bg-gray-100 rounded"
                              title="View PDF"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingInvoice(invoice)}
                              className="p-2 hover:bg-gray-100 rounded"
                              title="Edit Invoice"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteInvoice(invoice._id, invoice.invoice.number)}
                              className="p-2 hover:bg-gray-100 rounded text-red-600"
                              title="Delete Invoice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}