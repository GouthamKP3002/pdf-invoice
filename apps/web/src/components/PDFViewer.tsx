// components/PDFViewer.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, Download } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
}

export default function PDFViewer({ fileUrl, fileName }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPDF();
  }, [fileUrl]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
  }, [pdfDoc, currentPage, scale, rotation]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load PDF.js from CDN instead of npm module to avoid build issues
      if (typeof window !== 'undefined') {
        // Check if PDF.js is already loaded
        if (!(window as any).pdfjsLib) {
          // Load PDF.js script dynamically
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            // Set worker source after PDF.js is loaded
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            loadPDFDocument();
          };
          script.onerror = () => {
            setError('Failed to load PDF.js library');
            setLoading(false);
          };
          document.head.appendChild(script);
        } else {
          loadPDFDocument();
        }
      }
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF');
      setLoading(false);
    }
  };

  const loadPDFDocument = async () => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js library not loaded');
      }

      const pdf = await pdfjsLib.getDocument({
        url: fileUrl,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      }).promise;
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setLoading(false);
    } catch (err) {
      console.error('Error loading PDF document:', err);
      setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      const viewport = page.getViewport({ scale, rotation });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render page');
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const rotateDocument = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* PDF Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    setCurrentPage(page);
                  }
                }}
                className="w-12 px-2 py-1 text-sm border border-gray-300 rounded text-center"
              />
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            
            <span className="text-sm text-gray-600 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={zoomIn}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="border-l border-gray-300 h-6 mx-2"></div>

            <button
              onClick={rotateDocument}
              className="p-1 hover:bg-gray-100 rounded"
              title="Rotate"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              onClick={downloadPDF}
              className="p-1 hover:bg-gray-100 rounded"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Canvas Container */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <div className="shadow-lg bg-white">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
            />
          </div>
        </div>
      </div>

      {/* PDF Info Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="truncate">{fileName}</span>
          <span>Scale: {Math.round(scale * 100)}% | Rotation: {rotation}°</span>
        </div>
      </div>
    </div>
  );
}