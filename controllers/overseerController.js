// ============================================================
// 👨‍🏫 OVERSEER CONTROLLER (مشرفين)
// ============================================================

const asyncHandler = require('express-async-handler');

const StudentProfile = require('../models/Student_profile');
const Treatment = require('../models/Treatment');
const { Practial_lesson } = require('../models/Practical_lesson');
const socket = require('../socket/init');
const { getRequestsByStatus } = require('../utils/requestHelper');
const InProcess_request = require('../models/InProcess_request');
const Finished_request = require('../models/Finished_request');
const Rejected_request = require('../models/Rejected_request');
const Student_profile = require('../models/Student_profile');

// ============================================================
// 📋 VIEW REQUESTS (عرض الطلبات)
// ============================================================

/**
 * @description Get all requests assigned to overseer
 * @route GET /api/overseer/treatment
 * @access Private (Overseer only)
 */
module.exports.showOverseerRequests = asyncHandler(async (req, res) => {
    if (req.user.role !== 'overseer') {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح، هذه الخدمة للمشرفين فقط'
        });
    }

    const requests = await getRequestsByStatus({
        Model: InProcess_request,
        user: req.user
    });

    res.status(200).json({
        status: 'success',
        message: 'هذه هي الطلبات التي انت مسؤول عن الإشراف عنها',
        count: requests.length,
        data: requests
    });
});

// ============================================================
// ✅ COMPLETE REQUEST (إنهاء الطلب)
// ============================================================

/**
 * @description Complete request and move to finished with rating
 * @route PUT /api/overseer/treatment/complete/:id
 * @access Private (Overseer only)
 */
module.exports.completeRequest = asyncHandler(async (req, res) => {
    const { rating, feedback } = req.body;
    const { id: requestId } = req.params;
    const overseerId = req.user.id;

    if (req.user.role !== 'overseer') {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح، هذه الخدمة للمشرفين فقط'
        });
    }

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
            status: 'error',
            message: 'يرجى وضع تقييم من 1 إلى 5 للطلب قبل الإغلاق'
        });
    }

    const request = await InProcess_request.findOne({ _id: requestId, overseer: overseerId });
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الطلب غير موجود أو أنك لست المشرف المسؤول عنه'
        });
    }

    const finishedRequest = await Finished_request.create({
        patient: request.patient,
        overseer: overseerId,
        Requestion: request.Requestion,
        student: request.student,
        case_type: request.case_type,
        rating,
        feedback,
        completedAt: Date.now()
    });

    await InProcess_request.findByIdAndDelete(requestId);

    res.status(200).json({
        status: 'success',
        message: 'تم إنهاء الطلب وتقييمه بنجاح ونقله للأرشيف',
        data: finishedRequest
    });
});

// ============================================================
// ❌ REJECT REQUEST (رفض الطلب)
// ============================================================

/**
 * @description Reject request permanently
 * @route PUT /api/overseer/treatment/reject/:id
 * @access Private (Overseer only)
 */
module.exports.rejectRequest = asyncHandler(async (req, res) => {
    const { note } = req.body;
    const { id: requestId } = req.params;
    const overseerId = req.user.id;

    if (req.user.role !== 'overseer') {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح، هذه الخدمة للمشرفين فقط'
        });
    }

    if (!note || note.trim().length < 5) {
        return res.status(400).json({
            status: 'error',
            message: 'يرجى ذكر سبب الرفض (5 أحرف على الأقل)'
        });
    }

    const request = await InProcess_request.findOne({ _id: requestId, overseer: overseerId });
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الطلب غير موجود أو أنك لست المشرف المسؤول عنه'
        });
    }

    const rejectedRequest = await Rejected_request.create({
        patient: request.patient,
        overseer: overseerId,
        Requestion: request.Requestion,
        student: request.student,
        case_type: request.case_type,
        note,
        rejectedAt: Date.now()
    });

    await InProcess_request.findByIdAndDelete(requestId);

    // إرسال الإشعارات
    const io = socket.getIO();
    if (io) {
        const patientId = request.patient.toString();
        const studentId = request.student.toString();
        
        io.to(patientId).emit('request_rejected', {
            message: 'تم رفض حالتك من المعالجة في الكلية',
            note
        });
        io.to(studentId).emit('request_rejected', {
            message: 'تم رفض حالة المريض من المعالجة',
            note
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'تم رفض الحالة ونقلها للأرشيف',
        data: rejectedRequest
    });
});

