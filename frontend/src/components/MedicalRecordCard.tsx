import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

interface Medication {
  medicineName: string;
  dosage: string;
  duration: string;
  tablets?: string;
}

interface MedicalRecord {
  _id: string;
  patientName: string;
  date: string;
  doctorName: string;
  diagnosis: string;
  prescription: Medication[];
  notes: string;
  attachments: string[];
  recordType: string;
  documentType?: string;
  summary?: string;
}

interface Props {
  record: MedicalRecord;
  onDelete: (id: string) => void;
}

const MedicalRecordCard: React.FC<Props> = ({ record, onDelete }) => {
  const renderPrescription = (prescription: Medication[]) => {
    if (!prescription || prescription.length === 0) return null;
    
    return (
      <div className="mt-2">
        <h4 className="text-lg font-semibold mb-2">Prescription</h4>
        <div className="space-y-2">
          {prescription.map((med, index) => (
            <div key={index} className="bg-gray-50 p-2 rounded">
              <p><span className="font-medium">Medicine:</span> {med.medicineName}</p>
              <p><span className="font-medium">Dosage:</span> {med.dosage}</p>
              <p><span className="font-medium">Duration:</span> {med.duration}</p>
              {med.tablets && <p><span className="font-medium">Tablets:</span> {med.tablets}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold mb-2">{record.patientName || 'No Patient Name'}</h3>
          <p className="text-gray-600">Date: {record.date}</p>
          <p className="text-gray-600">Doctor: {record.doctorName}</p>
          <p className="text-gray-600">Type: {record.recordType}</p>
        </div>
        <button
          onClick={() => onDelete(record._id)}
          className="text-red-600 hover:text-red-800"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>

      {record.diagnosis && (
        <div className="mt-4">
          <h4 className="text-lg font-semibold">Diagnosis</h4>
          <p>{record.diagnosis}</p>
        </div>
      )}

      {renderPrescription(record.prescription)}

      {record.notes && (
        <div className="mt-4">
          <h4 className="text-lg font-semibold">Notes</h4>
          <p>{record.notes}</p>
        </div>
      )}

      {record.summary && (
        <div className="mt-4">
          <h4 className="text-lg font-semibold">Summary</h4>
          <p>{record.summary}</p>
        </div>
      )}

      {record.attachments && record.attachments.length > 0 && (
        <div className="mt-4">
          <h4 className="text-lg font-semibold">Attachments</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {record.attachments.map((attachment, index) => (
              <a
                key={index}
                href={`${process.env.REACT_APP_API_URL}${attachment}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                View Attachment {index + 1}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordCard; 