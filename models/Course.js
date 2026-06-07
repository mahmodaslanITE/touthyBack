const mongoose = require('mongoose');

const course_schema = new mongoose.Schema({
  // اسم المادة
  course_name: { 
    type: String, 
    required: true, 
    trim: true 
  },
}, { 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
});

const Course = mongoose.model('Course', course_schema);

module.exports = Course;
