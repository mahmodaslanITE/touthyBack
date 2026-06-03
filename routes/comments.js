const express = require('express');
const router = express.Router();
const verifyToken = require('../Middlewares/verifyToken');
const {
    addComment,
    getPostComments,
    updateComment,
    deleteComment,
    likeComment
} = require('../controllers/CorrespondenceControllers/commentController');

// 🔓 جميع الروتات تحتاج مصادقة
router.use(verifyToken);

// 📝 تعليقات البوست
router.post('/:id', addComment);
router.get('/:id', getPostComments);

// 🔧 عمليات على التعليق نفسه
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);
router.post('/comments/:commentId/like', likeComment);

module.exports = router;