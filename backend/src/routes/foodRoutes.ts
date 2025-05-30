import { Router } from 'express';
import { addFood, addFoodLog, editFoodLog, deleteFoodLog, getFoods, createMeal, getMeals, getMealDetails, deleteMeal } from '../controllers/foodController';

const router = Router();

router.post('/', addFood); // POST /api/foods
router.post('/logs', addFoodLog); // POST /api/foods/logs
router.patch('/logs/:logId', editFoodLog); // PATCH /api/foods/logs/:logId
router.delete('/logs/:logId', deleteFoodLog); // DELETE /api/foods/logs/:logId
router.get('/', getFoods);
router.post('/meals', createMeal);
router.get('/meals', getMeals);
router.get('/meals/:mealId', getMealDetails);
router.delete('/meals/:mealId', deleteMeal);

export default router; 