const Notification = require('../models/Notification');

const getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ notifications });
    } catch (err) {
        next(err);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: { read: true } },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ notification });
    } catch (err) {
        next(err);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, read: false },
            { $set: { read: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        next(err);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        next(err);
    }
};

const clearHistory = async (req, res, next) => {
    try {
        await Notification.deleteMany({ userId: req.user.id, read: true });
        res.json({ message: 'Read notification history cleared' });
    } catch (err) {
        next(err);
    }
};

// System function to create notifications (not exported as route)
const createNotification = async (userId, title, message, type = 'info', link = '/') => {
    try {
        return await Notification.create({ userId, title, message, type, link });
    } catch (err) {
        console.error('Failed to create notification:', err.message);
    }
};

module.exports = { 
    getNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearHistory,
    createNotification
};
