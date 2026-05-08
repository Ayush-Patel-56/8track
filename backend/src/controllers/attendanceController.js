import Attendance from '../models/Attendance.js';
import Subject from '../models/Subject.js';
import Schedule from '../models/Schedule.js';
import { calcPercentage, calcStatus, safeToMiss, recoveryNeeded  } from '../utils/prediction.js';
import { createNotification  } from './notificationController.js';
import { getMondayOfWeek } from './scheduleController.js';

const DAYS_MAP = {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
};

/**
 * Automatically marks missed classes as 'absent' based on the user's schedule.
 * Only looks at the current week for performance.
 */
const syncMissedAttendance = async (userId) => {
    try {
        const now = new Date();
        const monday = getMondayOfWeek(now);
        
        // 1. Fetch schedules for this week
        const schedules = await Schedule.find({ userId, weekOf: monday });
        if (!schedules.length) return;

        // 2. Fetch existing attendance for this week
        const endOfWeek = new Date(monday);
        endOfWeek.setDate(monday.getDate() + 7);
        const existingAttendance = await Attendance.find({
            userId,
            date: { $gte: monday, $lt: endOfWeek }
        });

        // 3. Get user subjects for mapping name -> ID
        const subjects = await Subject.find({ userId });
        const subjectMap = subjects.reduce((acc, s) => {
            acc[s.name] = s;
            return acc;
        }, {});

        for (const schedule of schedules) {
            if (schedule.isHoliday) continue;

            const dayOffset = DAYS_MAP[schedule.day];
            const scheduleDate = new Date(monday);
            scheduleDate.setDate(monday.getDate() + dayOffset);
            
            // Normalize to start of day for comparison
            const dateOnly = new Date(scheduleDate);
            dateOnly.setHours(0, 0, 0, 0);

            // Skip future days
            if (dateOnly > now) continue;

            const isToday = dateOnly.toDateString() === now.toDateString();

            for (const slot of schedule.slots) {
                // Check if slot has ended
                const [h, m] = slot.endTime.split(':');
                const slotEndTime = new Date(dateOnly);
                slotEndTime.setHours(parseInt(h), parseInt(m), 0, 0);

                if (isToday && slotEndTime > now) continue;

                const subject = subjectMap[slot.subjectName];
                if (!subject) continue;

                // Check if already marked
                const exists = existingAttendance.some(a => 
                    a.subjectId.toString() === subject._id.toString() &&
                    new Date(a.date).toDateString() === dateOnly.toDateString() &&
                    a.startTime === slot.startTime
                );

                if (!exists) {
                    // Auto-mark as absent
                    await Attendance.create({
                        userId,
                        subjectId: subject._id,
                        date: dateOnly,
                        startTime: slot.startTime,
                        status: 'absent'
                    });

                    // Update Subject counters
                    subject.totalClasses += 1;
                    subject.percentage = calcPercentage(subject.attendedClasses, subject.totalClasses);
                    subject.status = calcStatus(subject.percentage);
                    await subject.save();
                    
                    // We don't send notifications for auto-absent to avoid spamming
                }
            }
        }
    } catch (err) {
        console.error('Error in syncMissedAttendance:', err);
    }
};

