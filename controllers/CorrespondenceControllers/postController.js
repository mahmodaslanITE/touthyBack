// controllers/CorrespondenceControllers/postController.js
const asyncHandler = require('express-async-handler');
const { User } = require('../../models/User');
const Post = require('../../models/Correspondence/Post');
const Comment = require('../../models/Correspondence/Comment');
const getUserProfile = require('../../utils/users');
const fs = require('fs');
const path = require('path');

// ============================================================
// 📦 HELPER FUNCTIONS
// ============================================================

/**
 * Format post object with publisher details
 */
const formatPost = async (post, reqUserId) => {
    try {
        // ✅ تحويل post إلى كائن عادي باستخدام toObject
        const postObj = post.toObject ? post.toObject() : post;
        
        const formattedImages = postObj.images?.map(img => ({
            url: `${process.env.BASE_URL}/${img.url}`,
            publicId: img.publicId,
            _id: img._id
        }
    )) || [];

        if (!postObj.publisher) {
            return {
                _id: postObj._id,
                content: postObj.content,
                is_for_me: false,
                images: formattedImages,
                count_likes: postObj.count_likes || 0,
                count_dislikes: postObj.count_dislikes || 0,
                count_comments: postObj.count_comments || 0,
                created_at: postObj.createdAt,
                publisher_role: postObj.publisher_role,
                publisher: {
                    _id: null,
                    full_name: 'ناشر محذوف',
                    profile_photo: null,
                    gender: null,
                    is_verified: false
                }
            };
        }

        const publisher = await User.findById(postObj.publisher);
        
        if (!publisher) {
            return {
                _id: postObj._id,
                content: postObj.content,
                is_for_me: false,
                images: formattedImages,
                count_likes: postObj.count_likes || 0,
                count_dislikes: postObj.count_dislikes || 0,
                count_comments: postObj.count_comments || 0,
                created_at: postObj.createdAt,
                publisher_role: postObj.publisher_role,
                publisher: {
                    _id: postObj.publisher,
                    full_name: 'مستخدم غير موجود',
                    profile_photo: null,
                    gender: null,
                    is_verified: false
                }
            };
        }

        const publisherProfile = await getUserProfile(postObj.publisher, publisher.role);
        const isForMe = postObj.publisher.toString() === reqUserId;

        return {
            _id: postObj._id,
            content: postObj.content,
            is_for_me: isForMe,
            images: formattedImages,
            count_likes: postObj.count_likes || 0,
            count_dislikes: postObj.count_dislikes || 0,
            count_comments: postObj.count_comments || 0,
            created_at: postObj.createdAt,
            publisher_role: postObj.publisher_role,
            publisher: {
                _id: postObj.publisher,
                full_name: publisherProfile ? 
                    `${publisherProfile.first_name} ${publisherProfile.father_name} ${publisherProfile.last_name}` : 
                    publisher.email || 'مستخدم',
                profile_photo: publisherProfile?.profile_photo ? 
                    `${process.env.BASE_URL}/${publisherProfile.profile_photo.url}` : null,
                gender: publisherProfile?.gender || null,
                is_verified: publisherProfile?.is_verified || false
            }
        };
    } catch (error) {
        console.error('Error in formatPost:', error.message);
        return {
            _id: post._id,
            content: post.content,
            is_for_me: false,
            images: post.images || [],
            count_likes: post.count_likes || 0,
            count_dislikes: post.count_dislikes || 0,
            count_comments: post.count_comments || 0,
            created_at: post.createdAt,
            publisher_role: post.publisher_role,
            publisher: {
                _id: null,
                full_name: 'خطأ في جلب البيانات',
                profile_photo: null,
                gender: null,
                is_verified: false
            }
        };
    }
};

/**
 * Format comment object with user details
 */
