/**
 * Knowledge Base API Routes
 * Manages documents in Gemini knowledge base
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// File-based storage for uploaded documents
const UPLOAD_STORAGE_FILE = path.join(__dirname, '..', 'data', 'uploaded-documents.json');

// Ensure data directory exists
const dataDir = path.dirname(UPLOAD_STORAGE_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load uploaded documents from file
function loadUploadedDocuments() {
  try {
    if (fs.existsSync(UPLOAD_STORAGE_FILE)) {
      const data = fs.readFileSync(UPLOAD_STORAGE_FILE, 'utf8');
      const docs = JSON.parse(data);
      console.log(`📂 Loaded ${docs.length} uploaded documents from file`);
      return docs;
    }
  } catch (error) {
    console.error('Error loading uploaded documents:', error);
  }
  return [];
}

// Save uploaded documents to file
function saveUploadedDocuments(documents) {
  try {
    fs.writeFileSync(UPLOAD_STORAGE_FILE, JSON.stringify(documents, null, 2), 'utf8');
    console.log(`💾 Saved ${documents.length} uploaded documents to file`);
  } catch (error) {
    console.error('Error saving uploaded documents:', error);
  }
}

// Initialize storage
let uploadedDocuments = loadUploadedDocuments();

// All KB routes require authentication
router.use(authenticateToken);

// Get all documents in knowledge base
router.get('/documents', async (req, res, next) => {
  try {
    console.log(`📚 GET /documents - uploadedDocuments count: ${uploadedDocuments.length}`);

    if (!process.env.GEMINI_STORE_ID) {
      return res.status(503).json({
        error: 'Knowledge base not configured',
        message: 'GEMINI_STORE_ID not set in environment variables'
      });
    }

    // Query Gemini for documents list
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-002'
    });

    // Note: Gemini doesn't provide a direct list API for documents
    // We'll maintain a separate metadata tracking system
    const sampleDocuments = [
      {
        id: 1,
        name: 'Hypertension Management',
        category: 'Cardiometabolic & Heart Health',
        size: '252 KB',
        uploaded_at: new Date('2023-07-04'),
        status: 'active'
      },
      {
        id: 2,
        name: 'Male Hormone Optimisation',
        category: 'Hormonal & Endocrine',
        size: '189 KB',
        uploaded_at: new Date('2023-09-04'),
        status: 'active'
      },
      {
        id: 3,
        name: 'DNA Repair Support',
        category: 'Longevity & Healthy Ageing',
        size: '156 KB',
        uploaded_at: new Date('2022-01-06'),
        status: 'active'
      },
      {
        id: 4,
        name: 'Post-Viral Fatigue Recovery',
        category: 'Immune & Inflammation',
        size: '201 KB',
        uploaded_at: new Date('2023-07-04'),
        status: 'active'
      },
      {
        id: 5,
        name: 'Gut Microbiome Rebalancing',
        category: 'Gut & Detox',
        size: '175 KB',
        uploaded_at: new Date('2022-01-02'),
        status: 'active'
      }
    ];

    // Merge uploaded documents with sample documents
    const documents = [...uploadedDocuments, ...sampleDocuments];

    res.json({
      documents,
      store_id: process.env.GEMINI_STORE_ID,
      total: documents.length
    });

  } catch (error) {
    console.error('Error fetching KB documents:', error);
    next(error);
  }
});

// Upload new document to knowledge base
router.post('/documents', async (req, res, next) => {
  try {
    const { name, content, category } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    if (!process.env.GEMINI_STORE_ID) {
      return res.status(503).json({
        error: 'Knowledge base not configured'
      });
    }

    // In a real implementation, you would:
    // 1. Upload the document to Gemini File API
    // 2. Add it to the Gemini store
    // 3. Store metadata in your database

    // For now, simulate successful upload
    const newDocument = {
      id: Date.now(),
      name,
      category: category || 'General',
      size: `${Math.round(content.length / 1024)} KB`,
      uploaded_at: new Date(),
      status: 'active',
      uploaded_by: req.user.id
    };

    // Store in memory and save to file (prepend to show at top of list)
    uploadedDocuments.unshift(newDocument);
    saveUploadedDocuments(uploadedDocuments);

    console.log(`✅ Document uploaded! Total uploaded docs: ${uploadedDocuments.length}`);
    console.log(`📄 Uploaded document:`, { id: newDocument.id, name: newDocument.name, category: newDocument.category });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: newDocument
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    next(error);
  }
});

// Query knowledge base
router.post('/query', async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!process.env.GEMINI_STORE_ID) {
      return res.status(503).json({
        error: 'Knowledge base not configured'
      });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-002'
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Based on the ExpandHealth knowledge base, please answer this question: ${query}\n\nProvide a concise, evidence-based answer citing relevant information from the knowledge base.`
        }]
      }],
      tools: [{
        googleSearch: {
          retrieval: {
            disableAttribution: false,
            vertexAiSearch: {
              datastore: process.env.GEMINI_STORE_ID
            }
          }
        }
      }]
    });

    const response = await result.response;
    const answer = response.text();

    res.json({
      query,
      answer,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error querying KB:', error);
    next(error);
  }
});

// Delete document from knowledge base
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!process.env.GEMINI_STORE_ID) {
      return res.status(503).json({
        error: 'Knowledge base not configured'
      });
    }

    // Check if this is an uploaded document (not a sample document)
    const docIndex = uploadedDocuments.findIndex(doc => doc.id === parseInt(id));

    if (docIndex !== -1) {
      // Remove from uploaded documents array and save
      uploadedDocuments.splice(docIndex, 1);
      saveUploadedDocuments(uploadedDocuments);
    } else if (parseInt(id) <= 5) {
      // Trying to delete a sample document
      return res.status(403).json({
        error: 'Cannot delete sample documents',
        message: 'Sample documents are read-only'
      });
    }

    // In a real implementation:
    // 1. Remove from Gemini store
    // 2. Delete metadata from database

    res.json({
      message: 'Document deleted successfully',
      id: parseInt(id)
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    next(error);
  }
});

// Get KB statistics
router.get('/stats', async (req, res, next) => {
  try {
    // Calculate total size from uploaded documents
    const uploadedSize = uploadedDocuments.reduce((acc, doc) => {
      const sizeInKB = parseInt(doc.size) || 0;
      return acc + sizeInKB;
    }, 0);

    // Count categories including uploaded documents
    const categories = {
      'Cardiometabolic & Heart Health': 1,
      'Hormonal & Endocrine': 1,
      'Longevity & Healthy Ageing': 1,
      'Immune & Inflammation': 1,
      'Gut & Detox': 1
    };

    uploadedDocuments.forEach(doc => {
      categories[doc.category] = (categories[doc.category] || 0) + 1;
    });

    // Find most recent upload date
    const allDates = [
      new Date('2025-12-16'),
      ...uploadedDocuments.map(doc => new Date(doc.uploaded_at))
    ];
    const lastUpdated = new Date(Math.max(...allDates));

    const stats = {
      total_documents: 5 + uploadedDocuments.length,
      total_size: `${973 + uploadedSize} KB`,
      categories,
      last_updated: lastUpdated,
      queries_this_month: 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching KB stats:', error);
    next(error);
  }
});

module.exports = router;
