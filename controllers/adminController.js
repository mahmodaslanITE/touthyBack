const asyncHandler = require('express-async-handler');
const { OverseerProfile } = require('../models/Overseer_profile'); 
const { User, validateAddOverseer } = require('../models/User');
const bcrypt = require('bcryptjs'); 
const Student_profile = require('../models/Student_profile');
const Patient_profil=require('../models/Patient_profile')

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
        user: overseer._id,
        is_verified:true
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
 * @route /api/admin/verification/:id
 */
module.exports.verify_account = asyncHandler(async (req, res) => {
    // 1. التحقق من الصلاحية (Admin Only)
    if (!req.user || !req.user.isAdmin) {
       return res.status(403).json({ 
           status: 'error', 
           message: 'تستهبل !!!! انت مش مدير' 
       });
    }
 
    // 2. التأكد من وجود المستخدم ودوره
    const user = await User.findById(req.params.id);
    if (!user) {
       return res.status(404).json({ status: 'error', message: 'المستخدم غير موجود' });
    }
 
    if (user.role === 'patient') {
       return res.status(400).json({
           status: 'error',
           message: 'لا يمكنك توثيق حسابات المرضى'
       });
    }
 
    // 3. توثيق الحساب الخاص بالطالب (أضفنا await هنا)
    const student = await Student_profile.findOne({ user: req.params.id });
 
    // 4. التأكد من وجود ملف الطالب قبل التعديل
    if (!student) {
       return res.status(404).json({
           status: 'error',
           message: 'لم يتم العثور على ملف تعريف لهذا الطالب'
       });
    }
 
    student.is_verified = true;
    const result = await student.save();
 
    res.status(200).json({
        status: 'success',
        message: "تم توثيق الحساب بنجاح",
        data: result
    });
 });


 /**
 * @description Get all patients
 * @route /api/admin/patients
 */
module.exports.get_all_patients = asyncHandler(async (req, res) => {
    // التأكد من صلاحية الأدمن
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ status: 'error', message: 'غير مسموح لك بالوصول' });
    }

    const patients = await  Patient_profil.find()
    
    res.status(200).json({
        status: 'success',
        results: patients.length,
        data: patients
    });
});

 /**
 * @description Get all overseers
 * @route /api/admin/overseers
 */
module.exports.get_all_overseers = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ status: 'error', message: 'غير مسموح لك بالوصول' });
    }

    const admins = await OverseerProfile.find();
    
    res.status(200).json({
        status: 'success',
        results: admins.length,
        data: admins
    });
});
/**
 * @description Get all students with their profiles
 * @route /api/admin/students
 */
module.exports.get_all_students = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ status: 'error', message: 'غير مسموح لك بالوصول' });
    }

    // جلب المستخدمين الذين دورهم "طالب" ودمج بيانات ملفهم الشخصي
    const students = await Student_profile.find();


    res.status(200).json({
        status: 'success',
        results: students.length,
        data: students
    });
});
