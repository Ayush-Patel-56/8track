import Exam from '../models/Exam.js';

const getExams = async (req, res, next) => {
    try {
        const exams = await Exam.find({ userId: req.user.id })
            .populate('subjectId', 'name')
            .sort({ date: -1 });
        res.json({ exams });
    } catch (err) {
        next(err);
    }
};

const createExam = async (req, res, next) => {
    const { examName, subjectId, marksObtained, maxMarks, date, status } = req.body;
    
    if (!examName) {
        return res.status(400).json({ message: 'Exam name is required' });
    }

    const isCompleted = status === 'completed' || !status; // default to completed if not specified

    if (isCompleted) {
        if (marksObtained === undefined || !maxMarks) {
            return res.status(400).json({ message: 'Marks obtained and max marks are required for completed exams' });
        }
        if (Number(marksObtained) > Number(maxMarks)) {
            return res.status(400).json({ message: 'Obtained marks cannot be greater than maximum marks' });
        }
    }

    try {
        const examData = {
            userId: req.user.id,
            examName,
            subjectId,
            date: date || new Date(),
            status: status || 'completed'
        };

        if (isCompleted) {
            examData.marksObtained = marksObtained;
            examData.maxMarks = maxMarks;
        }

        const exam = await Exam.create(examData);
        res.status(201).json({ exam });
    } catch (err) {
        next(err);
    }
};

const deleteExam = async (req, res, next) => {
    try {
        const exam = await Exam.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        res.json({ message: 'Exam record deleted' });
    } catch (err) {
        next(err);
    }
};

const updateExam = async (req, res, next) => {
    const { examName, subjectId, marksObtained, maxMarks, date, status } = req.body;
    try {
        const exam = await Exam.findOne({ _id: req.params.id, userId: req.user.id });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        if (examName) exam.examName = examName;
        if (subjectId) exam.subjectId = subjectId;
        if (date) exam.date = date;
        if (status) exam.status = status;

        const isCompleted = (status || exam.status) === 'completed';
        if (isCompleted) {
            if (marksObtained !== undefined) exam.marksObtained = marksObtained;
            if (maxMarks !== undefined) exam.maxMarks = maxMarks;

            if (exam.marksObtained > exam.maxMarks) {
                return res.status(400).json({ message: 'Obtained marks cannot be greater than maximum marks' });
            }
        } else {
            exam.marksObtained = undefined;
            exam.maxMarks = undefined;
        }

        await exam.save();
        res.json({ exam });
    } catch (err) {
        next(err);
    }
};

export {  getExams, createExam, deleteExam, updateExam  };
