// app/dashboard/page.tsx - SPLIT SCREEN LAYOUT
'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PDFViewer from '@/components/PDFViewer';
import ExtractionForm from '@/components/ExtractionForm';

interface UploadResult {
  fileId: string;
  invoiceId: string;
  fileName: string;
  fileUrl: string;
}

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [extractionData, setExtractionData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      if (selectedFile.size > 25 * 1024 * 1024) { // 25MB limit
        setError('File size must be less than 25MB');
        return;
      }
      setFile(selectedFile);
      setError('');
      // Reset previous results when new file selected
      setUploadResult(null);
      setExtractionData(null);
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      setUploadResult({
        fileId: data.data.fileId,
        invoiceId: data.data.invoiceId,
        fileName: data.data.fileName || file.name,
        fileUrl: data.data.fileUrl,
      });
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDataExtracted = (data: unknown) => {
    setExtractionData(data);
  };

  const handleDataSaved = (data: unknown) => {
    // Handle successful save - could show notification or update state
    console.log('Data saved successfully:', data);
  };

  const handleDataDeleted = () => {
    // Handle successful deletion - reset state and go back to upload
    setUploadResult(null);
    setExtractionData(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNewUpload = () => {
    setFile(null);
    setUploadResult(null);
    setExtractionData(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload State - Show file upload interface
  if (!uploadResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Button
                  variant="ghost"
                  onClick={() => window.location.href = '/dashboard/invoices'}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Browse Invoices
                </Button>
                <div className="flex-1">
                  <FileText className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <h1 className="text-2xl font-bold text-gray-900">Upload PDF Invoice</h1>
                  <p className="text-gray-600">Upload a PDF file to extract invoice data</p>
                </div>
              </div>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer block"
                  >
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF files up to 25MB
                    </p>
                  </label>
                </div>

                {/* Selected File Info */}
                {file && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-600 mr-3" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full py-3"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Split Screen Layout - PDF Viewer + Extraction Form
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/dashboard/invoices'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Browse Invoices
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold text-gray-900">PDF Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleNewUpload}
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              New Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Split Screen Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - PDF Viewer */}
        <div className="w-1/2 border-r border-gray-200">
          <PDFViewer 
            fileUrl={uploadResult.fileUrl}
            fileName={uploadResult.fileName}
          />
        </div>

        {/* Right Panel - Extraction Form */}
        <div className="w-1/2">
          <ExtractionForm
            fileId={uploadResult.fileId}
            initialData={extractionData?.extractedData}
            onDataExtracted={handleDataExtracted}
            onDataSaved={handleDataSaved}
            onDataDeleted={handleDataDeleted}
            invoiceId={uploadResult.invoiceId}
          />
        </div>
      </div>
    </div>
  );
}