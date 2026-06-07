const asyncHandler = require('express-async-handler');
const InProcess = require('../../models/InProcess_request');

// ============================================================
// 🔧 ADMIN UPDATE IN-PROCESS REQUEST
// ============================================================

/**
 * @description Admin update in-process request
 * @route PUT /api/admin/in_process/:id
 * @access Private (Admin only)
 */
module.exports.adminUpdateInProcess = asyncHandler(async (req, res) => {
    // 1. التحقق من صلاحية المشرف
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح بالوصول، هذا الروت للمشرفين فقط'
        });
    }

    // 2. البحث عن الحالة
    const request = await InProcess.findById(req.params.id);
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الحالة غير موجودة'
        });
    }

    // 3. منع تعديل الحقول الممنوعة
    const forbiddenFields = ['patient', 'student', 'date_of_accepting', 'case_type', 'overseer'];
    for (const field of forbiddenFields) {
        if (req.body[field] !== undefined) {
            return res.status(400).json({
                status: 'error',
                message: `لا يمكن تعديل حقل ${field} من خلال هذا الروت`
            });
        }
    }

    // 4. تحديث الحقول داخل كائن Requestion
    const requestionFields = ['pain_severity', 'pain_time', 'tooth_location', 'gender', 'age', 'notes'];
    for (const field of requestionFields) {
        if (req.body[field] !== undefined) {
            request.Requestion[field] = req.body[field];
        }
    }

    // 5. معالجة more_details داخل Requestion
    if (req.body.more_details !== undefined) {
        if (typeof req.body.more_details === 'string') {
            try {
                request.Requestion.more_details = JSON.parse(req.body.more_details);
            } catch (err) {
                return res.status(400).json({
                    status: 'error',
                    message: 'حقل more_details يجب أن يكون بتنسيق JSON صحيح'
                });
            }
        } else {
            request.Requestion.more_details = req.body.more_details;
        }
    }

    // 6. حفظ التعديلات
    await request.save();

    // 7. إرجاع النتيجة
    res.status(200).json({
        status: 'success',
        message: 'تم تعديل الحالة بنجاح',
        data: {
            _id: request._id,
            patient: request.patient,
            student: request.student,
            Requestion: request.Requestion,
            case_type: request.case_type,
            overseer: request.overseer,
            date_of_accepting: request.date_of_accepting
        }
    });
});