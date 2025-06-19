import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Box,
  Alert,
  Avatar
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { register } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await register(registerData.name, registerData.email, registerData.password);
      login(response.token, response.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #dbeafe 0%, #f0fdf4 100%)',
        fontFamily: 'Poppins, Roboto, Arial, sans-serif',
      }}
    >
      <Container component="main" maxWidth="xs" disableGutters>
        <Paper
          elevation={8}
          sx={{
            p: 5,
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'gold', width: 56, height: 56 }}>
            <PersonAddAlt1Icon sx={{ color: '#2c5364', fontSize: 32 }} />
          </Avatar>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: '#2c5364', mb: 1, letterSpacing: 1 }}>
            Create Account
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#555', mb: 2 }}>
            Sign up to get started
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: '#f7fafc',
                  '&:hover': { background: '#f0f4f8' },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: '#f7fafc',
                  '&:hover': { background: '#f0f4f8' },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: '#f7fafc',
                  '&:hover': { background: '#f0f4f8' },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: '#f7fafc',
                  '&:hover': { background: '#f0f4f8' },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontWeight: 600,
                fontSize: '1.1rem',
                borderRadius: 2,
                background: 'linear-gradient(90deg, #ffd700 0%, #f5e6ca 100%)',
                color: '#2c5364',
                boxShadow: '0 4px 20px 0 rgba(255, 215, 0, 0.2)',
                transition: 'all 0.3s',
                '&:hover': {
                  background: 'linear-gradient(90deg, #f5e6ca 0%, #ffd700 100%)',
                  color: '#0f2027',
                  boxShadow: '0 6px 24px 0 rgba(255, 215, 0, 0.3)',
                },
              }}
            >
              Sign Up
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link component={RouterLink} to="/login" variant="body2" sx={{ color: '#2c5364', fontWeight: 500 }}>
                {"Already have an account? "}
                <span style={{ color: '#bfa046', fontWeight: 700 }}>Sign In</span>
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;
