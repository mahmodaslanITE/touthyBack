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
const { formatPost } = require('../utils/formate');

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
                    ...(req.user.role==='patient' && {pending})

             }:null,
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