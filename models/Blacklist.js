const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true  // ✅ منع تكرار التوكن
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ✅ إنشاء فهرس لحذف التوكنات المنتهية تلقائياً
blacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Blacklist = mongoose.model('Blacklist', blacklistSchema);
module.exports = Blacklist;