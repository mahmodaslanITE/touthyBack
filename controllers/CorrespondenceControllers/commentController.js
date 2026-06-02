const asyncHandler = require('express-async-handler');
const Comment = require('../../models/Correspondence/Comment');
const Post = require('../../models/Correspondence/Post');

/**
 * @desc Add a comment to a post
 * @route POST /api/posts/:postId/comments
 * @access Private (any authenticated user)
 */
exports.addComment = asyncHandler(async (req, res) => {
    const  postId  = req.params.id;
    const content  = req.body.content;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. التحقق من وجود المحتوى
    if (!content || content.trim().length === 0) {
        return res.status(400).json({
status:'error',            message: 'محتوى التعليق مطلوب'
        });
    }

    // 2. التحقق من وجود البوست
    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({
            status:'error', 
            message: 'البوست غير موجود'
        });
    }

    // 3. إنشاء التعليق
    const comment = await Comment.create({
        post: postId,
        user: userId,
        userRole: userRole,
        content: content.trim()
    });

    // 4. زيادة عدد التعليقات في البوست
    post.commentsCount += 1;
    await post.save();

    // 5. جلب التعليق مع بيانات المستخدم
    const populatedComment = await Comment.findById(comment._id)
        .populate('user', 'email role');

    res.status(201).json({
        status:'success', 
        message: 'تم إضافة التعليق بنجاح',
        data: populatedComment
    });
});

/**
 * @desc Get all comments for a post
 * @route GET /api/posts/:postId/comments
 * @access Private (any authenticated user)
 */
exports.getPostComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // 1. التحقق من وجود البوست
    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({
            success: false,
            message: 'البوست غير موجود'
        });
    }

    // 2. جلب التعليقات
    const comments = await Comment.find({ post: postId })
        .populate('user', 'email role')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Comment.countDocuments({ post: postId });

    res.status(200).json({
        success: true,
        count: comments.length,
        total: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: comments
    });
});

/**
 * @desc Update a comment (only comment owner or admin)
 * @route PUT /api/comments/:commentId
 * @access Private (comment owner or admin)
 */
exports.updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // 1. البحث عن التعليق
    const comment = await Comment.findById(commentId);
    if (!comment) {
        return res.status(404).json({
            success: false,
            message: 'التعليق غير موجود'
        });
    }

    // 2. التحقق من الصلاحية
    if (comment.user.toString() !== userId && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'غير مصرح لك بتعديل هذا التعليق'
        });
    }

    // 3. التحقق من وجود المحتوى
    if (!content || content.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'محتوى التعليق مطلوب'
        });
    }

    // 4. تحديث التعليق
    comment.content = content.trim();
    await comment.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث التعليق بنجاح',
        data: comment
    });
});

/**
 * @desc Delete a comment (only comment owner or admin)
 * @route DELETE /api/comments/:commentId
 * @access Private (comment owner or admin)
 */
exports.deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // 1. البحث عن التعليق
    const comment = await Comment.findById(commentId);
    if (!comment) {
        return res.status(404).json({
            success: false,
            message: 'التعليق غير موجود'
        });
    }

    // 2. التحقق من الصلاحية
    if (comment.user.toString() !== userId && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'غير مصرح لك بحذف هذا التعليق'
        });
    }

    // 3. حذف التعليق
    await comment.deleteOne();

    // 4. تقليل عدد التعليقات في البوست
    await Post.findByIdAndUpdate(comment.post, {
        $inc: { commentsCount: -1 }
    });

    res.status(200).json({
        success: true,
        message: 'تم حذف التعليق بنجاح'
    });
});

/**
 * @desc Like a comment
 * @route POST /api/comments/:commentId/like
 * @access Private (any authenticated user)
 */
exports.likeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        return res.status(404).json({
            success: false,
            message: 'التعليق غير موجود'
        });
    }

    const alreadyLiked = comment.likes.includes(userId);
    
    if (alreadyLiked) {
        comment.likes = comment.likes.filter(id => id.toString() !== userId);
    } else {
        comment.likes.push(userId);
    }
    
    comment.likesCount = comment.likes.length;
    await comment.save();

    res.status(200).json({
        success: true,
        message: alreadyLiked ? 'تم إزالة الإعجاب' : 'تم الإعجاب بالتعليق',
        data: {
            likesCount: comment.likesCount
        }
    });
});