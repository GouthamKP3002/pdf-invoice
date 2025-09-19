// app/dashboard/page.tsx - NOW WITH EXTRACTION
'use client';

import { useState } from 'react';
import { FileText, Upload, Brain, Loader2 } from 'lucide-react';

// Simple upload component with extraction
export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  
  // Extraction state
  const [extracting, setExtracting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'groq'>('gemini');
  const [extractionResult, setExtractionResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
      // Reset previous results when new file selected
      setUploadResult(null);
      setExtractionResult(null);
    } else {
      setError('Please select a PDF file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      console.log('Uploading to:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUploadResult(data);
      console.log('Upload successful:', data);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleExtraction = async () => {
    if (!uploadResult?.data?.fileId) return;

    setExtracting(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: uploadResult.data.fileId,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setExtractionResult(data);
      console.log('Extraction successful:', data);

    } catch (err) {
      console.error('Extraction error:', err);
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  return (
    
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <FileText className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Dashboard</h1>
            <p className="text-gray-600">Upload and extract invoice data</p>
          </div>
            // Add this button to your main dashboard
<button
  onClick={() => window.location.href = '/dashboard/invoices'}
  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
>
  Browse All Invoices 
</button>
          <div className="space-y-8">
            {/* Step 1: File Upload */}
            <div className="border-2 border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Upload PDF</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select PDF File
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {file && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Uploading...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload PDF
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: AI Extraction */}
            {uploadResult && (
              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: AI Extraction</h2>

                <div className="space-y-4">
                  {/* Upload Success Info */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium mb-2">Upload Successful!</p>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>File ID:</strong> {uploadResult.data?.fileId}</p>
                      <p><strong>Invoice ID:</strong> {uploadResult.data?.invoiceId}</p>
                      <p><strong>PDF URL:</strong> <a href={uploadResult.data?.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">View PDF</a></p>
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Choose AI Model
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="gemini"
                          checked={selectedModel === 'gemini'}
                          onChange={(e) => setSelectedModel(e.target.value as 'gemini')}
                          className="mr-2"
                        />
                        <span className="text-sm">Gemini (Google)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="groq"
                          checked={selectedModel === 'groq'}
                          onChange={(e) => setSelectedModel(e.target.value as 'groq')}
                          className="mr-2"
                        />
                        <span className="text-sm">Groq (Fast)</span>
                      </label>
                    </div>
                  </div>

                  {/* Extract Button */}
                  <button
                    onClick={handleExtraction}
                    disabled={extracting}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {extracting ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Extracting with {selectedModel}...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Brain className="h-4 w-4 mr-2" />
                        Extract Data with {selectedModel === 'gemini' ? 'Gemini' : 'Groq'}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Extraction Results */}
            {extractionResult && (
              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Extracted Data</h2>

                <div className="space-y-6">
                  {extractionResult.data?.warning && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 font-medium">Warning</p>
                      <p className="text-yellow-700 text-sm">{extractionResult.data.warning}</p>
                    </div>
                  )}

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium mb-2">Extraction Successful!</p>
                    <p className="text-green-700 text-sm">Model used: {extractionResult.data?.extractionModel}</p>
                  </div>

                  {/* Vendor Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Vendor Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {extractionResult.data?.extractedData?.vendor?.name || 'N/A'}</div>
                      <div><strong>Address:</strong> {extractionResult.data?.extractedData?.vendor?.address || 'N/A'}</div>
                      <div><strong>Tax ID:</strong> {extractionResult.data?.extractedData?.vendor?.taxId || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Invoice Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Invoice Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Number:</strong> {extractionResult.data?.extractedData?.invoice?.number || 'N/A'}</div>
                      <div><strong>Date:</strong> {extractionResult.data?.extractedData?.invoice?.date || 'N/A'}</div>
                      <div><strong>Currency:</strong> {extractionResult.data?.extractedData?.invoice?.currency || 'USD'}</div>
                      <div><strong>Subtotal:</strong> ${extractionResult.data?.extractedData?.invoice?.subtotal || 0}</div>
                      <div><strong>Tax:</strong> {extractionResult.data?.extractedData?.invoice?.taxPercent || 0}%</div>
                      <div><strong>Total:</strong> <span className="text-lg font-semibold">${extractionResult.data?.extractedData?.invoice?.total || 0}</span></div>
                    </div>
                  </div>

                  {/* Line Items */}
                  {extractionResult.data?.extractedData?.invoice?.lineItems?.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
                      <div className="space-y-2">
                        {extractionResult.data.extractedData.invoice.lineItems.map((item: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border text-sm">
                            <div className="font-medium">{item.description}</div>
                            <div className="text-gray-600 mt-1">
                              Qty: {item.quantity} × ${item.unitPrice} = ${item.total}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-medium mb-2">Next Steps:</p>
                    <div className="text-blue-700 text-sm space-y-1">
                      <p>• Data has been saved to the database</p>
                      <p>• You can now edit this data or upload another invoice</p>
                      <p>• Visit the invoices list to manage all your invoices</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">Error:</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Debug Info */}
            <div className="p-4 bg-gray-100 rounded-lg text-xs">
              <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}</p>
              <p><strong>Upload Status:</strong> {uploading ? 'Uploading...' : uploadResult ? 'Complete' : 'Ready'}</p>
              <p><strong>Extract Status:</strong> {extracting ? 'Extracting...' : extractionResult ? 'Complete' : 'Waiting'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}