const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/Student_profile');
const { Verify_request } = require('../models/VerifyRequest');
const Course = require('../models/Course');
const { Practial_lesson } = require('../models/Practical_lesson');
const Treatment = require('../models/Treatment');
const socket = require('../socket/init');
const { Pending_request } = require('../models/Pending_request');
const {  Overseer_profile } = require('../models/Overseer_profile');
const InProcess_request=require('../models/InProcess_request')

// ============================================================
// 🎓 STUDENT CONTROLLER
// ============================================================

/**
 * @description Send request to verify account (only student)
 * @route POST /api/auth/verify
 * @access Private (Student only)
 */
module.exports.addVerifyRequest = asyncHandler(async (req, res) => {
    const studentProfile = await StudentProfile.findOne({ user: req.user.id });
    if (!studentProfile) {
        return res.status(404).json({
            status: 'error',
            message: 'ملف الطالب غير موجود'
        });
    }

    const existingRequest = await Verify_request.findOne({ student_profile: studentProfile.id });
    if (existingRequest) {
        return res.status(400).json({
            status: 'error',
            message: 'لديك طلب توثيق قيد المراجعة بالفعل'
        });
    }

    const request = await Verify_request.create({
        user: studentProfile.user,
        student_profile: studentProfile._id,
        document: `images/verify_requests/${req.file.filename}`
    });

    res.status(201).json({
        status: 'success',
        message: 'تم إنشاء طلب التوثيق بنجاح',
        data: request
    });
});

/**
 * @description Get overseers for a specific course based on student category
 * @route GET /api/request/course-overseers/:courseId
 * @access Private (Student only)
 */
module.exports.getCourseOverseers = asyncHandler(async (req, res) => {
    const studentProfile = await StudentProfile.findOne({ user: req.user.id });
    if (!studentProfile) {
        return res.status(404).json({
            status: 'error',
            message: 'ملف الطالب غير موجود'
        });
    }

    const lesson = await Practial_lesson.findOne({
        category: studentProfile.category,
        course: req.params.id
    });

    if (!lesson) {
        return res.status(404).json({
            status: 'error',
            message: 'لم يتم تعيين موعد لفئتك بعد في هذه المادة'
        });
    }

    const course = await Course.findById(lesson.course);
    console.log(lesson.overseers);
    const overseers = await Overseer_profile.find({
        user: { $in: lesson.overseers }
    }).select('first_name father_name last_name user profile_photo');

    overseers.map(overseer => {
        if (overseer.profile_photo && overseer.profile_photo.url) {
            overseer.profile_photo.url = `${process.env.BASE_URL}/${overseer.profile_photo.url}`;
        }
    });

    res.status(200).json({
        status: 'success',
        message: `المشرفين المسؤولين عن فئتك في مادة ${course?.course_name || ''}`,
        data: overseers
    });
});

/**
 * @description Show all pending requests
 * @route GET /api/request
 * @access Private (Student or Admin)
 */
module.exports.showAllRequests = asyncHandler(async (req, res) => {
    if (req.user.role === 'patient') {
        return res.status(403).json({
            status: 'error',
            message: 'المرضى لا يمكنهم رؤية طلبات الآخرين'
        });
    }

    const requests = await Pending_request.find()
        .populate({
            path: 'case_type',
            select: '_id case_type course',
            populate: { path: 'course', select: '_id course_name' }
        })
        .populate({
            path: 'user',
            model: 'Patient_profile',
            foreignField: 'user',
            localField: 'user',
            select: '-_id first_name father_name last_name'
        });

    const formattedRequests = requests.map(item => ({
        _id: item._id,
        ...(req.user.isAdmin && { patient: item.user }),
        Requestion: {
            pain_severity: item.pain_severity,
            pain_time: item.pain_time,
            tooth_location: item.tooth_location,
            gender: item.gender,
            more_details: item.more_details,
            age: item.age,
            photo: {url:`${process.env.BASE_URL}/${item.photo.url}`},
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        },
        case_type: {
            _id: item.case_type?._id,
            case_type: item.case_type?.case_type
        },
        course_info: item.case_type?.course ? {
            _id: item.case_type.course._id,
            course_name: item.case_type.course.course_name
        } : null
    }));

    res.status(200).json({
        status: 'success',
        message: 'هذه هي جميع الطلبات',
        count: formattedRequests.length,
        data: formattedRequests
    });
});

