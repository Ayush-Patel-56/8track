import express from 'express';
import { getExams, createExam, deleteExam  } from '../controllers/examController.js';
import { protect  } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.get('/', getExams);
router.post('/', createExam);
router.delete('/:id', deleteExam);

export default router;
