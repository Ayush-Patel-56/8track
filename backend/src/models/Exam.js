const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        examName: { type: String, required: true, trim: true },
        status: { type: String, enum: ['upcoming', 'completed'], default: 'completed' },
        marksObtained: { type: Number, min: 0 },
        maxMarks: { type: Number, min: 1 },
        percentage: { type: Number, default: 0 },
        date: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true }
);

// Auto-calculate percentage before save
ExamSchema.pre('save', function (next) {
    if (this.status === 'completed' && this.marksObtained !== undefined && this.maxMarks !== undefined) {
        this.percentage = parseFloat(((this.marksObtained / this.maxMarks) * 100).toFixed(2));
    } else {
        this.percentage = 0;
    }
    next();
});

ExamSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Exam', ExamSchema);
