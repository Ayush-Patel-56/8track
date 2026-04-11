import express from 'express';
import { markAttendance, getGlobalAttendance, getAttendanceHistory, updateAttendance, deleteAttendance  } from '../controllers/attendanceController.js';
import { protect  } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.post('/', markAttendance);
router.post('/mark', markAttendance);
router.get('/', getGlobalAttendance);
router.get('/:subjectId', getAttendanceHistory);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
