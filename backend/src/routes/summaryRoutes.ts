import { Router } from 'express';
import { generateSummary, getSummary } from '../controllers/summaryController';

const router = Router();

router.post('/generate', generateSummary); // POST /api/summary/generate
router.get('/', getSummary); // GET /api/summary

export default router; 