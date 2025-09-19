// components/extraction-panel.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Brain, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { apiClient, handleApiError } from '@/lib/api';
import type { AIModel, ExtractionResponse } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExtractionPanelProps {
  fileId: string;
  fileName: string;
  onExtractionSuccess: (data: ExtractionResponse['data']) => void;
  extractionStatus?: 'pending' | 'completed' | 'failed';
  currentModel?: string;
  className?: string;
}

export function ExtractionPanel({
  fileId,
  fileName,
  onExtractionSuccess,
  extractionStatus = 'pending',
  currentModel,
  className
}: ExtractionPanelProps) {
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini');
  const queryClient = useQueryClient();

  const extractMutation = useMutation({
    mutationFn: (model: AIModel) => apiClient.extractData(fileId, model),
    onSuccess: (response) => {
      toast.success(
        response.data.warning 
          ? 'PDF processed with fallback data'
          : 'Data extracted successfully!'
      );
      onExtractionSuccess(response.data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoice', fileId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast.error(`Extraction failed: ${errorMessage}`);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (model: AIModel) => apiClient.retryExtraction(fileId, model),
    onSuccess: (response) => {
      toast.success(
        response.data.warning 
          ? 'Retry completed with fallback data'
          : 'Data re-extracted successfully!'
      );
      onExtractionSuccess(response.data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoice', fileId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast.error(`Retry failed: ${errorMessage}`);
    },
  });

  const handleExtract = () => {
    extractMutation.mutate(selectedModel);
  };

  const handleRetry = () => {
    retryMutation.mutate(selectedModel);
  };

  const isLoading = extractMutation.isPending || retryMutation.isPending;
  const isCompleted = extractionStatus === 'completed';
  const hasFailed = extractionStatus === 'failed';

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary" />
          <span>AI Data Extraction</span>
          {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
          {hasFailed && <XCircle className="h-5 w-5 text-red-500" />}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* File Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
          <p className="text-xs text-gray-600 mt-1">
            Status: {extractionStatus === 'pending' && 'Ready for extraction'}
            {extractionStatus === 'completed' && `Extracted with ${currentModel || 'AI'}`}
            {extractionStatus === 'failed' && 'Extraction failed'}
          </p>
        </div>

        {/* Model Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Choose AI Model</Label>
          
          <div className="grid grid-cols-2 gap-3">
            <div 
              className={cn(
                "relative p-3 border rounded-lg cursor-pointer transition-all",
                selectedModel === 'gemini' 
                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => setSelectedModel('gemini')}
            >
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2",
                  selectedModel === 'gemini'
                    ? "border-primary bg-primary"
                    : "border-gray-300"
                )} />
                <div>
                  <p className="text-sm font-medium">Gemini</p>
                  <p className="text-xs text-gray-600">Google's AI model</p>
                </div>
              </div>
              {selectedModel === 'gemini' && (
                <Sparkles className="absolute top-2 right-2 h-4 w-4 text-primary" />
              )}
            </div>

            <div 
              className={cn(
                "relative p-3 border rounded-lg cursor-pointer transition-all",
                selectedModel === 'groq' 
                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => setSelectedModel('groq')}
            >
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2",
                  selectedModel === 'groq'
                    ? "border-primary bg-primary"
                    : "border-gray-300"
                )} />
                <div>
                  <p className="text-sm font-medium">Groq</p>
                  <p className="text-xs text-gray-600">Fast inference</p>
                </div>
              </div>
              {selectedModel === 'groq' && (
                <Sparkles className="absolute top-2 right-2 h-4 w-4 text-primary" />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isCompleted ? (
            <Button 
              onClick={handleExtract}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting Data...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Extract with {selectedModel === 'gemini' ? 'Gemini' : 'Groq'}
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleRetry}
              disabled={isLoading}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-extracting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-extract with {selectedModel === 'gemini' ? 'Gemini' : 'Groq'}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Status Messages */}
        {isCompleted && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 text-green-800 rounded-lg">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Extraction completed!</p>
              <p>Data extracted using {currentModel || 'AI'} and ready for editing.</p>
            </div>
          </div>
        )}

        {hasFailed && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-800 rounded-lg">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Extraction failed</p>
              <p>Try using a different AI model or check the PDF quality.</p>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Extraction Tips:</p>
              <ul className="space-y-1 text-blue-700 text-xs">
                <li>• Gemini works well with complex layouts</li>
                <li>• Groq provides faster processing</li>
                <li>• Clear, readable PDFs give better results</li>
                <li>• You can always re-extract with a different model</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}