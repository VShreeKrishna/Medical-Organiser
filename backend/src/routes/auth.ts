import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from '../config';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: 'User already exists' });
        return;
      }

      const user = new User({
        name,
        email,
        password,
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
        expiresIn: '1h',
      });

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        res.status(400).json({ message: 'Invalid credentials' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(400).json({ message: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
        expiresIn: '1h',
      });

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;
