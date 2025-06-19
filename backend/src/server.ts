import './types/express';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/auth';
import recordsRoutes from './routes/records';
import 'dotenv/config';


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/records', recordsRoutes);

// Connect to MongoDB
mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start server
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }); 