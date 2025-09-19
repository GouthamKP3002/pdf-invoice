// components/invoice-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Save,
  Plus,
  Trash2,
  Building,
  FileText,
  DollarSign,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, handleApiError } from '@/lib/api';
import type { Invoice, Vendor, InvoiceData, LineItem } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

// Validation schema
const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  total: z.number().min(0, 'Total must be positive'),
});

const invoiceFormSchema = z.object({
  vendor: z.object({
    name: z.string().min(1, 'Vendor name is required'),
    address: z.string().optional().or(z.literal('')),
    taxId: z.string().optional().or(z.literal('')),
  }),
  invoice: z.object({
    number: z.string().min(1, 'Invoice number is required'),
    date: z.string().min(1, 'Invoice date is required'),
    currency: z.string().min(1, 'Currency is required').default('USD'),
    subtotal: z.number().min(0, 'Subtotal must be positive').default(0),
    taxPercent: z.number().min(0).max(100, 'Tax percent must be between 0-100').default(0),
    total: z.number().min(0, 'Total must be positive').default(0),
    poNumber: z.string().optional().or(z.literal('')),
    poDate: z.string().optional().or(z.literal('')),
    lineItems: z.array(lineItemSchema).default([]),
  }),
});

type FormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  invoiceId: string;
  initialData?: {
    vendor: Vendor;
    invoice: InvoiceData;
  };
  onSaveSuccess?: (updatedInvoice: Invoice) => void;
  className?: string;
}

