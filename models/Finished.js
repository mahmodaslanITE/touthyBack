const mongoose = require('mongoose');

const FinishedSchema = new mongoose.Schema({
    // بيانات الطلب الأصلية (يُفضل أن تطابق نفس الحقول في InProcess)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    overseer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // المشرف الذي أنهى الطلب
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    // حقول التقييم والإغلاق الجديدة
    rating: {
        type: Number,
        required: [true, 'الرجاء إضافة تقييم'],
        min: 1,
        max: 5
    },
    feedback: {
        type: String,
        trim: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    },
    originalCreatedAt: {
        type: Date // لتخزين تاريخ إنشاء الطلب الأصلي للتحليل الإحصائي لاحقاً
    }
}, {
    timestamps: true // لإنشاء createdAt و updatedAt تلقائياً
});

const Finished = mongoose.model('Finished', FinishedSchema);

module.exports = Finished;
