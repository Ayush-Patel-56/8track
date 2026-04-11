import express from 'express';
const router = express.Router();
import { protect  } from '../middleware/auth.js';
import { getAuthUrl,
    handleCallback,
    getStatus,
    disconnect,
    syncSchedule,
 } from '../controllers/googleCalendarController.js';

// Public callback route (Google redirects here – no JWT header in browser redirect)
router.get('/callback', handleCallback);

// Protected routes – require the user to be logged in
router.use(protect);

router.get('/auth-url', getAuthUrl);
router.get('/status', getStatus);
router.delete('/disconnect', disconnect);
router.post('/sync', syncSchedule);

export default router;
