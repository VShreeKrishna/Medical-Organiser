// src/routes/records.ts
import { Router, Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import { auth, AuthRequest } from '../middleware/auth';
import MedicalRecord, { IMedicalRecord } from '../models/MedicalRecord';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AIProcessor } from '../services/aiProcessor';
// import { File } from 'multer';

const router = Router();
const aiProcessor = AIProcessor.getInstance();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all medical records for the authenticated user
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const records = await MedicalRecord.find({ userId: (req as AuthRequest).user._id });
    console.log('Raw records from DB:', JSON.stringify(records, null, 2));
    
    // Transform the data to match frontend expectations
    const transformedRecords = records.map((record: any) => {
      // Ensure prescription is an array of valid medication objects
      let prescription = [];
      if (Array.isArray(record.prescription)) {
        prescription = record.prescription.filter((med: any) => 
          med && 
          typeof med === 'object' &&
          typeof med.medicineName === 'string' &&
          typeof med.dosage === 'string' &&
          typeof med.duration === 'string'
        );
      }
      console.log('Transformed prescription:', JSON.stringify(prescription, null, 2));

      // Convert Mongoose document to plain object and transform fields
      const recordObj = record.toObject() as IMedicalRecord & { _id: any };
      const transformed = {
        id: recordObj._id.toString(),
        patientName: recordObj.patientName || '',
        date: recordObj.date || '',
        doctorName: recordObj.doctorName || '',
        diagnosis: recordObj.diagnosis || '',
        prescription: prescription,
        notes: recordObj.notes || '',
        attachments: recordObj.attachments || [],
        userId: recordObj.userId.toString(),
        recordType: recordObj.recordType || 'other',
        documentType: recordObj.documentType || '',
        summary: recordObj.summary || '',
        originalText: recordObj.originalText || '',
        filePath: recordObj.filePath || '',
      };
      console.log('Transformed record:', JSON.stringify(transformed, null, 2));
      return transformed;
    });
    
    console.log('Sending to frontend:', JSON.stringify(transformedRecords, null, 2));
    res.json(transformedRecords);
  } catch (error) {
    console.error('Error in GET /records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search medical records
router.get('/search', auth, async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    const results = await aiProcessor.searchSimilarDocuments(query as string);
    // Transform the search results to match frontend expectations
    const transformedResults = results.map((record: any) => ({
      id: record._id.toString(),
      patientName: record.patientName || '',
      date: record.date || '',
      doctorName: record.doctorName || '',
      diagnosis: record.diagnosis || '',
      prescription: record.prescription || [],
      notes: record.notes || '',
      attachments: record.attachments || [],
      userId: record.userId.toString(),
      recordType: record.recordType || 'other',
      documentType: record.documentType,
      summary: record.summary,
      originalText: record.originalText,
      filePath: record.filePath,
    }));
    res.json(transformedResults);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new medical record
router.post(
  '/',
  [
    auth,
    upload.single('file'),
    body('patientName').optional().trim(),
    body('date').optional(),
    body('doctorName').optional().trim(),
    body('diagnosis').optional().trim(),
    body('prescription').optional(),
    body('notes').optional().trim(),
    body('recordType').optional().trim(),
  ],
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        res.status(400).json({ errors: errors.array() });
        return;
      }

      let recordData: any = {
        userId: (req as AuthRequest).user._id,
        recordType: 'other',
        date: new Date().toISOString().split('T')[0],
      };

      // If a file is uploaded, process it with AI
      if (req.file) {
        try {
          const extractedData = await aiProcessor.processDocument(req.file);
          console.log('AI Extracted Data:', JSON.stringify(extractedData, null, 2));
          
          // Ensure prescription is properly formatted
          if (extractedData.prescription) {
            if (!Array.isArray(extractedData.prescription)) {
              extractedData.prescription = [];
            } else {
              extractedData.prescription = extractedData.prescription.filter(med => 
                med && 
                typeof med === 'object' &&
                typeof med.medicineName === 'string' &&
                typeof med.dosage === 'string' &&
                typeof med.duration === 'string'
              );
            }
          }
          
          // Merge AI extracted data with recordData, preserving the extracted data
          recordData = {
            ...extractedData,
            userId: (req as AuthRequest).user._id,
            attachments: [`/uploads/${req.file.filename}`],
          };
          
          console.log('Record data after AI extraction:', JSON.stringify(recordData, null, 2));
        } catch (error) {
          console.error('AI Processing Error:', error);
          // Continue with manual data if AI fails
        }
      }

      // Only merge manually entered data if it exists and is not empty
      Object.keys(req.body).forEach(key => {
        if (req.body[key] && req.body[key].trim() !== '') {
          if (key === 'prescription') {
            try {
              const prescriptionData = JSON.parse(req.body[key]);
              if (Array.isArray(prescriptionData)) {
                recordData[key] = prescriptionData.filter(med => 
                  med && 
                  typeof med === 'object' &&
                  typeof med.medicineName === 'string' &&
                  typeof med.dosage === 'string' &&
                  typeof med.duration === 'string'
                );
              }
            } catch (e) {
              console.error('Error parsing prescription:', e);
              // Keep existing prescription data if parsing fails
            }
          } else {
            recordData[key] = req.body[key].trim();
          }
        }
      });

      console.log('Final Record Data:', JSON.stringify(recordData, null, 2));

      // Validate required fields before saving
      const requiredFields = ['patientName', 'date', 'doctorName', 'diagnosis'];
      const missingFields = requiredFields.filter(field => !recordData[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        recordData = {
          ...recordData,
          patientName: recordData.patientName || '',
          date: recordData.date || new Date().toISOString().split('T')[0],
          doctorName: recordData.doctorName || '',
          diagnosis: recordData.diagnosis || '',
          prescription: Array.isArray(recordData.prescription) ? recordData.prescription : [],
          notes: recordData.notes || '',
          summary: recordData.summary || ''
        };
      }

      // Create and save the record
      const record = new MedicalRecord(recordData);
      const savedRecord = await record.save();
      console.log('Final saved record:', JSON.stringify(savedRecord, null, 2));

      // Transform the response to match frontend expectations
      const recordObj = savedRecord.toObject() as IMedicalRecord & { _id: any };
      const transformedRecord = {
        id: recordObj._id.toString(),
        patientName: recordObj.patientName || '',
        date: recordObj.date || '',
        doctorName: recordObj.doctorName || '',
        diagnosis: recordObj.diagnosis || '',
        prescription: Array.isArray(recordObj.prescription) ? recordObj.prescription : [],
        notes: recordObj.notes || '',
        attachments: recordObj.attachments || [],
        userId: recordObj.userId.toString(),
        recordType: recordObj.recordType || 'other',
        documentType: recordObj.documentType || '',
        summary: recordObj.summary || '',
        originalText: recordObj.originalText || '',
        filePath: recordObj.filePath || '',
      };

      console.log('Sending to frontend:', JSON.stringify(transformedRecord, null, 2));
      res.json(transformedRecord);
    } catch (error) {
      console.error('Error in POST /records:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update a medical record
router.put(
  '/:id',
  [
    auth,
    upload.single('file'),
    body('patientName').optional().trim(),
    body('date').optional(),
    body('doctorName').optional().trim(),
    body('diagnosis').optional().trim(),
    body('prescription').optional().trim(),
    body('notes').optional().trim(),
    body('recordType').optional().trim(),
  ],
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const record = await MedicalRecord.findOne({
        _id: req.params.id,
        userId: (req as AuthRequest).user._id,
      });

      if (!record) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        res.status(404).json({ message: 'Record not found' });
        return;
      }

      let updateData = { ...req.body };

      // If a new file is uploaded, process it with AI
      if (req.file) {
        const extractedData = await aiProcessor.processDocument(req.file);
        
        // Merge AI extracted data with manual input
        updateData = {
          ...extractedData,
          ...updateData,
        };

        // Initialize attachments if undefined and add new file
        if (!record.attachments) {
          record.attachments = [];
        }
        record.attachments.push(`/uploads/${req.file.filename}`);
      }

      Object.assign(record, updateData);
      await record.save();
      res.json(record);
    } catch (error) {
      console.error('Error saving record:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete a medical record
router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    const record = await MedicalRecord.findOne({
      _id: req.params.id,
      userId: (req as AuthRequest).user._id,
    });

    if (!record) {
      res.status(404).json({ message: 'Record not found' });
      return;
    }

    // Delete associated files
    if (record.attachments && record.attachments.length > 0) {
      record.attachments.forEach(attachment => {
        const filePath = path.join(process.cwd(), attachment);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await record.deleteOne();
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
