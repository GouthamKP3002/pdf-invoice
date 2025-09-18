// src/index.ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
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
  origin: 'http://localhost:3000', // Next.js frontend
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

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
    version: '1.0.0'
  });
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    success: true,
    endpoints: {
      upload: {
        'GET /upload': 'Get upload configuration',
        'POST /upload': 'Upload PDF file',
        'GET /file/:fileId': 'Serve PDF file',
        'DELETE /upload/:fileId': 'Delete uploaded PDF file'
      },
      extract: {
        'POST /extract': 'Extract data from uploaded PDF',
        'GET /extract/:fileId': 'Get extraction status',
        'POST /extract/retry/:fileId': 'Retry extraction with different model'
      },
      invoices: {
        'GET /invoices': 'List all invoices with search and pagination',
        'GET /invoices/:id': 'Get single invoice by ID',
        'POST /invoices': 'Create new invoice manually',
        'PUT /invoices/:id': 'Update existing invoice',
        'DELETE /invoices/:id': 'Delete invoice and PDF file'
      },
      system: {
        'GET /health': 'Health check',
        'GET /api-docs': 'API documentation'
      }
    },
     usage: {
      workflow: [
        '1. POST /upload - Upload a PDF file',
        '2. POST /extract with fileId - Extract data from PDF',
        '3. GET /extract/:fileId - Check extraction status',
        '4. GET /invoices - List all extracted invoices',
        '5. PUT/DELETE /invoices/:id - Manage invoices'
      ],
      exampleRequests: {
        upload: 'curl -F "pdf=@invoice.pdf" http://localhost:3001/upload',
        extract: 'curl -X POST -H "Content-Type: application/json" -d \'{"fileId":"your-file-id","model":"gemini"}\' http://localhost:3001/extract',
        getInvoices: 'curl http://localhost:3001/invoices?page=1&limit=10'
      }
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Welcome to the PDF Dashboard API. Visit /api-docs for API documentation.'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableRoutes: ['/upload', '/extract', '/invoices', '/health', '/api-docs']
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload form available at http://localhost:${PORT}/upload`);
  console.log(`📚 API docs available at http://localhost:${PORT}/api-docs`);
});