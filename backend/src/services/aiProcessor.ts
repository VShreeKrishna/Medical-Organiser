import { OpenAI } from 'openai';
import { PDFDocument } from 'pdf-lib';
import * as Tesseract from 'tesseract.js';
import natural from 'natural';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import type { IMedicalRecord } from '../models/MedicalRecord';
import MedicalRecord from '../models/MedicalRecord';
import { Types } from 'mongoose';
import pdfParse from 'pdf-parse';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();

// Initialize LangChain
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export class AIProcessor {
  private static instance: AIProcessor;
  private vectorStore: MemoryVectorStore;

  private constructor() {
    this.vectorStore = new MemoryVectorStore(embeddings);
    
    // Test OpenAI connection
    this.testOpenAIConnection();
  }

  private async testOpenAIConnection() {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: "Test connection"
          }
        ],
        max_tokens: 5
      });
      console.log('OpenAI connection successful');
    } catch (error) {
      console.error('OpenAI connection failed:', error);
      throw new Error('Failed to connect to OpenAI API. Please check your API key.');
    }
  }

  public static getInstance(): AIProcessor {
    if (!AIProcessor.instance) {
      AIProcessor.instance = new AIProcessor();
    }
    return AIProcessor.instance;
  }

  // Classify document type
  private async classifyDocumentType(text: string): Promise<string> {
    const prompt = `
Classify this medical document as one of these categories: prescription, lab_result, xray, mri, other.
Return ONLY the category name, nothing else.

Document text:
${text}
Category:
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    });

    const result = response.choices[0]?.message?.content || 'other';
    return result.toLowerCase();
  }

  // Extract structured data from document
  private async extractStructuredData(text: string): Promise<Partial<IMedicalRecord>> {
    try {
      const prompt = `You are a medical document analyzer. Extract information from this medical document.
        Return a JSON object with these fields:
        - patientName (string): The full name of the patient
        - date (YYYY-MM-DD): The date of the document/visit
        - doctorName (string): The full name of the doctor
        - diagnosis (string): Any diagnosis or medical condition mentioned
        - prescription (array): Array of medication objects with EXACT names and instructions
        - recordType (string): Must be one of: 'prescription', 'lab_report', 'consultation', or 'other'
        - notes (string): Any additional notes, instructions, or follow-up details

        For prescriptions, each medication object MUST have these EXACT fields:
        {
          "medicineName": "EXACT medicine name as written",
          "dosage": "EXACT dosage with frequency as written",
          "duration": "EXACT duration of treatment as written",
          "tablets": "EXACT number of tablets prescribed"
        }

        IMPORTANT INSTRUCTIONS:
        1. Extract EXACT text from the document, do not paraphrase or modify
        2. For empty/missing fields, use empty string ""
        3. For prescription array, if no medications found, use empty array []
        4. Format dates as YYYY-MM-DD
        5. Include ALL medication details found in the document
        6. Return ONLY valid JSON, no other text
        7. DO NOT add any fields that are not in this schema
        8. DO NOT modify or clean up the extracted text - keep it exactly as written
        9. DO NOT include any markdown formatting or code block markers
        10. Return ONLY the raw JSON object

        Document text:
        ${text}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a precise medical document analyzer. Extract information exactly as it appears, without modification. Return only raw JSON without any markdown formatting or code block markers."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 1500
      });

      const result = response.choices[0]?.message?.content || '{}';
      console.log('Raw AI Response:', result);

      try {
        // Remove markdown code block markers if present
        const cleanResult = result.replace(/```json\n|\n```/g, '').trim();
        console.log('Cleaned AI Response:', cleanResult);
        
        const parsedData = JSON.parse(cleanResult);
        
        // Ensure prescription is an array of valid medication objects
        if (!Array.isArray(parsedData.prescription)) {
          console.log('Prescription is not an array, setting to empty array');
          parsedData.prescription = [];
        } else {
          parsedData.prescription = parsedData.prescription
            .filter((med: any) => med && typeof med === 'object')
            .map((med: { medicineName?: string; dosage?: string; duration?: string; tablets?: string }) => ({
              medicineName: med?.medicineName || '',
              dosage: med?.dosage || '',
              duration: med?.duration || '',
              tablets: med?.tablets || ''
            }))
            .filter((med: { medicineName: string; dosage: string; duration: string; tablets: string }) => 
              med.medicineName || med.dosage || med.duration || med.tablets
            );
        }

        // Ensure all required fields exist
        const formattedData: Partial<IMedicalRecord> = {
          patientName: parsedData.patientName || '',
          date: parsedData.date || new Date().toISOString().split('T')[0],
          doctorName: parsedData.doctorName || '',
          diagnosis: parsedData.diagnosis || '',
          prescription: parsedData.prescription || [],
          notes: parsedData.notes || '',
          recordType: parsedData.recordType || 'prescription'
        };

        // Generate a summary if we have meaningful data
        if (formattedData.patientName || formattedData.diagnosis || (formattedData.prescription || []).length > 0) {
          formattedData.summary = await this.generateSummary(text);
        }

        console.log('Parsed and validated data:', JSON.stringify(formattedData, null, 2));
        return formattedData;
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        throw new Error('Failed to parse AI response');
      }
    } catch (error) {
      console.error('Error in extractStructuredData:', error);
      throw error;
    }
  }

  private buildNotes(data: any): string {
    const notes: string[] = [];
    
    // Add relevant fields based on document type
    if (data.testName) notes.push(`Test: ${data.testName}`);
    if (data.normalRange) notes.push(`Normal Range: ${data.normalRange}`);
    if (data.bodyPart) notes.push(`Examined: ${data.bodyPart}`);
    if (data.findings) notes.push(`Findings: ${data.findings}`);
    if (data.impression) notes.push(`Impression: ${data.impression}`);
    if (data.notes) notes.push(data.notes);

    return notes.join('\n');
  }

  // Generate summary of the document
  private async generateSummary(text: string): Promise<string> {
    const prompt = `Summarize this medical document in a concise way:
    ${text}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    return response.choices[0]?.message?.content || '';
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    console.log('Processing document:', file.originalname, 'Type:', file.mimetype);
    
    let text = '';
    try {
      if (file.mimetype === 'application/pdf') {
        const fileBuffer = fs.readFileSync(file.path);
        console.log('PDF buffer size:', fileBuffer.length);
        const pdfData = await pdfParse(Buffer.from(fileBuffer));
        text = pdfData.text;
        console.log('Extracted PDF text:', text);
      } else {
        console.log('Processing image with OCR');
        const { data: { text: ocrText } } = await Tesseract.recognize(
          file.path,
          'eng',
          {
            logger: progress => {
              if (progress.status === 'recognizing text') {
                console.log('OCR Progress:', (progress.progress * 100).toFixed(2) + '%');
              }
            }
          }
        );
        text = ocrText;
        console.log('Extracted OCR text:', text);
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }

      return text;
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error('Failed to extract text from document: ' + (error as Error).message);
    }
  }

  public async processDocument(file: Express.Multer.File): Promise<Partial<IMedicalRecord>> {
    try {
      // Extract text from the document
      const text = await this.extractText(file);
      console.log('Extracted Text:', text);

      // Process the text with AI
      const extractedData = await this.extractStructuredData(text);
      console.log('Raw AI Response:', extractedData);

      // Ensure all required fields are present and properly formatted
      const medicalRecord: Partial<IMedicalRecord> = {
        patientName: extractedData.patientName || '',
        date: extractedData.date || new Date().toISOString().split('T')[0],
        doctorName: extractedData.doctorName || '',
        diagnosis: extractedData.diagnosis || '',
        prescription: Array.isArray(extractedData.prescription) ? 
          extractedData.prescription.map(med => ({
            medicineName: med.medicineName || '',
            dosage: med.dosage || '',
            duration: med.duration || '',
            tablets: med.tablets || ''
          })) : [],
        notes: extractedData.notes || '',
        recordType: extractedData.recordType || 'prescription',
        documentType: extractedData.recordType || 'prescription',
        filePath: file.path,
        originalText: text,
        summary: extractedData.summary || ''
      };

      // Log the final formatted record
      console.log('Formatted Medical Record:', JSON.stringify(medicalRecord, null, 2));

      return medicalRecord;
    } catch (error) {
      console.error('Error in processDocument:', error);
      throw error;
    }
  }

  // Search similar documents
  public async searchSimilarDocuments(query: string, limit: number = 5): Promise<any[]> {
    const results = await this.vectorStore.similaritySearch(query, limit);
    return results;
  }

  // Train classifier with existing records
  public async trainClassifier(records: IMedicalRecord[]): Promise<void> {
    records.forEach(record => {
      const text = `${record.diagnosis} ${record.prescription} ${record.notes}`;
      classifier.addDocument(text, record.recordType);
    });
    classifier.train();
  }
} 