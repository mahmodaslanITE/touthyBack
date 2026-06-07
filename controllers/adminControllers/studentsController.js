const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');
const socket = require('../../socket/init');
const { Verify_request } = require('../../models/VerifyRequest');
const StudentProfile = require('../../models/Student_profile');
const { Category, valedate_add_category } = require('../../models/Category');

// ============================================================
// 📝 VERIFICATION REQUESTS MANAGEMENT
// ============================================================

/**
 * @description Get all verification requests
 * @route GET /api/admin/verify
 * @access Private (Admin only)
 */
module.exports.getAllVerifyRequests = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const requests = await Verify_request.find()
        .populate('student_profile', 'user first_name father_name last_name university_number profile_photo')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        message: 'هذه هي طلبات التوثيق',
        count: requests.length,
        data: requests
    });
});

/**
 * @description Accept account verification request
 * @route POST /api/admin/verification/accept/:id
 * @access Private (Admin only)
 */
module.exports.verifyAccountAccept = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const request = await Verify_request.findById(req.params.id);
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'لا يوجد طلب بهذا المعرف'
        });
    }

    const student = await StudentProfile.findById(request.student_profile);
    if (!student) {
        return res.status(404).json({
            status: 'error',
            message: 'ملف الطالب غير موجود'
        });
    }

    const { first_name, father_name, last_name, university_number } = req.body;
    
    if (first_name) student.first_name = first_name;
    if (father_name) student.father_name = father_name;
    if (last_name) student.last_name = last_name;
    if (university_number) student.university_number = university_number;
    
    student.is_verified = true;
    await student.save();

    if (request.document) {
        const imagePath = path.join(__dirname, '..', request.document);
        fs.unlink(imagePath, (err) => {
            if (err) console.error('فشل حذف ملف الصورة:', err);
        });
    }

    await Verify_request.findByIdAndDelete(req.params.id);

    const io = socket.getIO();
    if (io) {
        io.to(request.user.toString()).emit('VerifyAccepted', {
            message: 'تم توثيق حسابك وتحديث بياناتك بنجاح',
            timestamp: new Date()
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'تم توثيق الحساب وتحديث البيانات وحذف الطلب بنجاح',
        data: student
    });
});

/**
 * @description Reject account verification request
 * @route POST /api/admin/verification/reject/:id
 * @access Private (Admin only)
 */
module.exports.verifyAccountReject = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const request = await Verify_request.findById(req.params.id);
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'لا يوجد طلب بهذا المعرف'
        });
    }

    const { reject_reason } = req.body;
    if (!reject_reason) {
        return res.status(400).json({
            status: 'error',
            message:`يرجى تقديم سبب الرفض في حقل "reject_reason"`
        });
    }

    if (request.document) {
        const imagePath = path.join(__dirname, '..', request.document);
        fs.unlink(imagePath, (err) => {
            if (err) console.error('فشل حذف ملف الصورة:', err);
        });
    }

    const io = socket.getIO();
    if (io) {
        io.to(request.user.toString()).emit('VerifyRejected', {
            message: `للأسف، تم رفض طلب توثيق حسابك. السبب: ${reject_reason}`,
            reason: reject_reason,
            timestamp: new Date()
        });
    }

    await Verify_request.findByIdAndDelete(req.params.id);

    res.status(200).json({
        status: 'success',
        message: 'تم رفض الطلب بنجاح وحذف البيانات المتعلقة به'
    });
});

// ============================================================
// 👨‍🎓 STUDENTS MANAGEMENT
// ============================================================

/**
 * @description Get all students with their profiles
 * @route GET /api/admin/students
 * @access Private (Admin only)
 */
module.exports.getAllStudents = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const students = await StudentProfile.find();

    res.status(200).json({
        status: 'success',
        count: students.length,
        data: students
    });
});

// ============================================================
// 🏷️ CATEGORIES MANAGEMENT
// ============================================================

/**
 * @description Add new category
 * @route POST /api/admin/category
 * @access Private (Admin only)
 */
module.exports.addCategory = asyncHandler(async (req, res) => {
    const { error } = valedate_add_category(req.body);
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

    const category = await Category.create({ category: req.body.category });

    res.status(201).json({
        status: 'success',
        message: 'تمت إضافة الفئة بنجاح',
        data: category
    });
});

/**
 * @description Get all categories
 * @route GET /api/admin/category
 * @access Private (Admin only)
 */
module.exports.getCategories = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const categories = await Category.find();

    res.status(200).json({
        status: 'success',
        message: 'هذه هي الفئات المتاحة',
        count: categories.length,
        data: categories
    });
});