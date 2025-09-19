// components/pdf-upload.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient, handleApiError } from '@/lib/api';
import { validatePDFFile, formatFileSize } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PDFUploadProps {
  onUploadSuccess: (data: {
    fileId: string;
    fileName: string;
    fileUrl: string;
    invoiceId: string;
  }) => void;
  className?: string;
}

export function PDFUpload({ onUploadSuccess, className }: PDFUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: apiClient.uploadPDF,
    onSuccess: (response) => {
      toast.success('PDF uploaded successfully!');
      onUploadSuccess({
        fileId: response.data.fileId,
        fileName: response.data.fileName,
        fileUrl: response.data.fileUrl,
        invoiceId: response.data.invoiceId,
      });
      setSelectedFile(null);
      setUploadProgress(0);
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast.error(`Upload failed: ${errorMessage}`);
      setUploadProgress(0);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validatePDFFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    disabled: uploadMutation.isPending,
  });

  const handleUpload = () => {
    if (!selectedFile) return;

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    uploadMutation.mutate(selectedFile);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <Card>
        <CardContent className="p-6">
          {!selectedFile ? (
            // Upload area
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50',
                uploadMutation.isPending && 'pointer-events-none opacity-50'
              )}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {isDragActive ? 'Drop your PDF here' : 'Upload PDF Invoice'}
                  </h3>
                  <p className="text-gray-600">
                    Drag and drop your PDF file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Maximum file size: 25MB
                  </p>
                </div>

                <Button type="button" variant="outline" disabled={uploadMutation.isPending}>
                  Choose File
                </Button>
              </div>
            </div>
          ) : (
            // File preview and upload
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                
                {!uploadMutation.isPending && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadMutation.isError && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Upload failed. Please try again.</span>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload PDF'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleRemoveFile}
                  disabled={uploadMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Upload guidelines */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Upload Guidelines:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Only PDF files are supported</li>
                  <li>• Maximum file size is 25MB</li>
                  <li>• Clear, readable invoices work best for AI extraction</li>
                  <li>• Scanned documents should have good image quality</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}