// components/ExtractionForm.tsx
'use client';
import * as React from 'react';
import { useState } from 'react';
import { Brain, Save, Trash2, Plus, Minus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LineItem {
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

interface ExtractedData {
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
    lineItems: LineItem[];
  };
}

interface ExtractionFormProps {
  fileId?: string;
  initialData?: ExtractedData;
  onDataExtracted?: (data: unknown) => void;
  onDataSaved?: (data: unknown) => void;
  onDataDeleted?: () => void;
  invoiceId?: string;
}

export default function ExtractionForm({ 
  fileId, 
  initialData, 
  onDataExtracted, 
  onDataSaved, 
  onDataDeleted,
  invoiceId
}: ExtractionFormProps) {
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'groq'>('gemini');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<ExtractedData>(
    initialData || {
      vendor: { name: '', address: '', taxId: '' },
      invoice: {
        number: '',
        date: '',
        currency: 'USD',
        subtotal: 0,
        taxPercent: 0,
        total: 0,
        poNumber: '',
        poDate: '',
        lineItems: []
      }
    }
  );

  // Update form data when initialData changes, ensuring no undefined values
  React.useEffect(() => {
    if (initialData) {
      setFormData({
        vendor: {
          name: initialData.vendor?.name || '',
          address: initialData.vendor?.address || '',
          taxId: initialData.vendor?.taxId || '',
        },
        invoice: {
          number: initialData.invoice?.number || '',
          date: initialData.invoice?.date || '',
          currency: initialData.invoice?.currency || 'USD',
          subtotal: initialData.invoice?.subtotal || 0,
          taxPercent: initialData.invoice?.taxPercent || 0,
          total: initialData.invoice?.total || 0,
          poNumber: initialData.invoice?.poNumber || '',
          poDate: initialData.invoice?.poDate || '',
          lineItems: initialData.invoice?.lineItems || []
        }
      });
    }
  }, [initialData]);

  const handleExtraction = async () => {
    if (!fileId) return;

    setExtracting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, model: selectedModel }),
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.data?.extractedData) {
        setFormData(result.data.extractedData);
        setSuccess(`Data extracted successfully using ${selectedModel}`);
        onDataExtracted?.(result.data);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = invoiceId 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invoices/${invoiceId}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/invoices`;
      
      const method = invoiceId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          vendor: formData.vendor,
          invoice: formData.invoice,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }

      const result = await response.json();
      setSuccess('Invoice data saved successfully');
      onDataSaved?.(result.data);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!invoiceId) return;
    
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
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

      setSuccess('Invoice deleted successfully');
      onDataDeleted?.();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const updateVendorField = (field: keyof typeof formData.vendor, value: string) => {
    setFormData(prev => ({
      ...prev,
      vendor: { ...prev.vendor, [field]: value }
    }));
  };

  const updateInvoiceField = (field: keyof typeof formData.invoice, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      invoice: { ...prev.invoice, [field]: value }
    }));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: unknown) => {
    const updatedLineItems = [...formData.invoice.lineItems];
    updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };
    
    // Recalculate total for this line item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedLineItems[index].total = updatedLineItems[index].quantity * updatedLineItems[index].unitPrice;
    }
    
    // Recalculate invoice totals
    const subtotal = updatedLineItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + (subtotal * (formData.invoice.taxPercent / 100));
    
    setFormData(prev => ({
      ...prev,
      invoice: {
        ...prev.invoice,
        lineItems: updatedLineItems,
        subtotal,
        total,
      }
    }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      invoice: {
        ...prev.invoice,
        lineItems: [...prev.invoice.lineItems, { description: '', unitPrice: 0, quantity: 1, total: 0 }]
      }
    }));
  };

  const removeLineItem = (index: number) => {
    const updatedLineItems = formData.invoice.lineItems.filter((_, i) => i !== index);
    const subtotal = updatedLineItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + (subtotal * (formData.invoice.taxPercent / 100));
    
    setFormData(prev => ({
      ...prev,
      invoice: {
        ...prev.invoice,
        lineItems: updatedLineItems,
        subtotal,
        total,
      }
    }));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Invoice Data</h2>
          <div className="flex items-center space-x-2">
            {invoiceId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* AI Extraction Section */}
        {fileId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Data Extraction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="model">Choose AI Model</Label>
                <Select value={selectedModel} onValueChange={(value: 'gemini' | 'groq') => setSelectedModel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini (Google)</SelectItem>
                    <SelectItem value="groq">Groq (Fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleExtraction}
                disabled={extracting}
                className="w-full"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting with {selectedModel}...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Extract Data with {selectedModel === 'gemini' ? 'Gemini' : 'Groq'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Vendor Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="vendor-name">Vendor Name</Label>
              <Input
                id="vendor-name"
                value={formData.vendor.name}
                onChange={(e) => updateVendorField('name', e.target.value)}
                placeholder="Enter vendor name"
              />
            </div>
            
            <div>
              <Label htmlFor="vendor-address">Address</Label>
              <Textarea
                id="vendor-address"
                value={formData.vendor.address}
                onChange={(e) => updateVendorField('address', e.target.value)}
                placeholder="Enter vendor address"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="vendor-tax-id">Tax ID</Label>
              <Input
                id="vendor-tax-id"
                value={formData.vendor.taxId}
                onChange={(e) => updateVendorField('taxId', e.target.value)}
                placeholder="Enter tax ID"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-number">Invoice Number</Label>
                <Input
                  id="invoice-number"
                  value={formData.invoice.number}
                  onChange={(e) => updateInvoiceField('number', e.target.value)}
                  placeholder="INV-001"
                />
              </div>
              
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={formData.invoice.date}
                  onChange={(e) => updateInvoiceField('date', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.invoice.currency}
                  onChange={(e) => updateInvoiceField('currency', e.target.value)}
                  placeholder="USD"
                />
              </div>
              
              <div>
                <Label htmlFor="tax-percent">Tax Percent</Label>
                <Input
                  id="tax-percent"
                  type="number"
                  step="0.01"
                  value={formData.invoice.taxPercent}
                  onChange={(e) => updateInvoiceField('taxPercent', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="po-number">PO Number</Label>
                <Input
                  id="po-number"
                  value={formData.invoice.poNumber}
                  onChange={(e) => updateInvoiceField('poNumber', e.target.value)}
                  placeholder="PO-001"
                />
              </div>
              
              <div>
                <Label htmlFor="po-date">PO Date</Label>
                <Input
                  id="po-date"
                  type="date"
                  value={formData.invoice.poDate}
                  onChange={(e) => updateInvoiceField('poDate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Line Items</CardTitle>
              <Button
                size="sm"
                onClick={addLineItem}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.invoice.lineItems.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Item {index + 1}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label htmlFor={`item-desc-${index}`}>Description</Label>
                    <Input
                      id={`item-desc-${index}`}
                      value={item.description || ''}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`item-qty-${index}`}>Quantity</Label>
                    <Input
                      id={`item-qty-${index}`}
                      type="number"
                      value={item.quantity || 0}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`item-price-${index}`}>Unit Price</Label>
                    <Input
                      id={`item-price-${index}`}
                      type="number"
                      step="0.01"
                      value={item.unitPrice || 0}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="font-semibold">Total: ${(item.total || 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
            
            {formData.invoice.lineItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No line items added yet</p>
                <Button
                  variant="outline"
                  onClick={addLineItem}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Item
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Totals */}
    <Card>
  <CardHeader>
    <CardTitle className="text-base">Invoice Totals</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2 text-right">
      <div className="flex justify-between">
        <span>Subtotal:</span>
        <span className="font-medium">${(formData.invoice.subtotal || 0).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tax ({formData.invoice.taxPercent || 0}%):</span>
        <span className="font-medium">${(((formData.invoice.subtotal || 0) * (formData.invoice.taxPercent || 0)) / 100).toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-lg font-bold border-t pt-2">
        <span>Total:</span>
        <span>${(formData.invoice.total || 0).toFixed(2)}</span>
      </div>
    </div>
  </CardContent>
</Card>
      </div>
    </div>
  );
}