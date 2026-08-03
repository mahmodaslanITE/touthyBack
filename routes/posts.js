const express = require('express');
const router = express.Router();
const verifyToken = require('../Middlewares/verifyToken');
const uploadPostImages = require('../Middlewares/uploadPost');
const {
    createPost,
    getPostById,
    updatePost,
    deletePost,
    getAllPosts,
    dislikePost,
    likePost,
    getPendingPosts,
    acceptPendingPost,
    deletePendingPost,
    showUserPost
} = require('../controllers/CorrespondenceControllers/postController');

// 🔓 جميع الروتات تحتاج مصادقة
router.use(verifyToken);

// 📝 CRUD Operations
router.post('/', uploadPostImages.array('images'),verifyToken, createPost);
router.get('/', getAllPosts);
router.get('/my',showUserPost);
router.get('/pending', getPendingPosts);
router.delete('/pending/:id', deletePendingPost);
router.post('/pending/accept/:id', acceptPendingPost);
router.get('/:id', getPostById);
router.put('/:id', uploadPostImages.array('images', 5), updatePost);    
router.delete('/:id', deletePost);

// ❤️ تفاعلات
router.post('/:id/like', likePost);
router.post('/:id/dislike', dislikePost);
    
module.exports = router;