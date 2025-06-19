import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export const User = model<IUser>('User', userSchema); 