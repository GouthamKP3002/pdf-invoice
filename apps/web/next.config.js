/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // PDF.js compatibility
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    
    // Fix for react-pdf
    config.resolve.alias['pdfjs-dist/build/pdf.worker.js'] = require.resolve('pdfjs-dist/build/pdf.worker.js');
    
    return config;
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }
}

module.exports = nextConfig