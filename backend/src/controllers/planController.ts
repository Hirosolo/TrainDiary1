import { Request, Response } from 'express';
import pool from '../utils/db';

// List all workout plans
export const listPlans = async (_req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT plan_id, name, description, duration_days FROM workout_plans');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch plans.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// View plan details (with exercises)
export const getPlanDetails = async (req: Request, res: Response) => {
  const { planId } = req.params;
  const conn = await pool.getConnection();
  try {
    const [planRows] = await conn.query('SELECT * FROM workout_plans WHERE plan_id = ?', [planId]);
    if ((planRows as any[]).length === 0) {
      return res.status(404).json({ message: 'Plan not found.' });
    }
    const [exRows] = await conn.query(
      `SELECT pe.*, e.name, e.category, e.description
       FROM plan_exercises pe
       JOIN exercises e ON pe.exercise_id = e.exercise_id
       WHERE pe.plan_id = ?
       ORDER BY pe.day_number ASC`,
      [planId]
    );
    res.json({ ...(planRows as any[])[0], exercises: exRows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch plan details.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Apply a plan for a user (transactional)
export const applyPlan = async (req: Request, res: Response) => {
  const { user_id, plan_id, start_date } = req.body;
  if (!user_id || !plan_id || !start_date) {
    return res.status(400).json({ message: 'user_id, plan_id, and start_date are required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Get plan details
    const [planRows] = await conn.query('SELECT duration_days FROM workout_plans WHERE plan_id = ?', [plan_id]);
    if ((planRows as any[]).length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Plan not found.' });
    }
    const duration_days = (planRows as any[])[0]?.duration_days ?? 0;
    const [exRows] = await conn.query(
      'SELECT * FROM plan_exercises WHERE plan_id = ?',
      [plan_id]
    );
    // For each day, create a session and add exercises
    for (let day = 0; day < duration_days; day++) {
      const sessionDate = new Date(start_date);
      sessionDate.setDate(sessionDate.getDate() + day);
      const [sessionResult] = await conn.query(
        'INSERT INTO workout_sessions (user_id, scheduled_date, notes) VALUES (?, ?, ?)',
        [user_id, sessionDate.toISOString().slice(0, 10), `Plan day ${day + 1}`]
      );
      const session_id = (sessionResult as any[])[0]?.insertId ?? null;
      for (const ex of (exRows as any[]).filter(e => e.day_number === day + 1)) {
        await conn.query(
          'INSERT INTO session_details (session_id, exercise_id, planned_sets, planned_reps) VALUES (?, ?, ?, ?)',
          [session_id, ex.exercise_id, ex.recommended_sets, ex.recommended_reps]
        );
      }
    }
    await conn.commit();
    res.status(201).json({ message: 'Plan applied and sessions created.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to apply plan.', error: (err as Error).message });
  } finally {
    conn.release();
  }
}; 