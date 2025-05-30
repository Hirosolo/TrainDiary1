import { Request, Response } from 'express';
import pool from '../utils/db';

// Generate summary (transactional)
export const generateSummary = async (req: Request, res: Response) => {
  const { user_id, period_type, period_start } = req.body;
  if (!user_id || !period_type || !period_start) {
    return res.status(400).json({ message: 'user_id, period_type, and period_start are required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Aggregate workout data
    const [workouts] = await conn.query(
      `SELECT COUNT(*) as total_workouts, IFNULL(SUM(duration_seconds),0)/60 as total_duration_minutes
       FROM workout_sessions ws
       JOIN session_details sd ON ws.session_id = sd.session_id
       JOIN exercise_logs el ON sd.session_detail_id = el.session_detail_id
       WHERE ws.user_id = ? AND ws.scheduled_date >= ? AND ws.scheduled_date < DATE_ADD(?, INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})`,
      [user_id, period_start, period_start]
    );
    const total_workouts = (workouts as any[])[0]?.total_workouts ?? 0;
    const total_duration_minutes = (workouts as any[])[0]?.total_duration_minutes ?? 0;
    // Aggregate food data
    const [foods] = await conn.query(
      `SELECT IFNULL(SUM(f.calories_per_100g * ufl.amount_grams / 100),0) as total_calories_intake,
              IFNULL(AVG(f.protein_per_100g * ufl.amount_grams / 100),0) as avg_protein,
              IFNULL(AVG(f.carbs_per_100g * ufl.amount_grams / 100),0) as avg_carbs,
              IFNULL(AVG(f.fat_per_100g * ufl.amount_grams / 100),0) as avg_fat
       FROM user_food_logs ufl
       JOIN foods f ON ufl.food_id = f.food_id
       WHERE ufl.user_id = ? AND ufl.log_date >= ? AND ufl.log_date < DATE_ADD(?, INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})`,
      [user_id, period_start, period_start]
    );
    const total_calories_intake = (foods as any[])[0]?.total_calories_intake ?? 0;
    const avg_protein = (foods as any[])[0]?.avg_protein ?? 0;
    const avg_carbs = (foods as any[])[0]?.avg_carbs ?? 0;
    const avg_fat = (foods as any[])[0]?.avg_fat ?? 0;
    // Insert summary
    await conn.query(
      `INSERT INTO user_progress_summary
        (user_id, period_type, period_start, total_workouts, total_calories_burned, avg_duration_minutes, total_calories_intake, avg_protein, avg_carbs, avg_fat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_workouts=VALUES(total_workouts),
         total_calories_burned=VALUES(total_calories_burned),
         avg_duration_minutes=VALUES(avg_duration_minutes),
         total_calories_intake=VALUES(total_calories_intake),
         avg_protein=VALUES(avg_protein),
         avg_carbs=VALUES(avg_carbs),
         avg_fat=VALUES(avg_fat)`,
      [
        user_id,
        period_type,
        period_start,
        total_workouts,
        0, // calories burned placeholder
        total_duration_minutes,
        total_calories_intake,
        avg_protein,
        avg_carbs,
        avg_fat
      ]
    );
    await conn.commit();
    res.status(201).json({ message: 'Summary generated.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to generate summary.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Get summary
export const getSummary = async (req: Request, res: Response) => {
  const { user_id, period_type, period_start } = req.query;
  if (!user_id || !period_type || !period_start) {
    return res.status(400).json({ message: 'user_id, period_type, and period_start are required.' });
  }
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT * FROM user_progress_summary WHERE user_id = ? AND period_type = ? AND period_start = ?',
      [user_id, period_type, period_start]
    );
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: 'Summary not found.' });
    }
    res.json((rows as any[])[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary.', error: (err as Error).message });
  } finally {
    conn.release();
  }
}; 