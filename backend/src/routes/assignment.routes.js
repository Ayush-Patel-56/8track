import express from 'express';
import { getAssignments, createAssignment, updateAssignment, deleteAssignment  } from '../controllers/assignmentController.js';
import { protect  } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.get('/', getAssignments);
router.post('/', createAssignment);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

export default router;
