const mongoose = require('mongoose');

const course_schema = new mongoose.Schema({
  // اسم المادة
  course_name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  // المشرفين (خريطة تحتوي على الفئة ومصفوفة من المعرفات)
  overseers: {
    type: Map,
    of: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'OverseerProfile' // المرجع لجدول المشرفين
    }],
    required: true,
    default: {}
  }
}, { 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
});

const Course = mongoose.model('Course', course_schema);

module.exports = Course;
