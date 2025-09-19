// src/index.ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import uploadRoutes from './routes/uploadRoutes.js';
import extractRoutes from './routes/extractRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-dashboard';

mongoose.connect(mongoURI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Check required environment variables
const requiredEnvVars = ['BLOB_READ_WRITE_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please check your .env file');
  process.exit(1);
}

console.log('✅ Vercel Blob storage configured');

// Routes
app.use('/', uploadRoutes);           // Handles /upload routes
app.use('/extract', extractRoutes);   // Handles /extract routes  
app.use('/invoices', invoiceRoutes);  // Handles /invoices CRUD routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PDF Dashboard API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    storage: 'vercel-blob',
    features: {
      upload: true,
      extraction: !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY),
      database: !!process.env.MONGODB_URI
    }
  });
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    success: true,
    endpoints: {
      upload: {
        'GET /upload': 'Get upload configuration',
        'POST /upload': 'Upload PDF file to Vercel Blob',
        'GET /file/:fileId': 'Redirect to Vercel Blob URL',
        'DELETE /upload/:fileId': 'Delete PDF file from Vercel Blob'
      },
      extract: {
        'POST /extract': 'Extract data from uploaded PDF using AI',
        'GET /extract/:fileId': 'Get extraction status',
        'POST /extract/retry/:fileId': 'Retry extraction with different model'
      },
      invoices: {
        'GET /invoices': 'List all invoices with search and pagination',
        'GET /invoices/:id': 'Get single invoice by ID',
        'POST /invoices': 'Create new invoice record',
        'PUT /invoices/:id': 'Update existing invoice',
        'DELETE /invoices/:id': 'Delete invoice and PDF file'
      },
      system: {
        'GET /health': 'Health check with feature status',
        'GET /api-docs': 'API documentation'
      }
    },
    workflow: {
      description: 'Complete PDF processing workflow',
      steps: [
        '1. POST /upload - Upload PDF to Vercel Blob',
        '2. POST /invoices - Create invoice record with blob info',
        '3. POST /extract - Extract data using AI (Gemini/Groq)', 
        '4. GET /invoices - List processed invoices',
        '5. PUT /invoices/:id - Edit extracted data',
        '6. DELETE /invoices/:id - Remove invoice and blob file'
      ]
    },
    storage: {
      type: 'vercel-blob',
      features: ['Public URLs', 'CDN delivery', 'Automatic cleanup'],
      limits: {
        maxFileSize: '25MB',
        allowedTypes: ['application/pdf']
      }
    },
    exampleRequests: {
      upload: 'curl -F "pdf=@invoice.pdf" http://localhost:3001/upload',
      createInvoice: `curl -X POST -H "Content-Type: application/json" \\
  -d '{"fileId":"uuid","fileName":"invoice.pdf","fileUrl":"blob-url","blobName":"pdfs/uuid.pdf"}' \\
  http://localhost:3001/invoices`,
      extract: `curl -X POST -H "Content-Type: application/json" \\
  -d '{"fileId":"uuid","model":"gemini"}' \\
  http://localhost:3001/extract`,
      getInvoices: 'curl "http://localhost:3001/invoices?page=1&limit=10&q=vendor"'
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the PDF Dashboard API with Vercel Blob storage',
    documentation: '/api-docs',
    health: '/health',
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableRoutes: ['/upload', '/extract', '/invoices', '/health', '/api-docs'],
    documentation: '/api-docs'
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', error);
  
  // Handle Vercel Blob specific errors
  if (error.message && error.message.includes('blob')) {
    return res.status(502).json({
      success: false,
      error: 'Blob storage error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'File storage temporarily unavailable'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API docs available at http://localhost:${PORT}/api-docs`);
  console.log(`💾 Using Vercel Blob storage for file uploads`);
  console.log(`🗄️ MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log(`🤖 AI Models: ${process.env.GEMINI_API_KEY ? 'Gemini' : ''}${process.env.GEMINI_API_KEY && process.env.GROQ_API_KEY ? ' + ' : ''}${process.env.GROQ_API_KEY ? 'Groq' : ''}`);
});