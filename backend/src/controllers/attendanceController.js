const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const { calcPercentage, calcStatus, safeToMiss, recoveryNeeded } = require('../utils/prediction');
const { createNotification } = require('./notificationController');

const markAttendance = async (req, res, next) => {
    let { subjectId, status, date } = req.body;
    if (!subjectId) {
        return res.status(400).json({ message: 'subjectId is required' });
    }

    if (status !== 'present') {
        status = 'absent';
    }

    try {
        const subject = await Subject.findOne({ _id: subjectId, userId: req.user.id });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const attendance = await Attendance.create({
            userId: req.user.id,
            subjectId,
            date: date || new Date(),
            status,
        });

        const oldStatus = subject.status;
        subject.totalClasses += 1;
        if (status === 'present') subject.attendedClasses += 1;
        subject.percentage = calcPercentage(subject.attendedClasses, subject.totalClasses);
        subject.status = calcStatus(subject.percentage);
        await subject.save();

        // Notify of status change
        if (oldStatus !== subject.status) {
            let title = 'Attendance Status Changed';
            let message = `Your attendance status for ${subject.name} has changed to ${subject.status.toUpperCase()}.`;
            let type = subject.status === 'safe' ? 'success' : subject.status === 'warning' ? 'warning' : 'attendance';
            await createNotification(req.user.id, title, message, type, `/attendance/${subject._id}`);
        } else if (status === 'absent' && subject.status === 'danger') {
             await createNotification(req.user.id, 'Critical Attendance', `You missed a class for ${subject.name} while already in DANGER zone!`, 'error', `/attendance/${subject._id}`);
        }

        const prediction = {
            safeToMiss: safeToMiss(subject.attendedClasses, subject.totalClasses),
            recoveryNeeded: recoveryNeeded(subject.attendedClasses, subject.totalClasses),
        };

        res.status(201).json({ attendance, subject, prediction });
    } catch (err) {
        next(err);
    }
};

const getAttendanceHistory = async (req, res, next) => {
    const { subjectId } = req.params;
    try {
        const history = await Attendance.find({ userId: req.user.id, subjectId }).sort({ date: -1 });
        const subject = await Subject.findById(subjectId);
        const prediction = subject
            ? {
                safeToMiss: safeToMiss(subject.attendedClasses, subject.totalClasses),
                recoveryNeeded: recoveryNeeded(subject.attendedClasses, subject.totalClasses),
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
        const record = await Attendance.findOne({ _id: req.params.id, userId: req.user.id });
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
        const record = await Attendance.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
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
        const history = await Attendance.find({ userId: req.user.id }).sort({ date: -1 });
        res.json({ history });
    } catch (err) {
        next(err);
    }
};

module.exports = { markAttendance, getAttendanceHistory, updateAttendance, deleteAttendance, getGlobalAttendance };
