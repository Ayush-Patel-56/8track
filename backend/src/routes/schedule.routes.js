const express = require('express');
const { getSchedule, addSlot, deleteSlot, toggleHoliday } = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getSchedule);
router.post('/:day/slots', addSlot);
router.delete('/:day/slots/:slotId', deleteSlot);
router.patch('/:day/holiday', toggleHoliday);

module.exports = router;
