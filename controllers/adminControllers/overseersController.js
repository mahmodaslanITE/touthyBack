const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { Category } = require('../../models/Category');
const Course = require('../../models/Course');
const { User, validateAddOverseer } = require('../../models/User');
const {  Overseer_profile } = require('../../models/Overseer_profile');
const { Practial_lesson } = require('../../models/Practical_lesson');

// ============================================================
// 👨‍🏫 OVERSEERS MANAGEMENT
// ============================================================

/**
 * @description Get all overseers
 * @route GET /api/admin/overseers
 * @access Private (Admin only)
 */
module.exports.getAllOverseers = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const overseers = await Overseer_profile.find();

    res.status(200).json({
        status: 'success',
        count: overseers.length,
        data: overseers
    });
});

/**
 * @description Create new overseer account
 * @route POST /api/admin/overseer
 * @access Private (Admin only)
 */
module.exports.createOverseer = asyncHandler(async (req, res) => {
    const { error } = validateAddOverseer(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message
        });
    }

    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const { email, password, first_name, last_name, father_name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({
            status: 'error',
            message: 'هذا البريد الإلكتروني مسجل مسبقاً'
        });
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const newOverseer = await User.create({
        email,
        password: hashedPassword,
        role: 'overseer'
    });

    const profile = await Overseer_profile.create({
        user: newOverseer._id,
        first_name,
        last_name,
        father_name,
        is_verified: true
    });

    res.status(201).json({
        status: 'success',
        message: 'تم إنشاء حساب المشرف وملفه الشخصي بنجاح',
        data: {
            id: newOverseer._id,
            email: newOverseer.email,
            profile
        }
    });
});

/**
 * @description Assign overseer to practical lesson
 * @route PUT /api/admin/overseer/assign
 * @access Private (Admin only)
 */
module.exports.assignOverseerToLesson = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const { lesson_id, overseer_id } = req.body;

    if (!lesson_id || !overseer_id) {
        return res.status(400).json({
            status: 'error',
            message: 'معرف الحصة ومعرف المشرف مطلوبان'
        });
    }

    const lesson = await Practial_lesson.findById(lesson_id);
    if (!lesson) {
        return res.status(404).json({
            status: 'error',
            message: 'الحصة غير موجودة'
        });
    }

    if (lesson.overseers.length >= 2) {
        return res.status(400).json({
            status: 'error',
            message: 'لا يمكن تعيين أكثر من مشرفين على هذه الحصة'
        });
    }

    if (lesson.overseers.includes(overseer_id)) {
        return res.status(400).json({
            status: 'error',
            message: 'هذا المشرف معين بالفعل لهذه الحصة'
        });
    }

    const [course, overseerProfile, category] = await Promise.all([
        Course.findById(lesson.course),
        Overseer_profile.findOne({ user: overseer_id }),
        Category.findById(lesson.category)
    ]);

    lesson.overseers.push(overseer_id);
    await lesson.save();

    res.status(200).json({
        status: 'success',
        message: `تم تكليف المشرف ${overseerProfile?.first_name || ''}${overseerProfile?.father_name} ${overseerProfile?.last_name || ''} بالمادة ${course?.course_name || ''} للفئة ${category?.category || ''}`,
        data: lesson
    });
});