import { Request, Response } from 'express';
import pool from '../utils/db';

// Add new food item
export const addFood = async (req: Request, res: Response) => {
  const { name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Food name is required.' });
  }
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      'INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g) VALUES (?, ?, ?, ?, ?)',
      [name, calories_per_100g || 0, protein_per_100g || 0, carbs_per_100g || 0, fat_per_100g || 0]
    );
    res.status(201).json({ food_id: (result as any).insertId, message: 'Food added.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add food.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Log a meal (transactional, auto nutrition)
export const addFoodLog = async (req: Request, res: Response) => {
  const { user_id, food_id, log_date, meal_type, amount_grams } = req.body;
  if (!user_id || !food_id || !log_date || !meal_type || !amount_grams) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Validate food_id
    const [foods] = await conn.query('SELECT * FROM foods WHERE food_id = ?', [food_id]);
    if ((foods as any[]).length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Invalid food_id.' });
    }
    await conn.query(
      'INSERT INTO user_food_logs (user_id, food_id, log_date, meal_type, amount_grams) VALUES (?, ?, ?, ?, ?)',
      [user_id, food_id, log_date, meal_type, amount_grams]
    );
    await conn.commit();
    res.status(201).json({ message: 'Food log added.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to add food log.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Edit a meal log
export const editFoodLog = async (req: Request, res: Response) => {
  const { logId } = req.params;
  const { amount_grams, meal_type } = req.body;
  if (!amount_grams && !meal_type) {
    return res.status(400).json({ message: 'Nothing to update.' });
  }
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      'UPDATE user_food_logs SET amount_grams = COALESCE(?, amount_grams), meal_type = COALESCE(?, meal_type) WHERE log_id = ?',
      [amount_grams, meal_type, logId]
    );
    res.json({ message: 'Food log updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update food log.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Delete a meal log
export const deleteFoodLog = async (req: Request, res: Response) => {
  const { logId } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM user_food_logs WHERE log_id = ?', [logId]);
    res.json({ message: 'Food log deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete food log.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

export const getFoods = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT food_id, name, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, serving_type, image FROM foods ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch foods', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Create a meal and its details (transactional)
export const createMeal = async (req: Request, res: Response) => {
  const { user_id, meal_type, log_date, foods } = req.body; // foods: [{food_id, amount_grams}]
  if (!user_id || !meal_type || !log_date || !Array.isArray(foods) || foods.length === 0) {
    return res.status(400).json({ message: 'All fields and at least one food are required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [mealResult] = await conn.query(
      'INSERT INTO user_meals (user_id, meal_type, log_date) VALUES (?, ?, ?)',
      [user_id, meal_type, log_date]
    );
    const meal_id = (mealResult as any).insertId;
    for (const food of foods) {
      await conn.query(
        'INSERT INTO user_meal_details (meal_id, food_id, amount_grams) VALUES (?, ?, ?)',
        [meal_id, food.food_id, food.amount_grams]
      );
    }
    await conn.commit();
    res.status(201).json({ meal_id, message: 'Meal logged.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to log meal.', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Get meals for a user (optionally by date)
export const getMeals = async (req: Request, res: Response) => {
  const { user_id, date } = req.query;
  if (!user_id) return res.status(400).json({ message: 'user_id required' });
  const conn = await pool.getConnection();
  try {
    let query = 'SELECT * FROM user_meals WHERE user_id = ?';
    const params: any[] = [user_id];
    if (date) {
      query += ' AND log_date = ?';
      params.push(date);
    }
    query += ' ORDER BY log_date DESC, meal_type';
    const [meals] = await conn.query(query, params);
    res.json(meals);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch meals', error: (err as Error).message });
  } finally {
    conn.release();
  }
};

// Get meal details (foods in a meal)
export const getMealDetails = async (req: Request, res: Response) => {
  const { mealId } = req.params;
  const conn = await pool.getConnection();
  try {
    const [foods] = await conn.query(
      `SELECT d.*, f.name, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g
       FROM user_meal_details d
       JOIN foods f ON d.food_id = f.food_id
       WHERE d.meal_id = ?`,
      [mealId]
    );
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch meal details', error: (err as Error).message });
  } finally {
    conn.release();
  }
}; 