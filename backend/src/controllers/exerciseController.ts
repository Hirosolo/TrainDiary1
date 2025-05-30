import { Request, Response } from 'express';
import pool from '../utils/db';

export const addExercise = async (req: Request, res: Response) => {
  const { name, category, default_sets, default_reps, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Exercise name is required.' });
  }
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      'INSERT INTO exercises (name, category, default_sets, default_reps, description) VALUES (?, ?, ?, ?, ?)',
      [name, category || null, default_sets || null, default_reps || null, description || null]
    );
    res.status(201).json({ exercise_id: (result as any).insertId, message: 'Exercise added.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add exercise.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const getExercises = async (_req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM exercises');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch exercises.', error: (err as Error).message });
  } finally {
    conn.release();
  }
}; 