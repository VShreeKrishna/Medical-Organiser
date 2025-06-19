export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Medication {
  medicineName: string;
  dosage: string;
  duration: string;
  tablets?: string;  // Number of tablets prescribed
}

export interface MedicalRecord {
  id: string;
  patientName: string;
  date: string;
  doctorName: string;
  diagnosis: string;
  prescription: Medication[];
  notes: string;
  attachments: string[];
  userId: string;
  recordType: string;
  documentType?: string;
  summary?: string;
  originalText?: string;
  filePath?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
} 