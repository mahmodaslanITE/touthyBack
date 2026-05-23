// models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'المبلغ مطلوب']
    },
    reported: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'المستخدم المبلغ عنه مطلوب']
    },
    reason: {
        type: String,
    },
    type: {
        type: String,
        default: 'other'
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed'],
        default: 'pending'
    },
    adminNotes: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
});

module.exports = mongoose.model('Report', reportSchema);