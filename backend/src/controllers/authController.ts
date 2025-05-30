import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../utils/db';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Check if email exists
    const [rows] = await conn.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if ((rows as any[]).length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Email already in use.' });
    }
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    // Insert user
    await conn.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, password_hash]
    );
    await conn.commit();
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Registration failed.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required.' });
  }
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT user_id, username, password_hash FROM users WHERE email = ?', [email]);
    if ((rows as any[]).length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const user = (rows as any)[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign({ user_id: user.user_id, username: user.username, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { user_id: user.user_id, username: user.username, email } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: (err as Error).message });
  } finally {
    conn.release();
  }
}; 