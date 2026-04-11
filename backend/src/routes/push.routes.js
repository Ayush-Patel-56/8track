import express from 'express';
import { saveSubscription, sendTestNotification, unsubscribePush  } from '../controllers/pushController.js';
import { protect  } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.post('/subscribe', saveSubscription);
router.delete('/unsubscribe', unsubscribePush);
router.post('/test', sendTestNotification);

export default router;
