const asyncHandler = require('express-async-handler');
const Post = require('../../models//Correspondence/Post')

// إنشاء بوست جديد
exports.createPost = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'محتوى البوست مطلوب'
        });
    }

    let imagesArray = [];
    if (req.files && req.files.length > 0) {
        imagesArray = req.files.map(file => ({
            url: `/images/posts/${file.filename}`,
            filename: file.filename
        }));
    }

    const post = await Post.create({
        publisher: userId,
        publisherRole: userRole,
        content: content.trim(),
        images: imagesArray
    });

    res.status(201).json({
        success: true,
        message: 'تم نشر البوست بنجاح',
        data: post
    });
});

// جلب جميع البوستات
exports.getAllPosts = asyncHandler(async (req, res) => {
    const posts = await Post.find()
        .populate('publisher', 'email role')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: posts.length,
        data: posts
    });
});

// جلب بوست محدد
exports.getPostById = asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id)
        .populate('publisher', 'email role');

    if (!post) {
        return res.status(404).json({
            success: false,
            message: 'البوست غير موجود'
        });
    }

    res.status(200).json({
        success: true,
        data: post
    });
});

// تحديث بوست
exports.updatePost = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            success: false,
            message: 'البوست غير موجود'
        });
    }

    if (post.publisher.toString() !== userId && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'غير مصرح لك بتعديل هذا البوست'
        });
    }

    if (content) {
        post.content = content.trim();
    }

    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => ({
            url: `/images/posts/${file.filename}`,
            filename: file.filename
        }));
        post.images = [...post.images, ...newImages];
    }

    await post.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث البوست بنجاح',
        data: post
    });
});

// حذف بوست
exports.deletePost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            success: false,
            message: 'البوست غير موجود'
        });
    }

    if (post.publisher.toString() !== userId && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'غير مصرح لك بحذف هذا البوست'
        });
    }

    await post.deleteOne();

    res.status(200).json({
        success: true,
        message: 'تم حذف البوست بنجاح'
    });
});

// إعجاب ببوست
exports.likePost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            success: false,
            message: 'البوست غير موجود'
        });
    }

    const alreadyLiked = post.likes.includes(userId);
    
    if (alreadyLiked) {
        post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
        post.likes.push(userId);
        post.dislikes = post.dislikes.filter(id => id.toString() !== userId);
        post.dislikesCount = post.dislikes.length;
    }
    
    post.likesCount = post.likes.length;
    await post.save();

    res.status(200).json({
        success: true,
        message: alreadyLiked ? 'تم إزالة الإعجاب' : 'تم الإعجاب بالبوست',
        data: {
            likesCount: post.likesCount,
            dislikesCount: post.dislikesCount
        }
    });
});

// عدم إعجاب ببوست
exports.dislikePost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            success: false,
            message: 'البوست غير موجود'
        });
    }

    const alreadyDisliked = post.dislikes.includes(userId);
    
    if (alreadyDisliked) {
        post.dislikes = post.dislikes.filter(id => id.toString() !== userId);
    } else {
        post.dislikes.push(userId);
        post.likes = post.likes.filter(id => id.toString() !== userId);
        post.likesCount = post.likes.length;
    }
    
    post.dislikesCount = post.dislikes.length;
    await post.save();

    res.status(200).json({
        success: true,
        message: alreadyDisliked ? 'تم إزالة عدم الإعجاب' : 'تم عدم الإعجاب بالبوست',
        data: {
            likesCount: post.likesCount,
            dislikesCount: post.dislikesCount
        }
    });
});