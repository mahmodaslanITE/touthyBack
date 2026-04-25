const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // مصفوفة تحتوي على معرفات المستخدمين (طبيب، مريض، الخ)
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // لتسهيل عرض آخر رسالة في قائمة المحادثات دون استعلام إضافي
  lastMessage: {
    text: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

// إنشاء فحص (Index) لتسريع البحث داخل المصفوفة
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
