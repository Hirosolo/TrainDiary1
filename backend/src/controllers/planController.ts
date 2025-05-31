import { Request, Response } from 'express';
import pool from '../utils/db';

// List all workout plans
export const listPlans = async (_req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    // Get all plans with number of days for each plan
    const [rows] = await conn.query(`
      SELECT wp.plan_id, wp.name, wp.description, MAX(pd.day_number) as duration_days 
      FROM workout_plans wp 
      LEFT JOIN plan_days pd ON wp.plan_id = pd.plan_id 
      GROUP BY wp.plan_id`
    );
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
    const [planRows] = await conn.query(`
      SELECT wp.*, MAX(pd.day_number) as duration_days 
      FROM workout_plans wp 
      LEFT JOIN plan_days pd ON wp.plan_id = pd.plan_id 
      WHERE wp.plan_id = ?
      GROUP BY wp.plan_id`, [planId]);

    if ((planRows as any[]).length === 0) {
      return res.status(404).json({ message: 'Plan not found.' });
    }

    const [exercises] = await conn.query(`
      SELECT pde.*, pd.day_number, e.name, e.category, e.description
      FROM plan_days pd
      JOIN plan_day_exercises pde ON pd.plan_day_id = pde.plan_day_id
      JOIN exercises e ON pde.exercise_id = e.exercise_id
      WHERE pd.plan_id = ?
      ORDER BY pd.day_number ASC`, [planId]
    );

    res.json({ 
      ...(planRows as any[])[0],
      exercises: (exercises as any[]).map((ex: any) => ({
        exercise_id: ex.exercise_id,
        name: ex.name,
        category: ex.category,
        description: ex.description,
        day_number: ex.day_number,
        recommended_sets: ex.sets,
        recommended_reps: ex.reps
      }))
    });
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

    // First check if plan exists
    const [planExists] = await conn.query('SELECT 1 FROM workout_plans WHERE plan_id = ?', [plan_id]);
    if ((planExists as any[]).length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Plan not found.' });
    }

    // Get plan details with exercises
    const [planDays] = await conn.query(`
      SELECT pd.day_number, pde.exercise_id, pde.sets, pde.reps
      FROM plan_days pd
      JOIN plan_day_exercises pde ON pd.plan_day_id = pde.plan_day_id
      WHERE pd.plan_id = ?
      ORDER BY pd.day_number ASC`, [plan_id]
    );

    if ((planDays as any[]).length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Plan has no exercises.' });
    }

    // Find max day number to determine duration
    const duration_days = Math.max(...(planDays as any[]).map((d: any) => d.day_number));

    // For each day number, create a session and add its exercises
    let currentDay = 1;
    while (currentDay <= duration_days) {
      const sessionDate = new Date(start_date);
      sessionDate.setDate(sessionDate.getDate() + currentDay - 1);
      
      const [sessionResult] = await conn.query(
        'INSERT INTO workout_sessions (user_id, scheduled_date, notes) VALUES (?, ?, ?)',
        [user_id, sessionDate.toISOString().slice(0, 10), `Plan day ${currentDay}`]
      );
      
      const session_id = (sessionResult as any).insertId;
      const dayExercises = (planDays as any[]).filter(ex => ex.day_number === currentDay);
      
      for (const ex of dayExercises) {
        await conn.query(
          'INSERT INTO session_details (session_id, exercise_id, planned_sets, planned_reps) VALUES (?, ?, ?, ?)',
          [session_id, ex.exercise_id, ex.sets, ex.reps]
        );
      }
      
      currentDay++;
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