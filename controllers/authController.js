const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { validateUserRegister, validateUserLogin, User } = require('../models/User');
const getUserProfile = require('../utils/users'); 
const Student_profile = require('../models/Student_profile');
const Patient_profile = require('../models/Patient_profile');

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

    const token = user.generateToken();

    // تجهيز بيانات الاستجابة
    const userData = {
        _id: user._id,
        email: user.email,
        role: user.role,
        ...(user.isAdmin && { is_admin: true }),
        first_name: profile.first_name,
        father_name: profile.father_name,
        last_name: profile.last_name,
        bio: profile.bio,
        gender: profile.gender,
        university_number: profile.university_number,
        is_verified: profile.is_verified,
        profile_photo: {url:`${req.protocol}://${req.get('host')}/${profile.profile_photo?.url}`},
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