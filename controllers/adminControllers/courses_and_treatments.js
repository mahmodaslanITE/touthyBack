const asyncHandler = require('express-async-handler');
const { Practial_lesson, validate_practical_lesson } = require('../../models/Practical_lesson');
const Course = require('../../models/Course');
const Treatment = require('../../models/Treatment');

// ============================================================
// 📚 COURSES MANAGEMENT
// ============================================================

/**
 * @description Create new course
 * @route POST /api/admin/course
 * @access Private (Admin only)
 */
module.exports.createCourse = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const { course_name } = req.body;

    if (!course_name) {
        return res.status(400).json({
            status: 'error',
            message: 'اسم المادة مطلوب'
        });
    }

    const existingCourse = await Course.findOne({ course_name });
    if (existingCourse) {
        return res.status(400).json({
            status: 'error',
            message: 'هذه المادة مسجلة مسبقاً'
        });
    }

    const newCourse = await Course.create({ course_name });

    res.status(201).json({
        status: 'success',
        message: 'تم إضافة المادة بنجاح',
        data: newCourse
    });
});

/**
 * @description Get all courses
 * @route GET /api/courses
 * @access Private (Admin only)
 */
module.exports.getCourses = asyncHandler(async (req, res) => {
    const courses = await Course.find();

    if (!courses.length) {
        return res.status(404).json({
            status: 'error',
            message: 'لا توجد مواد مسجلة حالياً'
        });
    }

    res.status(200).json({
        status: 'success',
        count: courses.length,
        data: courses
    });
});

// ============================================================
// 💊 TREATMENTS MANAGEMENT
// ============================================================

/**
 * @description Add new treatment
 * @route POST /api/admin/treatment
 * @access Private (Admin only)
 */
module.exports.addTreatment = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const { case_type, course } = req.body;

    if (!case_type || !course) {
        return res.status(400).json({
            status: 'error',
            message: 'نوع المعالجة والمادة مطلوبان case_type and course are required'
        });
    }

    const existingCourse = await Course.findById(course);
    if (!existingCourse) {
        return res.status(404).json({
            status: 'error',
            message: 'المادة المطلوبة غير موجودة'
        });
    }

    const newTreatment = await Treatment.create({ case_type, course });

    res.status(201).json({
        status: 'success',
        message: 'تم إضافة المعالجة بنجاح',
        data: newTreatment
    });
});

/**
 * @description Get all treatments
 * @route GET /api/admin/treatment
 * @access Private (Patient or Admin)
 */
module.exports.getAllTreatments = asyncHandler(async (req, res) => {
    const isPatient = req.user?.role === 'patient';

    if (isPatient) {
        const treatments = await Treatment.find().select('-course');
        const formatted = treatments.map(item => ({
            _id: item._id,
            case_type: item.case_type
        }));

        return res.status(200).json({
            status: 'success',
            count: formatted.length,
            data: formatted
        });
    }

        const treatments = await Treatment.find().populate('course', 'course_name');
        const formatted = treatments.map(item => ({
            case_type: { _id: item._id, case_type: item.case_type },
            course_info: item.course ? {
                _id: item.course._id,
                course_name: item.course.course_name
            } : null
        }));

        return res.status(200).json({
            status: 'success',
            count: formatted.length,
            data: formatted
        });
 

   
});

/**
 * @description Delete treatment by ID
 * @route DELETE /api/admin/treatment/:id
 * @access Private (Admin only)
 */
module.exports.deleteTreatment = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const treatment = await Treatment.findByIdAndDelete(req.params.id);

    if (!treatment) {
        return res.status(404).json({
            status: 'error',
            message: 'المعالجة غير موجودة'
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'تم حذف المعالجة بنجاح'
    });
});

// ============================================================
// 🎓 PRACTICAL LESSONS MANAGEMENT
// ============================================================
/**
 * @description إضافة درس عملي جديد
 * @route /api/admin/practical-lessons
 * @method POST
 * @access private (Admin only)
 */
module.exports.addPracticalLesson = asyncHandler(async (req, res) => {
    // 1. التحقق من صحة البيانات المدخلة باستخدام Joi
    const { error } = validate_practical_lesson(req.body);
    if (error) {
        return res.status(400).json({ 
            status: 'error', 
            message: error.details[0].message 
        });
    }

    // 2. التحقق من الصلاحيات (يجب أن يكون Admin)
    if (!req.user.isAdmin) {
        return res.status(403).json({ 
            status: 'error', 
            message: 'عذراً، هذه الصلاحية للمشرفين فقط' 
        });
    }

    // 3. إنشاء سجل الدرس العملي في قاعدة البيانات
    const data = await Practial_lesson.create({
        course: req.body.course,
        category: req.body.category,
        overseers: req.body.overseers,
        time: req.body.time,
        hall: req.body.hall
    });

    // 4. الرد بنجاح
    res.status(201).json({
        status: 'success',
        message: 'تم إضافة الدرس العملي بنجاح',
        data
    });
});

/**
 * @description Get all practical lessons
 * @route GET /api/admin/practical-lessons
 * @access Private (Admin only)
 */
module.exports.getAllLessons = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const lessons = await Practial_lesson.find().populate('course', 'course_name');

    res.status(200).json({
        status: 'success',
        message: 'هذه جميع الدروس العملية المسجلة',
        count: lessons.length,
        data: lessons
    });
});