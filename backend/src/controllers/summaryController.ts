import { Request, Response } from 'express';
import pool from '../utils/db';
import { calculateSessionGR } from '../utils/grCalculator';

interface MealData {
  meal_type: string;
  date: string;
  food_name: string;
  servings: number;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: Array<{
    type: string;
    food: string;
    servings: number;
  }>;

}

interface WorkoutData {
  date: string;
  workout_type: string;
  exercise_name: string;
  exercise_category: string;
  actual_sets: number;
  actual_reps: number;
  weight_kg: number;
  duration_seconds: number | null;
}

interface DailyWorkout {
  type: string;
  exercises: Array<WorkoutData>;
  total_gr?: number;
}

interface DailySummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  workouts: number;
  gr_score?: number;
}

// Generate summary (transactional)
export const generateSummary = async (req: Request, res: Response) => {
  const { user_id, period_type, period_start } = req.body;
  if (!user_id || !period_type || !period_start) {
    return res.status(400).json({ message: 'user_id, period_type, and period_start are required.' });
  }

  console.log('Generating summary for:', { user_id, period_type, period_start });
  
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('\n[DEBUG] ====== FETCHING DATA FOR SUMMARY ======');
    console.log('Period:', { type: period_type, start: period_start });

    // Get basic workout stats
    const end_date = `DATE_ADD('${period_start}', INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})`;
    const workoutQuery = `
      SELECT 
        COUNT(DISTINCT ws.session_id) as total_workouts,
        IFNULL(SUM(el.duration_seconds),0)/60 as total_duration_minutes
      FROM workout_sessions ws
      LEFT JOIN session_details sd ON ws.session_id = sd.session_id
      LEFT JOIN exercise_logs el ON sd.session_detail_id = el.session_detail_id
      WHERE ws.user_id = ? 
      AND ws.completed = 1 
      AND ws.scheduled_date >= ?
      AND ws.scheduled_date < DATE_ADD(?, INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})`;

    const [workouts] = await conn.query(workoutQuery, [user_id, period_start, period_start]);
    const total_workouts = (workouts as any[])[0]?.total_workouts ?? 0;
    const total_duration_minutes = (workouts as any[])[0]?.total_duration_minutes ?? 0;

    // Get nutrition stats
    const [daysResult] = await conn.query(
      `SELECT DATEDIFF(${end_date}, ?) as days`,
      [period_start]
    );
    const numDays = (daysResult as any[])[0]?.days ?? (period_type === 'weekly' ? 7 : 30);

    const nutritionQuery = `
      SELECT 
        IFNULL(SUM(f.calories_per_serving * umd.amount_grams), 0) as total_calories_intake,
        IFNULL(SUM(f.protein_per_serving * umd.amount_grams) / ?, 0) as avg_protein,
        IFNULL(SUM(f.carbs_per_serving * umd.amount_grams) / ?, 0) as avg_carbs,
        IFNULL(SUM(f.fat_per_serving * umd.amount_grams) / ?, 0) as avg_fat
      FROM user_meals um
      JOIN user_meal_details umd ON um.meal_id = umd.meal_id
      JOIN foods f ON umd.food_id = f.food_id
      WHERE um.user_id = ? 
      AND um.log_date >= ?
      AND um.log_date < DATE_ADD(?, INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})`;

    const [foods] = await conn.query(nutritionQuery, [numDays, numDays, numDays, user_id, period_start, period_start]);
    const total_calories_intake = Math.round((foods as any[])[0]?.total_calories_intake ?? 0);
    const avg_protein = Math.round((foods as any[])[0]?.avg_protein ?? 0);
    const avg_carbs = Math.round((foods as any[])[0]?.avg_carbs ?? 0);
    const avg_fat = Math.round((foods as any[])[0]?.avg_fat ?? 0);

    // Get completed workouts with exercise details for GR calculation
    const [existingWorkouts] = await conn.query(
      `SELECT 
         DATE_FORMAT(ws.scheduled_date, '%Y-%m-%d') as date,
         ws.type as workout_type,
         e.name as exercise_name,
         e.category as exercise_category,
         el.actual_sets,
         el.actual_reps,
         el.weight_kg,
         el.duration_seconds
       FROM workout_sessions ws
       JOIN session_details sd ON ws.session_id = sd.session_id
       JOIN exercises e ON sd.exercise_id = e.exercise_id
       LEFT JOIN exercise_logs el ON sd.session_detail_id = el.session_detail_id
       WHERE ws.user_id = ? 
       AND ws.completed = 1
       AND ws.scheduled_date >= ?
       AND ws.scheduled_date < DATE_ADD(?, INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})
       ORDER BY ws.scheduled_date, ws.session_id`,
      [user_id, period_start, period_start]
    );

    const workoutsByDate: Record<string, DailyWorkout> = {};
    let total_gr_score = 0;
    let workout_count = 0;

    // Group workouts by date
    for (const workout of existingWorkouts as WorkoutData[]) {
      if (!workoutsByDate[workout.date]) {
        workoutsByDate[workout.date] = {
          type: workout.workout_type,
          exercises: [],
          total_gr: 0
        };
      }
      workoutsByDate[workout.date].exercises.push(workout);
    }

    // Calculate GR for each workout day
    for (const [date, workout] of Object.entries(workoutsByDate)) {
      const dailyGR = calculateSessionGR(workout.exercises);
      workout.total_gr = dailyGR;
      total_gr_score += dailyGR;
      if (dailyGR > 0) workout_count++;
    }

    const avg_gr_score = workout_count > 0 ? total_gr_score / workout_count : 0;

    // Update summary with GR scores
    await conn.query(
      `INSERT INTO user_progress_summary
       (user_id, period_type, period_start, total_workouts, total_calories_burned, 
        avg_duration_minutes, total_calories_intake, avg_protein, avg_carbs, avg_fat,
        total_gr_score, avg_gr_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_workouts=VALUES(total_workouts),
         total_calories_burned=VALUES(total_calories_burned),
         avg_duration_minutes=VALUES(avg_duration_minutes),
         total_calories_intake=VALUES(total_calories_intake),
         avg_protein=VALUES(avg_protein),
         avg_carbs=VALUES(avg_carbs),
         avg_fat=VALUES(avg_fat),
         total_gr_score=VALUES(total_gr_score),
         avg_gr_score=VALUES(avg_gr_score)`,
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
        avg_fat,
        total_gr_score,
        avg_gr_score
      ]
    );

    await conn.commit();

    // Get daily nutrition details for the graph
    const [dailyNutrition] = await conn.query(
      `SELECT 
        DATE_FORMAT(um.log_date, '%Y-%m-%d') as date,
        SUM(f.calories_per_serving * umd.amount_grams) as total_calories,
        SUM(f.protein_per_serving * umd.amount_grams) as total_protein,
        SUM(f.carbs_per_serving * umd.amount_grams) as total_carbs,
        SUM(f.fat_per_serving * umd.amount_grams) as total_fat
       FROM user_meals um
       JOIN user_meal_details umd ON um.meal_id = umd.meal_id
       JOIN foods f ON umd.food_id = f.food_id
       WHERE um.user_id = ? 
       AND um.log_date >= ?
       AND um.log_date < DATE_ADD(?, INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})
       GROUP BY DATE_FORMAT(um.log_date, '%Y-%m-%d')`,
      [user_id, period_start, period_start]
    );

    // Prepare daily summaries for the graph
    const dailySummaries: Record<string, DailySummary> = {};
    
    // Initialize all days with zeros
    const startDate = new Date(period_start);
    const endDate = new Date(period_start);
    endDate.setDate(endDate.getDate() + (period_type === 'weekly' ? 7 : 30));
    
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailySummaries[dateStr] = {
        date: dateStr,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        workouts: 0,
        gr_score: 0
      };
    }

    // Add nutrition data to daily summaries
    for (const day of dailyNutrition as any[]) {
      if (dailySummaries[day.date]) {
        dailySummaries[day.date].calories = Math.round(day.total_calories);
        dailySummaries[day.date].protein = Math.round(day.total_protein);
        dailySummaries[day.date].carbs = Math.round(day.total_carbs);
        dailySummaries[day.date].fat = Math.round(day.total_fat);
      }
    }

    // Add workout and GR data to daily summaries
    for (const [date, data] of Object.entries(workoutsByDate)) {
      if (dailySummaries[date]) {
        dailySummaries[date].workouts = data.exercises.length > 0 ? 1 : 0;
        dailySummaries[date].gr_score = data.total_gr || 0;
      }
    }

    const dailyData = Object.values(dailySummaries).sort((a, b) => a.date.localeCompare(b.date));

    const response = {
      total_workouts,
      total_calories_intake,
      avg_protein,
      avg_carbs,
      avg_fat,
      total_duration_minutes,
      total_gr_score,
      avg_gr_score,
      dailyData
    };

    console.log('Summary for period:', {
      period: period_type,
      start_date: period_start,
      stats: {
        total_workouts,
        total_calories_intake,
        avg_protein: `${avg_protein}g/day`,
        avg_carbs: `${avg_carbs}g/day`,
        avg_fat: `${avg_fat}g/day`,
        total_gr_score,
        avg_gr_score: `${avg_gr_score.toFixed(2)}`
      },
      dailyDataPoints: dailyData.length
    });
    res.status(201).json(response);
  } catch (err) {
    await conn.rollback();
    console.error('Failed to generate summary:', err);
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

  // Always generate fresh data for accurate graphs
  await generateSummary({
    body: { user_id, period_type, period_start },
  } as Request, res);
};