// ============================================================
// 🔄 REJECT WITH OPTION (رفض مع تغيير نوع الحالة)
// ============================================================

/**
 * @description Reject request with option to change case type
 * @route PUT /api/overseer/treatment/reject/:id/:option
 * @access Private (Overseer only)
 */
module.exports.rejectRequestWithOption = asyncHandler(async (req, res) => {
    const { note } = req.body;
    const { id: requestId, option } = req.params;
    const overseerId = req.user.id;

    if (req.user.role !== 'overseer') {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح، هذه الخدمة للمشرفين فقط'
        });
    }

    const request = await InProcess_request.findOne({ _id: requestId, overseer: overseerId });
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الطلب غير موجود أو أنك لست المشرف المسؤول عنه'
        });
    }

    // التحقق من وجود حالة مماثلة للطالب
    const existingRequest = await InProcess_request.findOne({
        case_type: option,
        student: request.student
    });

    // الحالة الأولى: الطالب لديه نفس نوع الحالة بالفعل
    if (existingRequest) {
        await InProcess_request.findByIdAndDelete(requestId);

        const io = socket.getIO();
        if (io) {
            const patientId = request.patient.toString();
            const studentId = request.student.toString();
            
            io.to(patientId).emit('request_rejected', {
                message: 'تم رفض حالتك من المعالجة',
                note
            });
            io.to(studentId).emit('request_rejected', {
                message: 'تم رفض حالة المريض من المعالجة',
                note
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'تم رفض الحالة، الطالب لديه نفس نوع الحالة بالفعل'
        });
    }

    // الحالة الثانية: تغيير نوع الحالة
    const treatment = await Treatment.findById(option);
    if (!treatment) {
        return res.status(404).json({
            status: 'error',
            message: 'نوع الحالة غير موجود'
        });
    }

    // تحديث الطلب
    request.case_type = option;
    request.overseer = null;
    await request.save();

    // إرسال الإشعارات
    const student = await Student_profile.findOne({ user: request.student });
    const lesson = await Practial_lesson.findOne({
        course: treatment.course,
        category: student?.category
    });

    const io = socket.getIO();
    if (io) {
        const patientId = request.patient.toString();
        const studentId = request.student.toString();

        if (lesson) {
            io.to(patientId).emit('updateCaseType', {
                message: `تم تغيير موعد معالجتك إلى موعد آخر في القاعة ${lesson.hall}`,
                time: lesson.time,
                location: lesson.hall
            });
        }

        io.to(studentId).emit('updateCaseType', {
            message: `تم تغيير نوع المعالجة إلى ${treatment.case_type}، يتوجب عليك تعيين مشرف جديد`,
            treatment
        });
    }

    res.status(200).json({
        status: 'success',
        message: `تم تغيير الحالة إلى ${treatment.case_type}، يتوجب على الطالب تعيين مشرف جديد`
    });
});

// ============================================================
// 📝 ADD STAGE EVALUATION (إضافة تقييم مرحلي)
// ============================================================

/**
 * @description Add stage evaluation to request
 * @route POST /api/overseer/add-evaluation/:id
 * @access Private (Overseer only)
 */
module.exports.addStageEvaluation = asyncHandler(async (req, res) => {
    const { id: requestId } = req.params;
    const { evaluationText } = req.body;
    const overseerId = req.user.id;

    if (req.user.role !== 'overseer') {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح، هذه الخدمة للمشرفين فقط'
        });
    }

    if (!evaluationText || evaluationText.trim().length < 5) {
        return res.status(400).json({
            status: 'error',
            message: 'يرجى كتابة نص التقييم (5 أحرف على الأقل)'
        });
    }

    const request = await InProcess_request.findOne({ _id: requestId, overseer: overseerId });
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الطلب غير موجود أو أنك لست المشرف المسؤول عنه'
        });
    }

    request.stage_evaluations.push({
        text: evaluationText.trim(),
        date: new Date()
    });
    await request.save();

    res.status(200).json({
        status: 'success',
        message: 'تم إضافة التقييم المرحلي بنجاح',
        data: request.stage_evaluations
    });
});