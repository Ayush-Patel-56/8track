import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { 
            type: String, 
            enum: ['info', 'warning', 'error', 'success', 'attendance', 'assignment', 'exam', 'streak'], 
            default: 'info' 
        },
        read: { type: Boolean, default: false },
        link: { type: String }, // Optional link to a page (e.g. /attendance/subjectId)
    },
    { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);