const formatComment = async (comment, reqUserId) => {
    try {
        // ✅ تحويل comment إلى كائن عادي
        const commentObj = comment.toObject ? comment.toObject() : comment;
        
        // ✅ تحويل المعرفات إلى string للمقارنة
        const currentUserId = String(reqUserId);
        const commentUserId = commentObj.user ? String(commentObj.user) : null;
        
        // ✅ المقارنة المباشرة
        const isForMe = (commentUserId === currentUserId);

        // حالة عدم وجود مستخدم
        if (!commentObj.user) {
            return {
                _id: commentObj._id,
                content: commentObj.content,
                is_for_me: false,
                likes_count: commentObj.likes_count || 0,
                created_at: commentObj.createdAt,
                user: {
                    _id: null,
                    full_name: 'مستخدم محذوف',
                    profile_photo: null,
                    gender: null,
                    is_verified: false
                }
            };
        }

        // جلب بيانات المستخدم
        const user = await User.findById(commentObj.user);
        
        if (!user) {
            return {
                _id: commentObj._id,
                content: commentObj.content,
                is_for_me: isForMe,
                likes_count: commentObj.likes_count || 0,
                created_at: commentObj.createdAt,
                user: {
                    _id: commentObj.user,
                    full_name: 'مستخدم غير موجود',
                    profile_photo: null,
                    gender: null,
                    is_verified: false
                }
            };
        }

        // جلب الملف الشخصي
        const userProfile = await getUserProfile(commentObj.user, user.role);

        // بناء اسم كامل
        let fullName = user.email || 'مستخدم';
        if (userProfile && userProfile.first_name) {
            fullName = `${userProfile.first_name || ''} ${userProfile.father_name || ''} ${userProfile.last_name || ''}`.trim();
            if (!fullName) fullName = user.email || 'مستخدم';
        }

        // ✅ إرجاع الكائن مع is_for_me
        return {
            _id: commentObj._id,
            content: commentObj.content,
            is_for_me: isForMe,
            likes_count: commentObj.likes_count || 0,
            created_at: commentObj.createdAt,
            user: {
                _id: commentObj.user,
                full_name: fullName,
                profile_photo: userProfile?.profile_photo ? 
                    `${process.env.BASE_URL}/${userProfile.profile_photo.url}` : null,
                gender: userProfile?.gender || null,
                is_verified: userProfile?.is_verified || false
            }
        };
    } catch (error) {
        console.error('Error in formatComment:', error.message);
        return {
            _id: comment._id,
            content: comment.content,
            is_for_me: false,
            likes_count: comment.likes_count || 0,
            created_at: comment.createdAt,
            user: {
                _id: null,
                full_name: 'خطأ في جلب البيانات',
                profile_photo: null,
                gender: null,
                is_verified: false
            }
        };
    }
};

// ============================================================
// 🗑️ HELPER: DELETE IMAGES
// ============================================================

/**
 * Delete images from filesystem
 */
const deleteImagesFromStorage = (images) => {
    if (!images || images.length === 0) return;
    
    images.forEach(image => {
        try {
            // استخراج اسم الملف من URL
            const urlParts = image.url.split('/');
            const filename = urlParts[urlParts.length - 1];
            
            // تحديد المسار الكامل للملف
            const filePath = path.join(__dirname, '../../public/images/posts', filename);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`✅ Deleted image: ${filename}`);
            } else {
                console.log(`⚠️ Image not found: ${filename}`);
            }
        } catch (error) {
            console.error(`❌ Error deleting image ${image.publicId}:`, error.message);
        }
    });
};

// ============================================================
// 📝 POST CRUD OPERATIONS
// ============================================================

/**
 * @description Create a new post
 * @route POST /api/posts
 * @access Private (any authenticated user)
 */
exports.createPost = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'محتوى البوست مطلوب'
        });
    }

    const images = req.files?.map(file => ({
        url: `images/posts/${file.filename}`,
        publicId: `posts/${file.filename.split('.')[0]}`
    })) || [];

    const post = await Post.create({
        publisher: userId,
        publisher_role: userRole,
        content: content.trim(),
        images
    });

    // ✅ استخدام formatPost لتنسيق البوست مع معلومات الناشر
    const formattedPost = await formatPost(post, userId);

    res.status(201).json({
        status: 'success',
        message: 'تم نشر البوست بنجاح',
        data: formattedPost
    });
});

/**
 * @description Get all posts with pagination and filtering
 * @route GET /api/posts
 * @access Private (any authenticated user)
 */
exports.getAllPosts = asyncHandler(async (req, res) => {
    // ============================================================
    // 📄 PAGINATION SETUP
    // ============================================================
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 3));
    const skip = (page - 1) * limit;
    
    const sortField = req.query.sort || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };
    
    // ============================================================
    // 🎯 BUILD FILTER (ONLY IF REQUESTED)
    // ============================================================
    
    let filter = {};
    
    // ✅ التصفية حسب نوع المستخدم (إذا طلبها المستخدم)
    if (req.query.filter) {
        const validRoles = ['patient', 'student', 'overseer', 'admin'];
        if (validRoles.includes(req.query.filter)) {
            filter.publisher_role = req.query.filter;
        }
    }
    
    // ============================================================
    // 📊 EXECUTE QUERY
    // ============================================================
    
    // أولاً: جلب العدد الإجمالي للبوستات التي تطابق الفلتر
    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit);
    
    // ثانياً: جلب البوستات المفلترة مع Pagination
    const posts = await Post.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(); // ✅ استخدام lean للحصول على كائنات JavaScript عادية
    
    // ثالثاً: تنسيق البوستات
    const formattedPosts = await Promise.all(
        posts.map(post => formatPost(post, req.user.id))
    );
    
    // ============================================================
    // 📤 RESPONSE
    // ============================================================
    
    const startItem = totalPosts === 0 ? 0 : skip + 1;
    const endItem = Math.min(skip + limit, totalPosts);
    
    res.status(200).json({
        status: 'success',
        message: 'هذه هي كل البوستات',
        ...(req.query.filter && { applied_filter: req.query.filter }),
        pagination: {
            current_page: page,
            total_pages: totalPages,
            total_items: totalPosts,
            items_per_page: limit,
            range: totalPosts === 0 ? '0 of 0' : `${startItem}-${endItem} of ${totalPosts}`,
            has_next: page < totalPages,
            has_prev: page > 1,
            next_page: page < totalPages ? page + 1 : null,
            prev_page: page > 1 ? page - 1 : null
        },
        sorting: {
            field: sortField,
            order: sortOrder === 1 ? 'asc' : 'desc'
        },
        count: posts.length,
        data: formattedPosts
    });
});

