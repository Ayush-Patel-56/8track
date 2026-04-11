import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearHistory  } from '../controllers/notificationController.js';
import { protect  } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.delete('/history/clear', clearHistory);

export default router;
