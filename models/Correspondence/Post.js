const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publisherRole: {
        type: String,
        enum: ['patient', 'student', 'overseer', 'admin'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    // ✅ هذا هو التنسيق الصحيح - مصفوفة من النصوص
    images: {
        type: [String],
        default: []
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    dislikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikesCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', postSchema);