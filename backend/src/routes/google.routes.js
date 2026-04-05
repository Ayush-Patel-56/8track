const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getAuthUrl,
    handleCallback,
    getStatus,
    disconnect,
    syncSchedule,
} = require('../controllers/googleCalendarController');

// Public callback route (Google redirects here – no JWT header in browser redirect)
router.get('/callback', handleCallback);

// Protected routes – require the user to be logged in
router.use(protect);

router.get('/auth-url', getAuthUrl);
router.get('/status', getStatus);
router.delete('/disconnect', disconnect);
router.post('/sync', syncSchedule);

module.exports = router;
