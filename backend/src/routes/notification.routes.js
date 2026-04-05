const express = require('express');
const { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearHistory } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.delete('/history/clear', clearHistory);

module.exports = router;
