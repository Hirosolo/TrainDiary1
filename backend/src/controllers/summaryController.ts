import { Request, Response } from 'express';
import pool from '../utils/db';

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
  exercises: Array<{
    name: string;
    category: string;
    sets: number;
    reps: number;
    weight_kg: number | null;
    duration: number | null;
  }>;

}

interface DailySummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  workouts: number;
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
    
    // Get meals with nutrition details
    const [existingMeals] = await conn.query(
      `SELECT 
         m.meal_type,
         DATE_FORMAT(m.log_date, '%Y-%m-%d') as date,
         f.name as food_name,
         md.amount_grams as servings,
         f.calories_per_serving,
         f.protein_per_serving,
         f.carbs_per_serving,
         f.fat_per_serving,
         (md.amount_grams * f.calories_per_serving) as total_calories,
         (md.amount_grams * f.protein_per_serving) as total_protein,
         (md.amount_grams * f.carbs_per_serving) as total_carbs,
         (md.amount_grams * f.fat_per_serving) as total_fat
       FROM user_meals m
       JOIN user_meal_details md ON m.meal_id = md.meal_id
       JOIN foods f ON md.food_id = f.food_id
       WHERE m.user_id = ? 
       AND m.log_date >= ?
       AND m.log_date < DATE_ADD(?, INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})
       ORDER BY m.log_date, m.meal_type`,
      [user_id, period_start, period_start]
    );
    
    console.log('\n[DEBUG] ====== MEALS IN PERIOD ======');
    const mealsByDate: Record<string, DailyNutrition> = {};
    for (const meal of existingMeals as MealData[]) {
      if (!mealsByDate[meal.date]) {
        mealsByDate[meal.date] = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          meals: []
        };
      }
      mealsByDate[meal.date].calories += meal.total_calories;
      mealsByDate[meal.date].protein += meal.total_protein;
      mealsByDate[meal.date].carbs += meal.total_carbs;
      mealsByDate[meal.date].fat += meal.total_fat;
      mealsByDate[meal.date].meals.push({
        type: meal.meal_type,
        food: meal.food_name,
        servings: meal.servings
      });
    }

    Object.entries(mealsByDate).forEach(([date, data]) => {
      console.log(`\n${date}:`);
      console.log(`Daily Totals: ${Math.round(data.calories)} cal, ${Math.round(data.protein)}g protein, ${Math.round(data.carbs)}g carbs, ${Math.round(data.fat)}g fat`);
      data.meals.forEach(meal => {
        console.log(`  ${meal.type}: ${meal.food} (${meal.servings} servings)`);
      });
    });

    // Get completed workouts with exercise details
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
    
    console.log('\n[DEBUG] ====== WORKOUTS IN PERIOD ======');
    const workoutsByDate: Record<string, DailyWorkout> = {};
    for (const workout of existingWorkouts as WorkoutData[]) {
      if (!workoutsByDate[workout.date]) {
        workoutsByDate[workout.date] = {
          type: workout.workout_type,
          exercises: []
        };
      }
      workoutsByDate[workout.date].exercises.push({
        name: workout.exercise_name,
        category: workout.exercise_category,
        sets: workout.actual_sets,
        reps: workout.actual_reps,
        weight_kg: workout.weight_kg,
        duration: workout.duration_seconds
      });
    }

    Object.entries(workoutsByDate).forEach(([date, data]) => {
      console.log(`\n${date} - ${data.type}:`);
      data.exercises.forEach(exercise => {
        console.log(`  ${exercise.name}: ${exercise.sets}x${exercise.reps} @ ${exercise.weight_kg}kg`);
      });
    });
    
    // Get the end date based on period type
    const end_date = `DATE_ADD('${period_start}', INTERVAL 1 ${period_type === 'weekly' ? 'WEEK' : 'MONTH'})`;
    console.log('[DEBUG] Date range:', { start: period_start, end: end_date });    // Aggregate workout data with modified query
    console.log('[DEBUG] Counting workouts...');
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
    
    console.log('[DEBUG] Workout query:', workoutQuery);
    const [workouts] = await conn.query(workoutQuery, [user_id, period_start, period_start]);
    console.log('[DEBUG] Workout query result:', workouts);

    const total_workouts = (workouts as any[])[0]?.total_workouts ?? 0;
    const total_duration_minutes = (workouts as any[])[0]?.total_duration_minutes ?? 0;

    // Calculate the number of days for proper averaging
    const [daysResult] = await conn.query(
      `SELECT DATEDIFF(${end_date}, ?) as days`,
      [period_start]
    );
    const numDays = (daysResult as any[])[0]?.days ?? (period_type === 'weekly' ? 7 : 30);
    console.log('[DEBUG] Period days:', numDays);

    // Aggregate nutrition data with modified query
    console.log('[DEBUG] Calculating nutrition...');    const nutritionQuery = `
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

    console.log('[DEBUG] Nutrition query:', nutritionQuery);
    const [foods] = await conn.query(nutritionQuery, [numDays, numDays, numDays, user_id, period_start, period_start]);
    console.log('[DEBUG] Nutrition query result:', foods);

    // Round the values for better display
    const total_calories_intake = Math.round((foods as any[])[0]?.total_calories_intake ?? 0);
    const avg_protein = Math.round((foods as any[])[0]?.avg_protein ?? 0);
    const avg_carbs = Math.round((foods as any[])[0]?.avg_carbs ?? 0);
    const avg_fat = Math.round((foods as any[])[0]?.avg_fat ?? 0);
    
    console.log('Nutrition stats:', {
      total_calories_intake,
      avg_protein,
      avg_carbs,
      avg_fat
    });

    // Debug raw data
    console.log('Raw workout data:', workouts);
    console.log('Raw nutrition data:', foods);

    // Insert or update summary
    console.log('Updating summary in database...');
    await conn.query(
      `INSERT INTO user_progress_summary
       (user_id, period_type, period_start, total_workouts, total_calories_burned, 
        avg_duration_minutes, total_calories_intake, avg_protein, avg_carbs, avg_fat)
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
    
    // Calculate daily summaries for the graphs
    const dailySummaries: Record<string, DailySummary> = {};
    
    // Initialize daily summaries with zeros for all days in the period
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
        workouts: 0
      };
    }

    // Add nutrition data
    for (const [date, data] of Object.entries(mealsByDate)) {
      if (dailySummaries[date]) {
        dailySummaries[date].calories = Math.round(data.calories);
        dailySummaries[date].protein = Math.round(data.protein);
        dailySummaries[date].carbs = Math.round(data.carbs);
        dailySummaries[date].fat = Math.round(data.fat);
      }
    }

    // Add workout data
    for (const [date, data] of Object.entries(workoutsByDate)) {
      if (dailySummaries[date]) {
        dailySummaries[date].workouts = data.exercises.length > 0 ? 1 : 0;
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
      dailyData // Add daily data for graphs
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
