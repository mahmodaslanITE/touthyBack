const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { validateUserRegister, validateUserLogin, User } = require('../models/User');
const getUserProfile = require('../utils/users'); 
const Student_profile = require('../models/Student_profile');
const Patient_profile = require('../models/Patient_profile');
const BlacklistService = require('../Middlewares/blacklistService');
const jwt=require('jsonwebtoken');
const { formateImageUrl } = require('../utils/formate');

/**
 * @desc Register new user
 * @route POST /api/auth/register
 * @access Public
 */
module.exports.createRegisterUser = asyncHandler(async (req, res) => {
    const { error } = validateUserRegister(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details.map(e => e.message).join(', ')
        });
    }

    const { email, password, first_name, last_name, father_name, role, university_number, gender, category } = req.body;

    // التحقق من الإيميل المكرر
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({
            status: 'error',
            message: 'هذا البريد الإلكتروني مسجل بالفعل'
        });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    // إنشاء المستخدم
    const newUser = await User.create({ email, password: hashedPassword, role });

    // إنشاء الملف الشخصي حسب الدور
    let profile;
    const baseProfile = { first_name, father_name, last_name, user: newUser._id, gender };

    switch (role) {
        case 'student':
            profile = await Student_profile.create({ ...baseProfile, university_number, category });
            break;
        case 'patient':
            profile = await Patient_profile.create({ ...baseProfile, university_number });
            break;
        default:
            await User.findByIdAndDelete(newUser._id);
            return res.status(400).json({ status: 'error', message: 'نوع المستخدم غير صالح' });
    }

    const { _id, user, createdAt, updatedAt, __v, ...cleanProfile } = profile._doc;

    res.status(201).json({
        status: 'success',
        message: 'تم تسجيل المستخدم بنجاح',
        data: { _id: newUser._id, email: newUser.email, role: newUser.role, profile: cleanProfile }
    });
});

/**
 * @desc Login user
 * @route POST /api/auth/login
 * @access Public
 */
module.exports.loginUser = asyncHandler(async (req, res) => {
    const { error } = validateUserLogin(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details.map(e => e.message).join(', ')
        });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({
            status: 'error',
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        });
    }

    const profile = await getUserProfile(user._id, user.role);

    if (!profile) {
        return res.status(404).json({
            status: 'error',
            message: 'الملف الشخصي غير موجود'
        });
    }
    if(profile.profile_photo?.url){
        profile.profile_photo.url=formateImageUrl(profile.profile_photo.url)
    }

    const token = user.generateToken();

    // تجهيز بيانات الاستجابة
    const userData = {
        _id: user._id,
        email: user.email,
        role: (user.isAdmin)?'admin':user.role,
        ...(user.isAdmin && { is_admin: true }),
        first_name: profile.first_name,
        father_name: profile.father_name,
        last_name: profile.last_name,
        bio: profile.bio,
        gender: profile.gender,
        university_number: profile.university_number,
        is_verified: profile.is_verified,
        profile_photo: profile.profile_photo,
        ...(profile.category && { category: profile.category })
    };

    res.status(200).json({
        status: 'success',
        message: 'تم تسجيل الدخول بنجاح',
        data: userData,
        token
    });
});

/**
 * @desc Change password
 * @route PUT /api/auth/change-password
 * @access Private
 */
module.exports.changePassword = asyncHandler(async (req, res) => {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
        return res.status(400).json({
            status: 'error',
            message: 'يرجى إدخال كلمة المرور القديمة والجديدة'
        });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({
            status: 'error',
            message: 'المستخدم غير موجود'
        });
    }

    if (!(await bcrypt.compare(old_password, user.password))) {
        return res.status(400).json({
            status: 'error',
            message: 'كلمة المرور القديمة غير صحيحة'
        });
    }

    user.password = await bcrypt.hash(new_password, await bcrypt.genSalt(10));
    await user.save();

    res.status(200).json({
        status: 'success',
        message: 'تم تغيير كلمة المرور بنجاح'
    });
});




/**
 * @desc تسجيل الخروج وإبطال التوكن
 * @route POST /api/auth/logout
 * @access Private
 */
module.exports.logout = asyncHandler(async (req, res) => {
    const token = req.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(400).json({
            status: 'error',
            message: 'لا يوجد توكن نشط'
        });
    }

    try {
        // ✅ حساب المدة المتبقية للتوكن
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;
        
        // ✅ إضافة التوكن إلى القائمة السوداء
        if (expiresIn > 0) {
            await BlacklistService.addToBlacklist(token, expiresIn);
            console.log(`✅ Token blacklisted for ${expiresIn}s`);
        }
        console.log(` done `)
        res.status(200).json({
            status: 'success',
            message: 'تم تسجيل الخروج بنجاح'
        });
        
    } catch (error) {
        // إذا كان التوكن منتهي الصلاحية
        console.log(`the proplem is here`)

        if (error.name === 'TokenExpiredError') {
            await BlacklistService.addToBlacklist(token, 3600); 
            return res.status(200).json({
                status: 'success',
                message: 'تم تسجيل الخروج بنجاح'
            });
        }
        
        console.error('❌ Logout error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'حدث خطأ أثناء تسجيل الخروج'
        });
    }
});

/**
 * @desc تغيير كلمة المرور (مع إبطال التوكن)
 * @route PUT /api/auth/change-password
 * @access Private
 */
module.exports.changePassword = asyncHandler(async (req, res) => {
    const { old_password, new_password } = req.body;
    const user = await User.findById(req.user.id);
    
    // ... التحقق من كلمة المرور القديمة ...
    
    // ✅ تغيير كلمة المرور
    user.password = await bcrypt.hash(new_password, 10);
    await user.save();
    
    // ✅ إبطال التوكن الحالي
    const token = req.token;
    if (token) {
        await BlacklistService.addToBlacklist(token, 3600);
    }
    
    res.status(200).json({
        status: 'success',
        message: 'تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول مرة أخرى'
    });
});

/**
 * @desc تنظيف التوكنات المنتهية (يمكن تشغيلها كـ Cron Job)
 * @route POST /api/admin/clean-blacklist
 * @access Private (Admin only)
 */
module.exports.cleanBlacklist = asyncHandler(async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح بالوصول'
        });
    }

    const deletedCount = await BlacklistService.cleanExpiredTokens();
    
    res.status(200).json({
        status: 'success',
        message: `تم حذف ${deletedCount} توكن منتهي`
    });
});