export function InvoiceForm({
  invoiceId,
  initialData,
  onSaveSuccess,
  className
}: InvoiceFormProps) {
  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(invoiceFormSchema),
    mode: 'onChange',
    defaultValues: {
      vendor: {
        name: initialData?.vendor.name || '',
        address: initialData?.vendor.address || '',
        taxId: initialData?.vendor.taxId || '',
      },
      invoice: {
        number: initialData?.invoice.number || '',
        date: initialData?.invoice.date || new Date().toISOString().split('T')[0],
        currency: initialData?.invoice.currency || 'USD',
        subtotal: initialData?.invoice.subtotal || 0,
        taxPercent: initialData?.invoice.taxPercent || 0,
        total: initialData?.invoice.total || 0,
        poNumber: initialData?.invoice.poNumber || '',
        poDate: initialData?.invoice.poDate || '',
        lineItems: initialData?.invoice.lineItems || [],
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'invoice.lineItems',
  });

  const watchedLineItems = form.watch('invoice.lineItems');
  const watchedTaxPercent = form.watch('invoice.taxPercent');

  // Auto-calculate totals
  useEffect(() => {
    const lineItems = watchedLineItems || [];
    const subtotal = lineItems.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
      return sum + itemTotal;
    }, 0);

    const taxAmount = subtotal * ((watchedTaxPercent || 0) / 100);
    const total = subtotal + taxAmount;

    form.setValue('invoice.subtotal', subtotal);
    form.setValue('invoice.total', total);

    // Update individual line item totals
    lineItems.forEach((item, index) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
      if (item.total !== itemTotal) {
        form.setValue(`invoice.lineItems.${index}.total`, itemTotal);
      }
    });
  }, [watchedLineItems, watchedTaxPercent, form]);

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [form]);

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => apiClient.updateInvoice(invoiceId, data),
    onSuccess: (response) => {
      toast.success('Invoice updated successfully!');
      setIsDirty(false);
      onSaveSuccess?.(response.data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast.error(`Update failed: ${errorMessage}`);
    },
  });

  const onSubmit = (data: any) => {
    // Clean up empty strings to undefined for optional fields
    const cleanedData: FormData = {
      vendor: {
        name: data.vendor.name,
        address: data.vendor.address || undefined,
        taxId: data.vendor.taxId || undefined,
      },
      invoice: {
        number: data.invoice.number,
        date: data.invoice.date,
        currency: data.invoice.currency,
        subtotal: data.invoice.subtotal,
        taxPercent: data.invoice.taxPercent,
        total: data.invoice.total,
        poNumber: data.invoice.poNumber || undefined,
        poDate: data.invoice.poDate || undefined,
        lineItems: data.invoice.lineItems,
      },
    };
    updateMutation.mutate(cleanedData);
  };

  const addLineItem = () => {
    append({
      description: '',
      unitPrice: 0,
      quantity: 1,
      total: 0,
    });
  };

  const removeLineItem = (index: number) => {
    remove(index);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Vendor Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <span>Vendor Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="vendor.name">Vendor Name *</Label>
                <Input
                  id="vendor.name"
                  {...form.register('vendor.name')}
                  className={form.formState.errors.vendor?.name ? 'border-red-500' : ''}
                />
                {form.formState.errors.vendor?.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vendor.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vendor.address">Address</Label>
                <Input
                  id="vendor.address"
                  {...form.register('vendor.address')}
                  placeholder="Vendor address"
                />
              </div>

              <div>
                <Label htmlFor="vendor.taxId">Tax ID</Label>
                <Input
                  id="vendor.taxId"
                  {...form.register('vendor.taxId')}
                  placeholder="Tax identification number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Invoice Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice.number">Invoice Number *</Label>
                <Input
                  id="invoice.number"
                  {...form.register('invoice.number')}
                  className={form.formState.errors.invoice?.number ? 'border-red-500' : ''}
                />
                {form.formState.errors.invoice?.number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.invoice.number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="invoice.date">Invoice Date *</Label>
                <Input
                  id="invoice.date"
                  type="date"
                  {...form.register('invoice.date')}
                  className={form.formState.errors.invoice?.date ? 'border-red-500' : ''}
                />
                {form.formState.errors.invoice?.date && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.invoice.date.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="invoice.currency">Currency</Label>
                <Input
                  id="invoice.currency"
                  {...form.register('invoice.currency')}
                  placeholder="USD"
                />
              </div>

              <div>
                <Label htmlFor="invoice.taxPercent">Tax Percent (%)</Label>
                <Input
                  id="invoice.taxPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...form.register('invoice.taxPercent', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="invoice.poNumber">PO Number</Label>
                <Input
                  id="invoice.poNumber"
                  {...form.register('invoice.poNumber')}
                  placeholder="Purchase order number"
                />
              </div>

              <div>
                <Label htmlFor="invoice.poDate">PO Date</Label>
                <Input
                  id="invoice.poDate"
                  type="date"
                  {...form.register('invoice.poDate')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span>Line Items</span>
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium">No line items</p>
                <p className="text-sm mb-4">Add items to build your invoice</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLineItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Item {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <Label htmlFor={`lineItem.${index}.description`}>Description</Label>
                        <Input
                          id={`lineItem.${index}.description`}
                          {...form.register(`invoice.lineItems.${index}.description`)}
                          placeholder="Item description"
                        />
                        {form.formState.errors.invoice?.lineItems?.[index]?.description && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.invoice.lineItems[index]?.description?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`lineItem.${index}.unitPrice`}>Unit Price</Label>
                        <Input
                          id={`lineItem.${index}.unitPrice`}
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(`invoice.lineItems.${index}.unitPrice`, { 
                            valueAsNumber: true 
                          })}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`lineItem.${index}.quantity`}>Quantity</Label>
                        <Input
                          id={`lineItem.${index}.quantity`}
                          type="number"
                          min="1"
                          {...form.register(`invoice.lineItems.${index}.quantity`, { 
                            valueAsNumber: true 
                          })}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="text-right">
                        <Label className="text-sm text-gray-600">Total</Label>
                        <p className="text-lg font-semibold">
                          {formatCurrency(form.watch(`invoice.lineItems.${index}.total`) || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(form.watch('invoice.subtotal') || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({form.watch('invoice.taxPercent') || 0}%):</span>
                <span className="font-medium">
                  {formatCurrency(
                    ((form.watch('invoice.subtotal') || 0) * (form.watch('invoice.taxPercent') || 0)) / 100
                  )}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(form.watch('invoice.total') || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isDirty && (
              <div className="flex items-center space-x-1 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">You have unsaved changes</span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={updateMutation.isPending || !isDirty}
            className="flex items-center space-x-2"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}