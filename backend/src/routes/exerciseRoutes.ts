import { Router } from 'express';
import { addExercise, getExercises } from '../controllers/exerciseController';

const router = Router();

router.post('/', addExercise); // POST /api/exercises
router.get('/', getExercises); // GET /api/exercises

export default router; 