import { Router } from 'express';
import { listPlans, getPlanDetails, applyPlan } from '../controllers/planController';

const router = Router();

router.get('/', listPlans); // GET /api/plans
router.get('/:planId', getPlanDetails); // GET /api/plans/:planId
router.post('/apply', applyPlan); // POST /api/plans/apply

export default router; 