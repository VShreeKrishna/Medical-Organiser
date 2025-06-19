import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-records',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  bcryptSaltRounds: 10,
}; 