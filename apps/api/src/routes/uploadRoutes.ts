// src/routes/uploadRoutes.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const router = express.Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/pdfs';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${fileId}${extension}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

// GET /upload - Get upload configuration and limits
router.get('/upload', (req, res) => {
  res.json({
    success: true,
    message: 'Upload endpoint ready',
    configuration: {
      maxFileSize: '25MB',
      allowedFormats: ['pdf'],
      uploadPath: '/upload',
      serveFileEndpoint: '/file/:fileId'
    }
  });
});

// POST /upload - Handle PDF upload
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided'
      });
    }

    const fileId = path.parse(req.file.filename).name;
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    console.log(`📄 PDF uploaded: ${fileName} (${fileSize} bytes)`);

    // Return success response with file info
    res.json({
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        fileId,
        fileName,
        filePath,
        fileSize,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /file/:fileId - Serve uploaded PDF
router.get('/file/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = path.join('uploads/pdfs', `${fileId}.pdf`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found'
      });
    }

    // Set appropriate headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve PDF file'
    });
  }
});

// DELETE /upload/:fileId - Delete uploaded file
router.delete('/upload/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = path.join('uploads/pdfs', `${fileId}.pdf`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found'
      });
    }

    fs.unlinkSync(filePath);
    console.log(`🗑️ PDF deleted: ${fileId}.pdf`);

    res.json({
      success: true,
      message: 'PDF deleted successfully',
      data: { fileId }
    });

  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete PDF file'
    });
  }
});

export default router;
