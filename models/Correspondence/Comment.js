const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    user: { // تعديل إلى snake_case
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user_role: { // تعديل إلى snake_case
        type: String,
        enum: ['patient', 'student', 'overseer', 'admin'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: [1000, 'التعليق لا يمكن أن يتجاوز 1000 حرف']
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    count_likes: { // تعديل إلى snake_case
        type: Number,
        default: 0
    },
    created_at: { // تعديل إلى snake_case
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// إضافة فهرس لتحسين الأداء
commentSchema.index({ post_id: 1, created_at: -1 }); // تعديل الفهرس إلى snake_case

module.exports = mongoose.model('Comment', commentSchema);