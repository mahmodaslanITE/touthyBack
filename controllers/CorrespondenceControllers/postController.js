const asyncHandler = require('express-async-handler');
const {User}=require('../../models/User')
const Post = require('../../models/Correspondence/Post');
const getUserProfile=require('../../functions/users');
const Comment = require('../../models/Correspondence/Comment');
// إنشاء بوست جديد
exports.createPost = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({
status:'error',            message: 'محتوى البوست مطلوب'
        });
    }

    // ✅ تخزين الروابط فقط (strings)
    let imagesArray = [];
    if (req.files && req.files.length > 0) {
        imagesArray = req.files.map(file => `/images/posts/${file.filename}`);
    }

    const post = await Post.create({
        publisher: userId,
        publisherRole: userRole,
        content: content.trim(),
        images: imagesArray  
    });

    res.status(201).json({
        status:'success',
        message: 'تم نشر البوست بنجاح',
        data: post
    });
});

// جلب جميع البوستات
exports.get_all_posts = asyncHandler(async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    let is_for_me;
    // ✅ الحل: انتظار كل العمليات غير المتزامنة
    const formated_post = await Promise.all(
        posts.map(async (post) => {
            const publisher = await User.findById(post.publisher);
            const publisher_role = publisher.role;
            const publisher_profile = await getUserProfile(post.publisher, publisher_role);
             is_for_me=false;
            if(post.publisher==req.user.id){is_for_me=true}
            return {
                _id:post._id,
                content:post.content,
                is_for_me,
                images:post.images,
                count_likes:post.likesCount,
                count_dislikes:post.dislikesCount,
                count_comments:post.commentsCount,
                created_at:post.createdAt,
                publisher_role:post.publisherRole,
                publisher:{
                    _id:post.publisher,
                    full_name:`${publisher_profile.first_name} ${publisher_profile.father_name} ${publisher_profile.last_name}`,
                    profile_photo:publisher_profile.profile_photo,
                    gender:publisher_profile.gender,
                    is_verified:publisher_profile.is_verified
                }
            };
        })
    );

    res.status(200).json({
        status: 'success',
        message: 'هذه هي كل البوستات',
        count: posts.length,
        data: formated_post
    });
});

// جلب بوست محدد مع التعليقات
exports.getPostById = asyncHandler(async (req, res) => {
    const postId  = req.params.id;
    // 1. جلب البوست
    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({
            status: 'error',
            message: 'البوست غير موجود'
        });
    }
    
    // 2. جلب بيانات الناشر
    const publisher = await User.findById(post.publisher);
    const publisher_role = publisher.role;
    const publisher_profile = await getUserProfile(post.publisher, publisher_role);
    
    // 3. تنسيق بيانات البوست (نفس طريقة get_all_posts)
    const formattedPost = {
        _id: post._id,
        content: post.content,
        images: post.images,
        count_likes: post.likesCount,
        count_dislikes: post.dislikesCount,
        count_comments: post.commentsCount,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
        publisher_role: post.publisherRole,
        publisher: {
            _id: post.publisher,
            full_name: `${publisher_profile.first_name} ${publisher_profile.father_name} ${publisher_profile.last_name}`,
            profile_photo: publisher_profile.profile_photo,
            gender: publisher_profile.gender,
            is_verified: publisher_profile.is_verified
        }
    };
    
    // 4. جلب التعليقات الخاصة بهذا البوست
    const comments = await Comment.find({ post: postId })
        .sort({ createdAt: -1 });
    let is_for_me;
    // 5. تنسيق التعليقات مع بيانات أصحابها
    const formattedComments = await Promise.all(
        comments.map(async (comment) => {
            is_for_me=false;
            const commentUser = await User.findById(comment.user);
            const commentUserRole = commentUser.role;
            const commentUserProfile = await getUserProfile(comment.user, commentUserRole);
            if(comment.user==req.user.id){is_for_me=true}
            return {
                _id: comment._id,
                content: comment.content,
                is_for_me,
                likes_count: comment.likesCount,
                created_at: comment.createdAt,
                user: {
                    _id: comment.user,
                    full_name: `${commentUserProfile.first_name} ${commentUserProfile.father_name} ${commentUserProfile.last_name}`,
                    profile_photo: commentUserProfile.profile_photo,
                    gender: commentUserProfile.gender,
                    is_verified: commentUserProfile.is_verified
                }
            };
        })
    );
    
    // 6. إرسال الرد
    res.status(200).json({
        status: 'success',
        message: 'هذا هو البوست مع تعليقاته',
        data: {
            post: formattedPost,
            comments: formattedComments,
        }
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
           status:'error',
            message: 'البوست غير موجود'
        });
    }

    if (post.publisher.toString() !== userId && !isAdmin) {
        return res.status(403).json({
            status:'error',
            message: 'غير مصرح لك بتعديل هذا البوست'
        });
    }

    if (content) {
        post.content = content.trim();
    }

    // ✅ إضافة صور جديدة (كروابط فقط)
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => `/images/posts/${file.filename}`);
        post.images = [...post.images, ...newImages];
    }

    await post.save();

    res.status(200).json({
        status:'success',
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
            status:'error',
            message: 'البوست غير موجود'
        });
    }

    if (post.publisher.toString() !== userId && !isAdmin) {
        return res.status(403).json({
            status:'error',
            message: 'غير مصرح لك بحذف هذا البوست'
        });
    }

    await post.deleteOne();

    res.status(200).json({
        status:'success',
        message: 'تم حذف البوست بنجاح'
    });
});

// إعجاب ببوست
exports.like_post = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            status:'error',
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
        status:'success',
        message: alreadyLiked ? 'تم إزالة الإعجاب' : 'تم الإعجاب بالبوست',
        data: {
            count_likes: post.likesCount,
            count_dislikes: post.dislikesCount
        }
    });
});

// عدم إعجاب ببوست
exports.dislikePost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);

    if (!post) {
        return res.status(404).json({
            status:'error',
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
        status:'success',
        message: alreadyDisliked ? 'تم إزالة عدم الإعجاب' : 'تم عدم الإعجاب بالبوست',
        data: {
            count_likes: post.likesCount,
            count_dislikes: post.dislikesCount
        }
    });
});

