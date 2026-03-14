const asyncHandler = require('express-async-handler');
const { OverseerProfile } = require('../models/Overseer_profile'); 
const { User, validateAddOverseer } = require('../models/User');
const bcrypt = require('bcryptjs'); 

/**
 * @desc create new overseer 
 * @route /api/admin/overseer
 * @method post 
 * @access private (Admin Only)
 */
module.exports.createOverseer = asyncHandler(async (req, res) => {
    // 1. التحقق من صحة البيانات المرسلة (Validation)
    const { error } = validateAddOverseer(req.body);
    if (error) {
        // نستخدم error.details[0].message للحصول على نص الخطأ الواضح
        return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    // 2. التحقق من الصلاحية (Admin Only)
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ 
            status: 'error', 
            message: 'تستهبل !!!! انت مش مدير لحتى تضيف مشرف' 
        });
    }

    // 3. استخراج البيانات من الطلب (هذا يمنع خطأ undefined)
    const { email, password } = req.body;

    // 4. التحقق من وجود المستخدم مسبقاً
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ status: 'error', message: 'هذا الإيميل مسجل مسبقاً' });
    }

    // 5. تشفير كلمة السر
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. إنشاء الحساب في جدول المستخدمين
    const overseer = await User.create({
        email,
        password: hashedPassword,
        role: 'overseer',
    });

    // 7. إنشاء ملف شخصي للمشرف وربطه بحسابه
    await OverseerProfile.create({
        user: overseer._id
    });

    // 8. الرد بنجاح
    res.status(201).json({
        status: 'success',
        message: 'تم إنشاء حساب المشرف وملفه الشخصي بنجاح',
        data: {
            id: overseer._id,
            email: overseer.email
        }
    });
});

/**
 * @description Account verification 
 * @route /api/admin/accounts/verification:id
 */
