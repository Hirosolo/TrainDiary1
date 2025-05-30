import { Router } from 'express';
import { createSession, addExercisesToSession, logWorkout, getSessions, getSessionDetails, getSessionLogs } from '../controllers/workoutController';

const router = Router();

router.post('/', createSession); // POST /api/workouts
router.post('/:sessionId/exercises', addExercisesToSession); // POST /api/workouts/:sessionId/exercises
router.post('/log', logWorkout); // POST /api/workouts/log
router.get('/', getSessions);
router.get('/:sessionId/details', getSessionDetails);
router.get('/:sessionId/logs', getSessionLogs);

export default router; 