// controllers/dashboardController.js
const asyncHandler = require('express-async-handler');
const { Pending_request } = require('../models/Pending_request');
const InProcess_request = require('../models/InProcess_request');
const Finished_request = require('../models/Finished_request');
const Post = require('../models/Correspondence/Post');

// ============================================================
// 📦 HELPER FUNCTIONS (دوال مساعدة)
// ============================================================

/**
 * Build full image URL from request
 * @param {Object} req - Express request object
 * @param {string} imagePath - Image path from database
 * @returns {string|null} - Full image URL
 */
const buildImageUrl = ( imagePath) => {
    return `${process.env.BASE_URL}/${imagePath.url}`;
};

/**
 * Format post with full image URL
 * @param {Object} req - Express request object
 * @param {Object} post - Post document
 * @returns {Object} Formatted post
 */
const formatPost = ( post) => {
    const images = post.images?.map(img => buildImageUrl( img)) || [];
    
    return {
        _id: post._id,
        content: post.content,
        images: images,
        likes_count: post.count_likes || post.likesCount || 0,
        comments_count: post.count_comments || post.commentsCount || 0,
        created_at: post.createdAt,
        publisher: post.publisher,
        publisher_role: post.publisher_role
    };
};

// ============================================================
// 📊 DASHBOARD CONTROLLER
// ============================================================

/**
 * @description Get user dashboard statistics and top posts
 * @route GET /api/dashboard
 * @access Private (any authenticated user)
 */
module.exports.getDashboard = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = req.user.isAdmin;

    // ============================================================
    // 1. 📊 حالة الطلبات (حسب الدور)
    // ============================================================

    let stats = {};

    if (userRole === 'patient') {
        // ============================================================
        // 🏥 PATIENT DASHBOARD
        // ============================================================
        
        // عدد الطلبات المعلقة (Pending)
        const pendingCount = await Pending_request.countDocuments({ user: userId });
        
        // عدد الطلبات قيد المعالجة (Processing)
        const processingCount = await InProcess_request.countDocuments({ patient: userId });
        
        // عدد الطلبات المنتهية (Finished)
        const finishedCount = await Finished_request.countDocuments({ patient: userId });

        stats = {
            pending: pendingCount,
            processing: processingCount,
            finished: finishedCount,
            total: pendingCount + processingCount + finishedCount
        };

    } else if (userRole === 'student' || userRole === 'overseer' || isAdmin) {
        // ============================================================
        // 🎓 STUDENT / 👨‍🏫 OVERSEER / 👑 ADMIN DASHBOARD
        // ============================================================
        
        let query = {};
        
        if (userRole === 'student') {
            query.student = userId;
        } else if (userRole === 'overseer') {
            query.overseer = userId;
        }
        // إذا كان أدمن، لا نضيف شرط (يرى كل الطلبات)

        // عدد الطلبات قيد المعالجة
        const processingCount = await InProcess_request.countDocuments(query);
        
        // عدد الطلبات المنتهية
        const finishedCount = await Finished_request.countDocuments(query);

        stats = {
            processing: processingCount,
            finished: finishedCount,
            total: processingCount + finishedCount
        };
    }

    // ============================================================
    // 2. 🔥 أكثر 3 بوستات تفاعلاً (من حيث عدد الإعجابات)
    // ============================================================

    // جلب البوستات مرتبة حسب عدد الإعجابات (تنازلياً) مع حد 3
    const topPosts = await Post.find({})
        .sort({ count_likes: -1, createdAt: -1 })
        .limit(3)
console.log(`the top posts is ${topPosts}`)
    // تنسيق البوستات
    const formattedPosts = topPosts.map(post => formatPost(req, post));

    // ============================================================
    // 3. 📤 إرسال الرد
    // ============================================================

    res.status(200).json({
        status: 'success',
        message: 'تم جلب بيانات لوحة التحكم بنجاح',
        data: {
            role: userRole,
            stats: stats,
            top_posts: {
                count: formattedPosts.length,
                data: formattedPosts
            }
        }
    });
});

/**
 * @description Get dashboard statistics only (without top posts)
 * @route GET /api/dashboard/stats
 * @access Private (any authenticated user)
 */
module.exports.getDashboardStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = req.user.isAdmin;

    let stats = {};

    if (userRole === 'patient') {
        const [pendingCount, processingCount, finishedCount] = await Promise.all([
            Pending_request.countDocuments({ user: userId }),
            InProcess_request.countDocuments({ patient: userId }),
            Finished_request.countDocuments({ patient: userId })
        ]);

        stats = {
            pending: pendingCount,
            processing: processingCount,
            finished: finishedCount,
            total: pendingCount + processingCount + finishedCount
        };

    } else if (userRole === 'student' || userRole === 'overseer' || isAdmin) {
        let query = {};
        
        if (userRole === 'student') {
            query.student = userId;
        } else if (userRole === 'overseer') {
            query.overseer = userId;
        }

        const [processingCount, finishedCount] = await Promise.all([
            InProcess_request.countDocuments(query),
            Finished_request.countDocuments(query)
        ]);

        stats = {
            processing: processingCount,
            finished: finishedCount,
            total: processingCount + finishedCount
        };
    }

    res.status(200).json({
        status: 'success',
        message: 'تم جلب إحصائيات لوحة التحكم بنجاح',
        data: {
            role: userRole,
            stats: stats
        }
    });
});

/**
 * @description Get top posts only (most liked)
 * @route GET /api/dashboard/top-posts
 * @access Private (any authenticated user)
 */
module.exports.getTopPosts = asyncHandler(async (req, res) => {
    const { limit = 3 } = req.query;

    const topPosts = await Post.find({})
        .sort({ count_likes: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .populate('publisher', 'email role')
        .lean();

    const formattedPosts = topPosts.map(post => formatPost(req, post));

    res.status(200).json({
        status: 'success',
        message: `أكثر ${formattedPosts.length} بوست تفاعلاً`,
        count: formattedPosts.length,
        data: formattedPosts
    });
});