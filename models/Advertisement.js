// models/Advertisement.js
const { object } = require('joi');
const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'محتوى الإعلان مطلوب'],
        trim: true,
        maxlength: [500, 'محتوى الإعلان لا يمكن أن يتجاوز 500 حرف']
    },
    
    image: {
        type: Object},
    
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, {
    timestamps: true
});

// ✅ التحقق من عدم تجاوز 3 إعلانات قبل الحفظ
advertisementSchema.pre('save', async function(next) {
    // حساب عدد الإعلانات الموجودة (باستثناء الإعلان الحالي إذا كان موجوداً)
    const count = await this.constructor.countDocuments({
        _id: { $ne: this._id } // استبعاد الإعلان الحالي (في حالة التحديث)
    });
    
    // إذا كان هناك 3 إعلانات أو أكثر ولا نقوم بتحديث إعلان موجود
    if (count >= 3 && !this._id) {
        const error = new Error('لا يمكن أن يكون هناك أكثر من 3 إعلانات');
        error.status = 400;
        return next(error);
    }
    
    next();
});



module.exports = mongoose.model('Advertisement', advertisementSchema);