const markAttendance = async (req, res, next) => {
    let { subjectId, status, date, startTime } = req.body;
    if (!subjectId) {
        return res.status(400).json({ message: 'subjectId is required' });
    }

    if (status !== 'present') {
        status = 'absent';
    }

    try {
        const subject = await Subject.findOne({ _id: subjectId, userId: req.user._id });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        // Check if attendance already marked for this day and specific slot
        const query = {
            userId: req.user._id,
            subjectId,
            date: { $gte: startOfDay, $lte: endOfDay }
        };
        
        if (startTime) {
            query.startTime = startTime;
        }

        let attendance = await Attendance.findOne(query);

        const oldStatusForSubject = subject.status;

        if (attendance) {
            // UPDATE EXISTING RECORD
            const oldRecordStatus = attendance.status;
            if (oldRecordStatus !== status) {
                attendance.status = status;
                await attendance.save();

                // Adjust subject stats
                if (oldRecordStatus === 'absent' && status === 'present') subject.attendedClasses += 1;
                if (oldRecordStatus === 'present' && status === 'absent') subject.attendedClasses -= 1;
            }
        } else {
            // CREATE NEW RECORD
            attendance = await Attendance.create({
                userId: req.user._id,
                subjectId,
                date: date || new Date(),
                startTime,
                status,
            });

            subject.totalClasses += 1;
            if (status === 'present') subject.attendedClasses += 1;
        }

        // Recalculate subject stats
        subject.percentage = calcPercentage(subject.attendedClasses, subject.totalClasses);
        subject.status = calcStatus(subject.percentage);
        await subject.save();

        // Notify of status change (same logic as before)
        if (oldStatusForSubject !== subject.status) {
            let title = 'Attendance Status Changed';
            let message = `Your attendance status for ${subject.name} has changed to ${subject.status.toUpperCase()}.`;
            let type = subject.status === 'safe' ? 'success' : subject.status === 'warning' ? 'warning' : 'attendance';
            await createNotification(req.user._id, title, message, type, `/attendance/${subject._id}`);
        } else if (status === 'absent' && subject.status === 'danger') {
             await createNotification(req.user._id, 'Critical Attendance', `You missed a class for ${subject.name} while already in DANGER zone!`, 'error', `/attendance/${subject._id}`);
        }

        const history = await Attendance.find({ userId: req.user._id, subjectId }).sort({ date: -1 });
        let currentStreak = 0;
        for (const record of history) {
            if (record.status === 'present') currentStreak++;
            else break;
        }
        const timeline = history.slice(0, 30).map(h => h.status).reverse();

        const prediction = {
            safeToMiss: safeToMiss(subject.attendedClasses, subject.totalClasses),
            recoveryNeeded: recoveryNeeded(subject.attendedClasses, subject.totalClasses),
            currentStreak,
            timeline,
        };

        res.status(201).json({ attendance, subject, prediction });
    } catch (err) {
        next(err);
    }
};

const getAttendanceHistory = async (req, res, next) => {
    const { subjectId } = req.params;
    try {
        await syncMissedAttendance(req.user._id);
        const history = await Attendance.find({ userId: req.user._id, subjectId }).sort({ date: -1 });
        const subject = await Subject.findById(subjectId);
        
        // Calculate Streak and Timeline
        let currentStreak = 0;
        for (const record of history) {
            if (record.status === 'present') currentStreak++;
            else break;
        }
        const timeline = history.slice(0, 30).map(h => h.status).reverse();

        const prediction = subject
            ? {
                safeToMiss: safeToMiss(subject.attendedClasses, subject.totalClasses),
                recoveryNeeded: recoveryNeeded(subject.attendedClasses, subject.totalClasses),
                currentStreak,
                timeline,
            }
            : null;

        res.json({ history, subject, prediction });
    } catch (err) {
        next(err);
    }
};

const updateAttendance = async (req, res, next) => {
    let { status } = req.body;
    if (status !== 'present') {
        status = 'absent';
    }
    try {
        const record = await Attendance.findOne({ _id: req.params.id, userId: req.user._id });
        if (!record) return res.status(404).json({ message: 'Record not found' });

        const oldStatus = record.status;
        record.status = status;
        await record.save();

        const subject = await Subject.findById(record.subjectId);
        if (subject) {
            if (oldStatus === 'present' && status === 'absent') subject.attendedClasses -= 1;
            if (oldStatus === 'absent' && status === 'present') subject.attendedClasses += 1;
            subject.percentage = calcPercentage(subject.attendedClasses, subject.totalClasses);
            subject.status = calcStatus(subject.percentage);
            await subject.save();
        }

        res.json({ record, subject });
    } catch (err) {
        next(err);
    }
};

const deleteAttendance = async (req, res, next) => {
    try {
        const record = await Attendance.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!record) return res.status(404).json({ message: 'Record not found' });

        const subject = await Subject.findById(record.subjectId);
        if (subject) {
            subject.totalClasses -= 1;
            if (record.status === 'present') subject.attendedClasses -= 1;
            subject.percentage = calcPercentage(subject.attendedClasses, subject.totalClasses);
            subject.status = calcStatus(subject.percentage);
            await subject.save();
        }

        res.json({ message: 'Attendance record deleted' });
    } catch (err) {
        next(err);
    }
};

const getGlobalAttendance = async (req, res, next) => {
    try {
        await syncMissedAttendance(req.user._id);
        const history = await Attendance.find({ userId: req.user._id }).sort({ date: -1 });
        res.json({ history });
    } catch (err) {
        next(err);
    }
};

export {  markAttendance, getAttendanceHistory, updateAttendance, deleteAttendance, getGlobalAttendance  };
