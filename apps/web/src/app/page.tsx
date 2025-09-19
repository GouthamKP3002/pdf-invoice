// app/page.tsx - Root page that redirects to dashboard
'use client';

import { useEffect } from 'react';
import { FileText, Upload, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-center mb-6">
              <FileText className="h-16 w-16 text-blue-600" />
            </div>
            <h1 className="text-5xl font-bold text-blue-600 mb-10 pb-5">
              PDF Dashboard
            </h1>
            <p className="text-xl text-gray-600 mb-8 mt-5">
              AI-powered PDF invoice extraction and management platform
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Upload</h3>
              <p className="text-gray-600">
                Drag and drop PDF files up to 25MB with instant processing
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Brain className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Extraction</h3>
              <p className="text-gray-600">
                Powered by Gemini and Groq for accurate data extraction
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Management</h3>
              <p className="text-gray-600">
                Review, edit, and manage all your invoices in one place
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Button
              size="lg"
              className="text-lg px-8 py-3"
              onClick={() => window.location.href = '/dashboard'}
            >
              Get Started
            </Button>
            <p className="text-sm text-gray-500">
              Upload your first PDF invoice and experience AI-powered extraction
            </p>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">25MB</div>
              <div className="text-gray-600">Max file size</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">2</div>
              <div className="text-gray-600">AI models available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">∞</div>
              <div className="text-gray-600">Invoices supported</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}