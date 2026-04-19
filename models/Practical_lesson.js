const mongoose = require('mongoose');

const lesson_schema = mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  // قائمة بـ IDs المشرفين
  overseers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  time:{
    type:String,
    required:true
  },
hall:{
    type:String,
    required:true
}
});
const Joi = require('joi');

// دالة التحقق من إضافة درس عملي جديد
function validate_practical_lesson(obj) {
    const schema = Joi.object({
        course: Joi.string().hex().length(24).required().messages({
            'string.length': 'معرف الكورس غير صحيح',
            'any.required': 'حقل الكورس مطلوب'
        }),
        category: Joi.string().hex().length(24).required().messages({
            'string.length': 'معرف الفئة غير صحيح',
            'any.required': 'حقل الفئة مطلوب'
        }),
        // التحقق من أن overseers عبارة عن مصفوفة تحتوي على نصوص بتنسيق ObjectId
        overseers: Joi.array().items(
            Joi.string().hex().length(24)
        ).min(1).messages({
            'array.min': 'يجب إضافة مشرف واحد على الأقل',
            'string.length': 'أحد معرفات المشرفين غير صحيح'
        }),
        time: Joi.string().trim().required().messages({
            'any.required': 'وقت الدرس مطلوب'
        }),
        hall: Joi.string().trim().required().messages({
            'any.required': 'القاعة مطلوبة'
        })
    });

    return schema.validate(obj);
}

module.exports = {
    validate_practical_lesson
};

const Practial_lesson=mongoose.model('Practial_lesson',lesson_schema);
module.exports={Practial_lesson,validate_practical_lesson}
