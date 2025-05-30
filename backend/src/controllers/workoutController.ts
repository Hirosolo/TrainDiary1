import { Request, Response } from 'express';
import pool from '../utils/db';

// Create a workout session
export const createSession = async (req: Request, res: Response) => {
  const { user_id, scheduled_date, notes, type } = req.body;
  if (!user_id || !scheduled_date) {
    return res.status(400).json({ message: 'user_id and scheduled_date are required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO workout_sessions (user_id, scheduled_date, type, notes) VALUES (?, ?, ?, ?)',
      [user_id, scheduled_date, type || null, notes || null]
    );
    await conn.commit();
    res.status(201).json({ session_id: (result as any).insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to create session.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Add exercises to a session (transactional)
export const addExercisesToSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { exercises } = req.body; // [{exercise_id, planned_sets, planned_reps}]
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ message: 'Exercises array required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const ex of exercises) {
      await conn.query(
        'INSERT INTO session_details (session_id, exercise_id, planned_sets, planned_reps) VALUES (?, ?, ?, ?)',
        [sessionId, ex.exercise_id, ex.planned_sets, ex.planned_reps]
      );
    }
    await conn.commit();
    res.status(201).json({ message: 'Exercises added.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to add exercises.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Log actual workout
export const logWorkout = async (req: Request, res: Response) => {
  const { session_detail_id, actual_sets, actual_reps, weight_kg, duration_seconds, notes } = req.body;
  if (!session_detail_id || actual_sets == null || actual_reps == null) {
    return res.status(400).json({ message: 'session_detail_id, actual_sets, and actual_reps are required.' });
  }
  const conn = await pool.getConnection();
  try {
    // FK validation
    const [rows] = await conn.query('SELECT session_detail_id FROM session_details WHERE session_detail_id = ?', [session_detail_id]);
    if ((rows as any[]).length === 0) {
      return res.status(400).json({ message: 'Invalid session_detail_id.' });
    }
    await conn.query(
      'INSERT INTO exercise_logs (session_detail_id, actual_sets, actual_reps, weight_kg, duration_seconds, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [session_detail_id, actual_sets, actual_reps, weight_kg, duration_seconds, notes || null]
    );
    res.status(201).json({ message: 'Workout logged.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to log workout.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const getSessions = async (req: Request, res: Response) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: 'user_id required' });
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY scheduled_date DESC', [user_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sessions', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const getSessionDetails = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT sd.*, e.name, e.category, e.description
       FROM session_details sd
       JOIN exercises e ON sd.exercise_id = e.exercise_id
       WHERE sd.session_id = ?`,
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch session details', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const getSessionLogs = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT el.*, sd.exercise_id, e.name
       FROM exercise_logs el
       JOIN session_details sd ON el.session_detail_id = sd.session_detail_id
       JOIN exercises e ON sd.exercise_id = e.exercise_id
       WHERE sd.session_id = ?`,
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch session logs', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Delete logs
    await conn.query('DELETE el FROM exercise_logs el JOIN session_details sd ON el.session_detail_id = sd.session_detail_id WHERE sd.session_id = ?', [sessionId]);
    // Delete session details
    await conn.query('DELETE FROM session_details WHERE session_id = ?', [sessionId]);
    // Delete session
    await conn.query('DELETE FROM workout_sessions WHERE session_id = ?', [sessionId]);
    await conn.commit();
    res.json({ message: 'Session deleted.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to delete session.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const deleteSessionDetail = async (req: Request, res: Response) => {
  const { sessionDetailId } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Delete logs for this detail
    await conn.query('DELETE FROM exercise_logs WHERE session_detail_id = ?', [sessionDetailId]);
    // Delete the session detail
    await conn.query('DELETE FROM session_details WHERE session_detail_id = ?', [sessionDetailId]);
    await conn.commit();
    res.json({ message: 'Exercise deleted from session.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to delete exercise from session.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const deleteLog = async (req: Request, res: Response) => {
  const { logId } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM exercise_logs WHERE log_id = ?', [logId]);
    res.json({ message: 'Log deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete log.', error: (err as Error).message });
  } finally {
    conn.release();
  }
}; 