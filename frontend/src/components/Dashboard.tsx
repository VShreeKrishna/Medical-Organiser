import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Paper,
  Input,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type { SelectChangeEvent } from '@mui/material/Select';

import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, CloudUpload as CloudUploadIcon, Search as SearchIcon } from '@mui/icons-material';
import { MedicalRecord, Medication } from '../types';
import { getMedicalRecords, createMedicalRecord, updateMedicalRecord, deleteMedicalRecord, searchMedicalRecords } from '../services/api';
import { useAuth } from '../context/AuthContext';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';

type RecordType = 'prescription' | 'lab_result' | 'xray' | 'mri' | 'other';

const EXCLUDED_FIELDS = [
  'id', '_id', 'userId', 'attachments', 'recordType', 'documentType', 'filePath', 'originalText', 'prescription', 'notes', 'summary', 'patientName', 'date', 'doctorName', 'diagnosis'
];

// New lighter, pleasant color palette
const headerGradient = 'linear-gradient(135deg, #e3f0ff 0%, #f8fafc 100%)';
const buttonBlue = '#60a5fa';
const cardBg = '#fff';
const cardShadow = '0 2px 12px rgba(30, 64, 175, 0.06)';
const textMain = '#1e293b';
const textSecondary = '#64748b';
const sectionBg = '#f4f6fb';
const recordFont = `'Inter', 'Segoe UI', 'Roboto', 'Arial', sans-serif`;

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    doctorName: '',
    diagnosis: '',
    prescription: [] as Medication[],
    notes: '',
    attachments: [] as string[],
    userId: user?.id || '',
    recordType: 'prescription' as RecordType,
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await getMedicalRecords();
      console.log('Frontend received data:', JSON.stringify(data, null, 2));
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
      setError('Failed to load records');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadRecords();
      return;
    }

    try {
      const results = await searchMedicalRecords(searchQuery);
      setRecords(results);
    } catch (error) {
      console.error('Error searching records:', error);
      setError('Search failed');
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingRecord(null);
    setSelectedFile(null);
    setError(null);
    setFormData({
      patientName: '',
      date: new Date().toISOString().split('T')[0],
      doctorName: '',
      diagnosis: '',
      prescription: [],
      notes: '',
      attachments: [],
      userId: user?.id || '',
      recordType: 'prescription' as RecordType,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRecordTypeChange = (event: SelectChangeEvent<string>) => {
    setFormData(prev => ({
      ...prev,
      recordType: event.target.value as RecordType,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      if (!isAuthenticated) {
        throw new Error('User is not authenticated');
      }

      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'prescription') {
          submitData.append(key, JSON.stringify(value));
        } else if (key !== 'attachments') {
          submitData.append(key, value as string);
        }
      });

      if (selectedFile) {
        submitData.append('file', selectedFile);
      }

      if (editingRecord) {
        await updateMedicalRecord(editingRecord.id, submitData);
      } else {
        await createMedicalRecord(submitData);
      }
      handleClose();
      loadRecords();
    } catch (error: any) {
      console.error('Error saving record:', error);
      setError(error.message || 'Failed to save record');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (record: MedicalRecord) => {
    setEditingRecord(record);
    setFormData({
      patientName: record.patientName || '',
      date: record.date || '',
      doctorName: record.doctorName || '',
      diagnosis: record.diagnosis || '',
      prescription: Array.isArray(record.prescription) ? record.prescription : [],
      notes: record.notes || '',
      attachments: record.attachments || [],
      userId: user?.id || '',
      recordType: (record.recordType || 'prescription') as RecordType,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMedicalRecord(id);
      loadRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      setError('Failed to delete record');
    }
  };

  // Group records by type
  const groupedRecords = records.reduce((acc, record) => {
    const type = (record.recordType || 'other') as RecordType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(record);
    return acc;
  }, {} as Record<RecordType, MedicalRecord[]>);

  const renderPrescription = (prescription: Medication[]) => {
    console.log('renderPrescription called with:', prescription);
    console.log('Type of prescription:', typeof prescription);
    console.log('Is Array?', Array.isArray(prescription));
    
    if (!Array.isArray(prescription)) {
      console.log('Prescription is not an array, returning null');
      return null;
    }
    if (prescription.length === 0) {
      console.log('Prescription array is empty, returning null');
      return null;
    }
    
    console.log('Rendering prescription with', prescription.length, 'medications');
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ color: buttonBlue, fontWeight: 600, mb: 1 }}>
          Prescription:
        </Typography>
        {prescription.map((med, index) => (
          <Box key={index} sx={{ 
            mt: 1, 
            p: 2, 
            bgcolor: cardBg, 
            borderRadius: 2,
            border: `1px solid #e5e7eb`
          }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong style={{ color: buttonBlue }}>Medicine:</strong> {med.medicineName}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong style={{ color: buttonBlue }}>Dosage:</strong> {med.dosage}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong style={{ color: buttonBlue }}>Duration:</strong> {med.duration}
            </Typography>
            {med.tablets && (
              <Typography variant="body2">
                <strong style={{ color: buttonBlue }}>Tablets:</strong> {med.tablets}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #eaf4fb 0%, #f5f7fa 100%)',
      py: 3,
      px: { xs: 1, md: 3 },
      fontFamily: recordFont
    }}>
      {/* Softer Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 4,
        p: 3,
        borderRadius: 3,
        background: headerGradient,
        boxShadow: cardShadow,
        color: textMain,
        fontFamily: recordFont
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            bgcolor: buttonBlue, 
            width: 48, 
            height: 48, 
            boxShadow: '0 2px 8px rgba(96, 165, 250, 0.12)',
            border: `2px solid #fff`
          }}>
            <HealthAndSafetyIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ 
              fontWeight: 600, 
              color: textMain, 
              letterSpacing: 0.2, 
              mb: 0.2,
              fontSize: { xs: '1.3rem', sm: '1.7rem' },
              fontFamily: recordFont
            }}>
              Welcome{user?.name ? `, ${user.name}` : ''}
            </Typography>
            <Typography variant="body1" sx={{ 
              color: textSecondary, 
              fontWeight: 400,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              fontFamily: recordFont
            }}>
              Manage Your Medical Records
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{
            background: buttonBlue,
            color: '#fff',
            fontWeight: 500,
            fontSize: '1rem',
            borderRadius: 2,
            px: 3,
            py: 1.1,
            boxShadow: '0 2px 8px rgba(96, 165, 250, 0.10)',
            textTransform: 'none',
            fontFamily: recordFont,
            '&:hover': {
              background: '#3b82f6',
            },
          }}
        >
          Add Record
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <Paper sx={{ 
          p: 2, 
          display: 'flex', 
          gap: 2, 
          borderRadius: 2, 
          background: '#fff',
          boxShadow: cardShadow,
          border: '1px solid #e5e7eb',
          fontFamily: recordFont
        }}>
          <TextField
            fullWidth
            label="Search Records"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              sx: {
                borderRadius: 2,
                fontSize: '1rem',
                background: '#f3f6fb',
                fontFamily: recordFont,
                '&:hover': { 
                  background: '#f1f5f9',
                },
              },
            }}
            InputLabelProps={{ sx: { fontSize: '1rem', color: textSecondary, fontFamily: recordFont } }}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            sx={{
              background: buttonBlue,
              color: '#fff',
              fontWeight: 500,
              borderRadius: 2,
              px: 2.5,
              fontSize: '1rem',
              boxShadow: '0 2px 8px rgba(96, 165, 250, 0.10)',
              textTransform: 'none',
              fontFamily: recordFont,
              '&:hover': {
                background: '#3b82f6',
              },
            }}
          >
            Search
          </Button>
        </Paper>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: '1rem', fontFamily: recordFont }}>
          {error}
        </Alert>
      )}

      {/* Records Section */}
      {Object.entries(groupedRecords).map(([type, typeRecords]) => (
        <Box key={type} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ 
            mb: 2, 
            textTransform: 'capitalize', 
            color: textMain, 
            fontWeight: 600, 
            letterSpacing: 0.2,
            borderBottom: `2px solid ${buttonBlue}`,
            pb: 0.5,
            display: 'inline-block',
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
            fontFamily: recordFont
          }}>
            {type} Records
          </Typography>
          <Grid container spacing={3}>
            {typeRecords.map((record) => (
              <Grid item xs={12} sm={6} md={4} key={record.id}>
                <Card sx={{
                  borderRadius: 2,
                  boxShadow: cardShadow,
                  background: cardBg,
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  fontFamily: recordFont,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 18px rgba(30, 64, 175, 0.10)',
                    borderColor: buttonBlue,
                  },
                }}>
                  <CardContent sx={{ p: 2, fontFamily: recordFont }}>
                    <Typography variant="subtitle1" sx={{ 
                      color: textMain, 
                      fontWeight: 600, 
                      mb: 1,
                      fontSize: '1.1rem',
                      borderBottom: `1px solid #e5e7eb`,
                      pb: 0.5,
                      fontFamily: recordFont
                    }}>
                      {record.patientName || 'No Patient Name'}
                    </Typography>
                    <Typography sx={{ color: textSecondary, mb: 0.5, fontWeight: 500, fontSize: '0.98rem', fontFamily: recordFont }}>
                      📅 {record.date}
                    </Typography>
                    <Typography sx={{ color: textSecondary, mb: 1, fontWeight: 500, fontSize: '0.98rem', fontFamily: recordFont }}>
                      👨‍⚕️ Dr. {record.doctorName}
                    </Typography>
                    {record.diagnosis && (
                      <Typography variant="body2" sx={{ 
                        mb: 1, 
                        p: 1.2, 
                        bgcolor: '#f3f6fb', 
                        borderRadius: 1,
                        border: `1px solid #e5e7eb`,
                        fontSize: '0.98rem',
                        fontFamily: recordFont
                      }}>
                        <strong style={{ color: buttonBlue }}>Diagnosis:</strong> {record.diagnosis}
                      </Typography>
                    )}
                    {renderPrescription(record.prescription)}
                    {record.summary && (
                      <Box sx={{ mt: 1.5, p: 1.2, bgcolor: '#f3f6fb', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: buttonBlue, fontWeight: 600, mb: 0.5, fontSize: '1rem', fontFamily: recordFont }}>
                          Summary:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.98rem', fontFamily: recordFont }}>{record.summary}</Typography>
                      </Box>
                    )}
                    {record.notes && (
                      <Box sx={{ mt: 1, p: 1.2, bgcolor: '#f3f6fb', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: buttonBlue, fontWeight: 600, mb: 0.5, fontSize: '1rem', fontFamily: recordFont }}>
                          Notes:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.98rem', fontFamily: recordFont }}>{record.notes}</Typography>
                      </Box>
                    )}
                    {/* Dynamically render all other fields */}
                    {Object.entries(record).map(([key, value]) => {
                      if (EXCLUDED_FIELDS.includes(key)) return null;
                      if (!value) return null;
                      return (
                        <Box key={key} sx={{ mt: 1, p: 1.2, bgcolor: '#f3f6fb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: buttonBlue, fontWeight: 600, mb: 0.5, fontSize: '1rem', fontFamily: recordFont }}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.98rem', fontFamily: recordFont }}>{String(value)}</Typography>
                        </Box>
                      );
                    })}
                    {record.attachments && record.attachments.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ color: buttonBlue, fontWeight: 600, mb: 0.5, fontSize: '1rem', fontFamily: recordFont }}>
                          Attachments:
                        </Typography>
                        {record.attachments.map((attachment, index) => (
                          <Button
                            key={index}
                            href={`${process.env.REACT_APP_API_URL}${attachment}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            sx={{
                              mr: 1,
                              mb: 1,
                              background: buttonBlue,
                              color: '#fff',
                              fontSize: '0.95rem',
                              fontFamily: recordFont,
                              '&:hover': {
                                background: '#3b82f6',
                              }
                            }}
                          >
                            View Attachment {index + 1}
                          </Button>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ p: 1.5, pt: 0, fontFamily: recordFont }}>
                    <IconButton 
                      onClick={() => handleEdit(record)} 
                      size="small"
                      sx={{ 
                        color: buttonBlue,
                        fontFamily: recordFont,
                        '&:hover': { color: '#3b82f6' }
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDelete(record.id)} 
                      size="small"
                      sx={{ 
                        color: '#ef4444',
                        fontFamily: recordFont,
                        '&:hover': { color: '#dc2626' }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: headerGradient,
          color: textMain,
          fontWeight: 600,
          fontSize: '1.2rem',
          fontFamily: recordFont
        }}>
          {editingRecord ? 'Edit Medical Record' : 'Add Medical Record'}
        </DialogTitle>
        <DialogContent sx={{ p: 2, fontFamily: recordFont }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, fontFamily: recordFont }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: '1rem', fontFamily: recordFont }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mt: 2, mb: 2 }}>
              <input
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                  sx={{
                    borderColor: buttonBlue,
                    color: buttonBlue,
                    fontSize: '1rem',
                    fontFamily: recordFont,
                    '&:hover': {
                      borderColor: '#3b82f6',
                      color: '#3b82f6',
                    }
                  }}
                >
                  Upload Document
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 1, color: textSecondary, fontSize: '0.98rem', fontFamily: recordFont }}>
                  Selected file: {selectedFile.name}
                </Typography>
              )}
            </Box>

            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ fontFamily: recordFont }}>Record Type</InputLabel>
              <Select
                name="recordType"
                value={formData.recordType}
                onChange={handleRecordTypeChange}
                label="Record Type"
                sx={{ fontSize: '1rem', fontFamily: recordFont }}
              >
                <MenuItem value="prescription" sx={{ fontFamily: recordFont }}>Prescription</MenuItem>
                <MenuItem value="lab_result" sx={{ fontFamily: recordFont }}>Lab Result</MenuItem>
                <MenuItem value="xray" sx={{ fontFamily: recordFont }}>X-Ray</MenuItem>
                <MenuItem value="mri" sx={{ fontFamily: recordFont }}>MRI</MenuItem>
                <MenuItem value="other" sx={{ fontFamily: recordFont }}>Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              margin="normal"
              fullWidth
              id="patientName"
              label="Patient Name"
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
              sx={{ fontSize: '1rem', fontFamily: recordFont }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="date"
              label="Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ fontSize: '1rem', fontFamily: recordFont }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="doctorName"
              label="Doctor Name"
              name="doctorName"
              value={formData.doctorName}
              onChange={handleChange}
              sx={{ fontSize: '1rem', fontFamily: recordFont }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="diagnosis"
              label="Diagnosis"
              name="diagnosis"
              multiline
              rows={2}
              value={formData.diagnosis}
              onChange={handleChange}
              sx={{ fontSize: '1rem', fontFamily: recordFont }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="notes"
              label="Notes"
              name="notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              sx={{ fontSize: '1rem', fontFamily: recordFont }}
            />
            <DialogActions sx={{ mt: 2, fontFamily: recordFont }}>
              <Button 
                onClick={handleClose}
                sx={{ 
                  color: textSecondary,
                  fontSize: '1rem',
                  fontFamily: recordFont,
                  '&:hover': { color: buttonBlue }
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isProcessing}
                startIcon={isProcessing ? <CircularProgress size={20} /> : null}
                sx={{
                  background: buttonBlue,
                  color: '#fff',
                  fontSize: '1rem',
                  fontFamily: recordFont,
                  '&:hover': {
                    background: '#3b82f6',
                  }
                }}
              >
                {isProcessing ? 'Saving...' : editingRecord ? 'Update' : 'Save'}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 