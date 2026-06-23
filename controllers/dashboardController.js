// controllers/dashboardController.js
const asyncHandler = require('express-async-handler');
const { Pending_request } = require('../models/Pending_request');
const InProcess_request = require('../models/InProcess_request');
const Finished_request = require('../models/Finished_request');
const Post = require('../models/Correspondence/Post');
const Advertisement = require('../models/Advertisement');
const { User } = require('../models/User');
const getUserProfile = require('../utils/users');
const Student_profile = require('../models/Student_profile');
const Patient_profile = require('../models/Patient_profile');
const { Overseer_profile } = require('../models/Overseer_profile');
const getCaseCounts = require('../utils/count_cases');

// ============================================================
// 📦 HELPER FUNCTIONS (دوال مساعدة)
// ============================================================

/**
 * Build full image URL from request
 */
const buildImageUrl = (imagePath) => {
    if(imagePath){
    return `${process.env.BASE_URL}/${imagePath}`;}
};

/**
 * Format post with full image URL (url + publicId)
 */
// const formatPost = ( post) => {
//     // ✅ تنسيق الصور مع الرابط الكامل (لكل صورة url و publicId)
//     let formattedImages = [];
//     if (post.images && Array.isArray(post.images)) {
//         formattedImages = post.images.map(img => ({
//             url: buildImageUrl(img.url),
//             publicId: img.publicId || null
//         }));
//     }

//     return {
//         _id: post._id,
//         content: post.content,
//         images: formattedImages,
//         likes_count: post.count_likes || post.likesCount || 0,
//         comments_count: post.count_comments || post.commentsCount || 0,
//         created_at: post.createdAt,
//         publisher: post.publisher,
//         publisher_role: post.publisher_role
//     };
// };

const formatPost = async (post) => {
    try {
        // ✅ تحويل post إلى كائن عادي باستخدام toObject
        const postObj = post.toObject ? post.toObject() : post;
        const formattedImages = postObj.images?.map(img => ({
           url: `${process.env.BASE_URL}/${img.url}`,

            publicId: img.publicId,
            _id: img._id
        }

    ))
 
    || [];

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
        const isForMe =false;

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
        console.error('Error in formatPost:', error);
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
 * Format advertisement with full image URL
 */
const formatAdvertisement = (ad) => {
    let imageUrl = null;
    if (ad.image) {
        imageUrl = buildImageUrl(ad.image.url);
    }

    return {
        _id: ad._id,
        content: ad.content,
        image: {url:imageUrl},
        is_active: ad.is_active,
        created_at: ad.createdAt,
        updated_at: ad.updatedAt
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
module.exports.getUserDashboard = asyncHandler(async (req, res) => {

    // ============================================================
    // 1. 📊 حالة الطلبات (حسب الدور)
    // ============================================================

    let requests = {};

        const [pendingCount, processingCount, finishedCount] = await Promise.all([
            Pending_request.countDocuments({}),
            InProcess_request.countDocuments({}),
            Finished_request.countDocuments({})
        ]);

        requests = {
            pending: pendingCount,
            processing: processingCount,
            finished: finishedCount,
            total: pendingCount + processingCount + finishedCount
        };

    // ============================================================
    // 2. 🔥 أكثر 3 بوستات تفاعلاً (من حيث عدد الإعجابات)
    // ============================================================

    const topPosts = await Post.find({})
        .sort({ count_likes: -1, createdAt: -1 })
        .limit(3)

        
        const formattedPosts = await Promise.all(
            topPosts.map(async (post) => {
                return await formatPost(post);
            })
        );

    // ============================================================
    // 3. 📢 الإعلانات النشطة (حد أقصى 3)
    // ============================================================

    const advertisements = await Advertisement.find()
        .sort({ createdAt: -1 })
        

    const formattedAdvertisements = advertisements.map(ad => formatAdvertisement(ad));

    // ============================================================
    //4 جلب اعداد المستخدمين 
    // ============================================================

        const count_users=await User.countDocuments({})
        const count_students=await Student_profile.countDocuments({})
        const count_patients=await Patient_profile.countDocuments({})
        const count_overseers=await Overseer_profile.countDocuments({})
        const users={
            count_users,count_students,count_patients,count_overseers
        }

       // ============================================================
    // 5. في حال وجود توكن 
    // ============================================================ 
let finished=0;
let inProcess=0;
let pending=0;
    if(req.user){
        const userId=req.user.id;
        const role=req.user.role
         const cases=await getCaseCounts(userId,role);
         finished=cases.finished;
         inProcess=cases.inProcess;
         if(cases.pending){pending=cases.pending}
        console.log(` the count of finish is ${finished},
            and the count of processing ${inProcess}
            and the pending is ${pending}`
        )
       
    }
    // ============================================================
    // 6. 📤 إرسال الرد
    // ============================================================

    res.status(200).json({
        status: 'success',
        message: 'هذه لوحة التحكم الرئيسية',
        data: {
            requests: requests,
            my_cases:(req.user)? {
                    
                    finished: finished || 0,
                    in_process: inProcess || 0,
                    pending:(req.user.role==="patient")?pending:null
             }:" ليس لديك اي حالة لانك لم تسجل الدخول على منصتنا بعد ",
            users,
            top_posts: {
                count: formattedPosts.length,
                data: formattedPosts
            },
            adv: {
                count: formattedAdvertisements.length,
                data: formattedAdvertisements
            }
        }
    });
});