/**
 * @description Get a specific post with comments
 * @route GET /api/posts/:id
 * @access Private (any authenticated user)
 */
exports.getPostById = asyncHandler(async (req, res) => {
    const { id: postId } = req.params;
    const post = await Post.findById(postId).lean(); // ✅ استخدام lean

    if (!post) {
        return res.status(404).json({
            status: 'error',
            message: 'البوست غير موجود'
        });
    }

    const formattedPost = await formatPost(post, req.user.id);
    const comments = await Comment.find({ post: postId }).sort({ createdAt: -1 }).lean(); // ✅ استخدام lean
    const formattedComments = await Promise.all(comments.map(comment => formatComment(comment, req.user.id)));

    res.status(200).json({
        status: 'success',
        message: 'هذا هو البوست مع تعليقاته',
        data: {
            post: formattedPost,
            comments: formattedComments,
            comments_count: formattedComments.length
        }
    });
});

/**
 * @description Update a post
 * @route PUT /api/posts/:id
 * @access Private (publisher or admin)
 */
exports.updatePost = asyncHandler(async (req, res) => {
    const { content, deleteImages } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            status: 'error',
            message: 'البوست غير موجود'
        });
    }

    // ✅ Check authorization
    if (post.publisher.toString() !== userId && !isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح لك بتعديل هذا البوست'
        });
    }

    // ✅ Update content if provided
    if (content) {
        post.content = content.trim();
    }

    // ✅ Delete specified images
    if (deleteImages && Array.isArray(deleteImages) && deleteImages.length > 0) {
        // Find images to delete
        const imagesToDelete = post.images.filter(img => deleteImages.includes(img.publicId));
        
        // Delete from filesystem
        deleteImagesFromStorage(imagesToDelete);
        
        // Remove from post
        post.images = post.images.filter(img => !deleteImages.includes(img.publicId));
    }

    // ✅ Add new images
    if (req.files?.length > 0) {
        const newImages = req.files.map(file => ({
            url: `images/posts/${file.filename}`,
            publicId: `posts/${file.filename.split('.')[0]}`
        }));
        post.images.push(...newImages);
    }

    await post.save();

    // ✅ استخدام formatPost لتنسيق البوست مع معلومات الناشر
    const formattedPost = await formatPost(post, userId);

    res.status(200).json({
        status: 'success',
        message: 'تم تحديث البوست بنجاح',
        data: formattedPost
    });
});

/**
 * @description Delete a post
 * @route DELETE /api/posts/:id
 * @access Private (publisher or admin)
 */
exports.deletePost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            status: 'error',
            message: 'البوست غير موجود'
        });
    }

    // ✅ Check authorization
    if (post.publisher.toString() !== userId && !isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح لك بحذف هذا البوست'
        });
    }

    // ✅ Delete all images from storage
    if (post.images && post.images.length > 0) {
        deleteImagesFromStorage(post.images);
    }

    await post.deleteOne();

    res.status(200).json({
        status: 'success',
        message: 'تم حذف البوست بنجاح'
    });
});

// ============================================================
// ❤️ POST INTERACTIONS
// ============================================================

/**
 * @description Like a post
 * @route POST /api/posts/:id/like
 * @access Private (any authenticated user)
 */
exports.likePost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            status: 'error',
            message: 'البوست غير موجود'
        });
    }

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
        post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
        post.likes.push(userId);
        post.dislikes = post.dislikes.filter(id => id.toString() !== userId);
    }

    post.count_likes = post.likes.length;
    post.count_dislikes = post.dislikes.length;
    await post.save();

    res.status(200).json({
        status: 'success',
        message: alreadyLiked ? 'تم إزالة الإعجاب' : 'تم الإعجاب بالبوست',
        data: {
            count_likes: post.count_likes,
            count_dislikes: post.count_dislikes
        }
    });
});

/**
 * @description Dislike a post
 * @route POST /api/posts/:id/dislike
 * @access Private (any authenticated user)
 */
exports.dislikePost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            status: 'error',
            message: 'البوست غير موجود'
        });
    }

    const alreadyDisliked = post.dislikes.includes(userId);

    if (alreadyDisliked) {
        post.dislikes = post.dislikes.filter(id => id.toString() !== userId);
    } else {
        post.dislikes.push(userId);
        post.likes = post.likes.filter(id => id.toString() !== userId);
    }

    post.count_likes = post.likes.length;
    post.count_dislikes = post.dislikes.length;
    await post.save();

    res.status(200).json({
        status: 'success',
        message: alreadyDisliked ? 'تم إزالة عدم الإعجاب' : 'تم عدم الإعجاب بالبوست',
        data: {
            count_likes: post.count_likes,
            count_dislikes: post.count_dislikes
        }
    });
});