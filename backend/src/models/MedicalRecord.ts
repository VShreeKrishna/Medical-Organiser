import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicalRecord extends Document {
  recordType: string;
  patientName: string;
  date: string;
  doctorName?: string;
  diagnosis?: string;
  prescription?: {
    medicineName: string;
    dosage: string;
    duration: string;
    tablets?: string;
  }[];
  notes?: string;
  attachments?: string[];
  userId: Schema.Types.ObjectId;
  documentType?: string;
  summary?: string;
  originalText?: string;
  filePath?: string;
}

const MedicalRecordSchema = new Schema<IMedicalRecord>({
  recordType: { type: String, required: true },
  patientName: { type: String, required: true },
  date: { type: String, required: true },
  doctorName: { type: String },
  diagnosis: { type: String },
  prescription: [
    {
      medicineName: { type: String },
      dosage: { type: String },
      duration: { type: String },
      tablets: { type: String }
    }
  ],
  notes: { type: String },
  attachments: [{ type: String }],
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  documentType: { type: String },
  summary: { type: String },
  originalText: { type: String },
  filePath: { type: String }
});

export default mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);
