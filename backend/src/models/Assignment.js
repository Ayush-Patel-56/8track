const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        title: { type: String, required: true, trim: true },
        dueDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'overdue'],
            default: 'pending',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
    },
    { timestamps: true }
);

AssignmentSchema.index({ userId: 1, dueDate: 1 });

module.exports = mongoose.model('Assignment', AssignmentSchema);
