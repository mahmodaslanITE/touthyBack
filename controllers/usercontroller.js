const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');
const { User } = require('../models/User');
const Finished = require('../models/Finished_request');
const InProcess = require('../models/InProcess_request');
const getUserProfile = require('../utils/users');

// ============================================================
// 📦 HELPER FUNCTIONS (دوال مساعدة)
// ============================================================

/**
 * Format profile response
 * @param {Object} profile - User profile
 * @param {string} role - User role
 * @param {Object} counts - Counts object
 * @returns {Object} Formatted profile
 */
const formatProfileResponse = (profile, role, counts = { finished: 0, inProcess: 0 }) => ({
    user: profile.user,
    first_name: profile.first_name,
    father_name: profile.father_name,
    last_name: profile.last_name,
    bio: profile.bio,
    profile_photo: profile.profile_photo,
    gender: profile.gender,
    role,
    category: profile.category,
    university_number: profile.university_number,
    age: profile.age,
    is_verified: profile.is_verified,
    count_cases_finished: counts.finished,
    count_cases_in_process: counts.inProcess
});

/**
 * Get case counts for user
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Promise<Object>} Counts object
 */
const getCaseCounts = async (userId, role) => {
    if (role === 'student') {
        return {
            finished: await Finished.countDocuments({ student: userId }),
            inProcess: await InProcess.countDocuments({ student: userId })
        };
    }
    if (role === 'overseer') {
        return {
            finished: await Finished.countDocuments({ overseer: userId }),
            inProcess: await InProcess.countDocuments({ overseer: userId })
        };
    }
    return { finished: 0, inProcess: 0 };
};

// ============================================================
// 👤 USER PROFILE MANAGEMENT
// ============================================================

/**
 * @description Get current user profile
 * @route GET /api/users
 * @access Private
 */
module.exports.showUserProfile = asyncHandler(async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({
            status: 'error',
            message: 'يجب تسجيل الدخول أولاً'
        });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ استخدام getUserProfile الموجود
    const profile = await getUserProfile(userId, userRole);
    const user=await User.findById(userId);
    const email=user.email;
    // دمج الإيميل داخل كائن البروفايل

    if (!profile) {
        return res.status(404).json({
            status: 'error',
            message: 'الملف الشخصي غير موجود'
        });
    }

    const counts = await getCaseCounts(userId, userRole);
    const formattedProfile = formatProfileResponse(profile, userRole, counts);
    const profileWithEmail = {
        ...formattedProfile.toObject ? formattedProfile.toObject() : formattedProfile, // تحويل إلى كائن عادي
        email: email
    };

    res.status(200).json({
        status: 'success',
        message: 'تم جلب البيانات بنجاح',
        data: profileWithEmail
    });
});

/**
 * @description Get user profile by ID
 * @route GET /api/users/:id
 * @access Private
 */
module.exports.getProfile = asyncHandler(async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({
            status: 'error',
            message: 'يجب تسجيل الدخول أولاً'
        });
    }

    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) {
        return res.status(404).json({
            status: 'error',
            message: 'المستخدم غير موجود'
        });
    }

    const userRole = targetUser.role;

    // ✅ استخدام getUserProfile الموجود
    const profile = await getUserProfile(id, userRole);
    if (!profile) {
        return res.status(404).json({
            status: 'error',
            message: 'الملف الشخصي غير موجود'
        });
    }

    const counts = await getCaseCounts(id, userRole);
    const formattedProfile = formatProfileResponse(profile, userRole, counts);

    res.status(200).json({
        status: 'success',
        message: 'تم جلب البيانات بنجاح',
        data: formattedProfile
    });
});

/**
 * @description Get all profiles (Not implemented yet)
 * @route GET /api/users/all
 * @access Private
 */
module.exports.getAllProfiles = asyncHandler(async (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'هذه الخدمة قيد التطوير'
    });
});

/**
 * @description Update user profile
 * @route PUT /api/users
 * @access Private
 */
module.exports.updateUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { first_name, last_name, father_name, university_number, bio, category } = req.body;

    const profile = await getUserProfile(userId, userRole);
    if (!profile) {
        return res.status(404).json({
            status: 'error',
            message: 'الملف الشخصي غير موجود'
        });
    }

    // تحديث الحقول
    if (first_name) profile.first_name = first_name;
    if (father_name) profile.father_name = father_name;
    if (last_name) profile.last_name = last_name;
    if (university_number) profile.university_number = university_number;
    if (bio) profile.bio = bio;
    if (category) profile.category = category;

    await profile.save();

    // إزالة الحقول الزائدة من الاستجابة
    const { _id, user, createdAt, updatedAt, __v, ...profileData } = profile._doc;

    res.status(200).json({
        status: 'success',
        message: 'تم تحديث الملف الشخصي بنجاح',
        data: profileData
    });
});

/**
 * @description Update profile photo
 * @route PUT /api/users/photo
 * @access Private
 */
module.exports.updateProfilePhoto = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            status: 'error',
            message: 'الرجاء رفع صورة'
        });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ استخدام getUserProfile لجلب الملف الشخصي الحالي
    const profile = await getUserProfile(userId, userRole);
    if (!profile) {
        return res.status(404).json({
            status: 'error',
            message: 'الملف الشخصي غير موجود'
        });
    }

    // حذف الصورة القديمة
    if (profile.profile_photo?.url) {
        const oldImagePath = path.join(__dirname, '../images/profile', path.basename(profile.profile_photo.url));
        if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
        }
    }

    // حفظ الصورة الجديدة
    profile.profile_photo = { url: `images/profile/${req.file.filename}` };
    await profile.save();

    res.status(200).json({
        status: 'success',
        message: 'تم تحديث الصورة الشخصية بنجاح',
        profile_photo: { url: `images/profile/${req.file.filename}` }
    });
});
