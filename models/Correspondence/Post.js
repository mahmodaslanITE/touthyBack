const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publisher_role: { // تعديل إلى snake_case
        type: String,
        enum: ['patient', 'student', 'overseer', 'admin'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    images: {
        type: [String],
        default: []
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    count_likes: { // تعديل إلى snake_case
        type: Number,
        default: 0
    },
    dislikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    count_dislikes: { // تعديل إلى snake_case
        type: Number,
        default: 0
    },
    count_comments: { // تعديل إلى snake_case
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', postSchema);