/**
 * @description Accept request and assign overseer
 * @route POST /api/request/accept/:id/:overseerId
 * @access Private (Student only)
 */
module.exports.acceptRequest = asyncHandler(async (req, res) => {
    const { id, overseer: overseerId } = req.params;
    const studentId = req.user.id;

    if (req.user.role !== 'student') {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح، هذه الخدمة للطلاب فقط'
        });
    }

    const student = await StudentProfile.findOne({ user: studentId });
    if (!student) {
        return res.status(404).json({
            status: 'error',
            message: 'ملف الطالب غير موجود'
        });
    }

    const request = await Pending_request.findById(id);
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الطلب غير موجود أو تم قبوله مسبقاً'
        });
    }

    const existingProcess = await InProcess_request.findOne({
        student: studentId,
        case_type: request.case_type
    });

    if (existingProcess) {
        const treatment = await Treatment.findById(request.case_type);
        return res.status(400).json({
            status: 'error',
            message: `لديك حالة من نوع (${treatment?.case_type}) قيد التنفيذ حالياً`
        });
    }

    const treatment = await Treatment.findById(request.case_type);
    if (!treatment) {
        return res.status(404).json({
            status: 'error',
            message: 'نوع المعالجة غير موجود'
        });
    }

    const lesson = await Practial_lesson.findOne({
        course: treatment.course,
        category: student.category
    });

    if (!lesson || !lesson.overseers.includes(overseerId)) {
        return res.status(400).json({
            status: 'error',
            message: 'المشرف الذي اخترته غير مسؤول عن فئتك'
        });
    }

    await Pending_request.findByIdAndDelete(id);

    const requestData = request.toObject();
    delete requestData._id;
    delete requestData.user;
    delete requestData.case_type;
    delete requestData.createdAt;
    delete requestData.updatedAt;
    delete requestData.__v;

    const inProcess = await InProcess_request.create({
        patient: request.user,
        student: studentId,
        Requestion: requestData,
        case_type: request.case_type,
        overseer: overseerId,
        date_of_accepting: new Date()
    });

    const io = socket.getIO();
    if (io) {
        io.to(request.user.toString()).emit('requestAccepted', {
            message: `تم قبول حالتك من قبل الطالب ${student.first_name || ''} ${student.last_name || ''} يرجى الحضور إلى العيادة ${lesson.hall} في ${lesson.time}`,
            time: lesson.time,
            location: lesson.hall
        });

        io.to(overseerId).emit('requestAccepted', {
            message: `لقد اختارك الطالب ${student.first_name} ${student.last_name} لتكون مسؤولاً عن حالته ${treatment.case_type}`,
            data: inProcess
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'تم قبول الطلب بنجاح وتم إشعار المريض والمشرف'
    });
});

/**
 * @description Reassign overseer to request after case type change
 * @route PUT /api/student/reassign-overseer/:id/:overseerId
 * @access Private (Student only)
 */
module.exports.reassignOverseer = asyncHandler(async (req, res) => {
    const { id: requestId, overseer: overseerId } = req.params;
    const studentId = req.user.id;

    if (req.user.role !== 'student') {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح، هذه الخدمة للطلاب فقط'
        });
    }

    const request = await InProcess.findOne({ _id: requestId, student: studentId });
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الطلب غير موجود أو لا يخصك'
        });
    }

    if (request.overseer) {
        return res.status(400).json({
            status: 'error',
            message: 'هذا الطلب لديه مشرف بالفعل، لا يمكنك تعيين مشرف جديد'
        });
    }

    request.overseer = overseerId;
    await request.save();

    res.status(200).json({
        status: 'success',
        message: 'تم تعيين المشرف الجديد بنجاح، الطلب الآن قيد المراجعة',
        data: request
    });
});