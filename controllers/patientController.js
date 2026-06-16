const asyncHandler = require('express-async-handler');
const { Pending_request, validateTreatmentRequest } = require('../models/Pending_request');
const Treatment = require('../models/Treatment');

// ============================================================
// 📦 HELPER FUNCTIONS (دوال مساعدة)
// ============================================================

/**
 * Format request response with consistent structure
 * @param {Object} req - Express request object
 * @param {Object} request - Request document
 * @returns {Object} Formatted request
 */
const formatRequestResponse = (req, request) => {
    // بناء رابط الصورة الكامل
    let photoUrl = null;
    if (request.photo?.url) {
        photoUrl =`${process.env.BASE_URL}/${request.photo.url}`;
    }

    return {
        _id: request._id,
        Requestion: {
            pain_severity: request.pain_severity,
            pain_time: request.pain_time,
            tooth_location: request.tooth_location,
            gender: request.gender,
            age: request.age,
            photo: {url: photoUrl},
            more_details: request.more_details,
            notes: request.notes || null,
            is_pregnant: request.is_pregnant || null
        },
        case_type: request.case_type,
        created_at: request.createdAt,
        updated_at: request.updatedAt
    };
};

/**
 * Format single request for response (with additional patient info for admin)
 * @param {Object} req - Express request object
 * @param {Object} request - Request document
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {Object} Formatted request
 */
const formatRequestWithPatient = (req, request, isAdmin = false) => {
    const formattedRequest = formatRequestResponse(req, request);
    
    if (isAdmin && request.user) {
        formattedRequest.patient = request.user;
    }
    
    return formattedRequest;
};

// ============================================================
// 📝 PATIENT REQUESTS MANAGEMENT
// ============================================================

/**
 * @description Create treatment request
 * @route POST /api/request
 * @access Private (Patient only)
 */
exports.createTreatmentRequest = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'غير مصرح، يرجى تسجيل الدخول'
        });
    }

    if (req.user.role !== 'patient') {
        return res.status(403).json({
            status: 'error',
            message: 'يسمح فقط للمرضى بإنشاء طلب'
        });
    }

    const { error } = validateTreatmentRequest(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details.map(d => d.message).join(', ')
        });
    }

    let moreDetailsData = req.body.more_details;
    if (typeof moreDetailsData === 'string') {
        try {
            moreDetailsData = JSON.parse(moreDetailsData);
        } catch (e) {
            return res.status(400).json({
                status: 'error',
                message: 'حقل more_details يجب أن يكون بتنسيق JSON صحيح'
            });
        }
    }

    const treatment = await Treatment.findById(req.body.case_type);
    if (!treatment) {
        return res.status(400).json({
            status: 'error',
            message: 'المعالجة التي طلبتها غير متاحة حالياً'
        });
    }

    if (req.body.gender === 'male' && req.body.is_pregnant === 'true') {
        return res.status(400).json({
            status: 'error',
            message: 'البيانات غير منطقية'
        });
    }

    const photoData = req.file ? {
        publicId: null,
        url: `images/requests/${req.file.filename}`
    } : null;

    const request = await Pending_request.create({
        ...req.body,
        more_details: moreDetailsData,
        user: req.user.id,
        photo: photoData
    });

    // ✅ استخدام نفس التنسيق
    const formattedRequest = formatRequestResponse(req, request);

    res.status(201).json({
        status: 'success',
        message: 'تم إنشاء الطلب بنجاح',
        data: formattedRequest
    });
});

/**
 * @description Get user pending requests
 * @route GET /api/request/my
 * @access Private (Patient only)
 */
exports.getUserTreatmentRequests = asyncHandler(async (req, res) => {
    const requests = await Pending_request.find({ user: req.user.id })
        .populate('case_type', '_id case_type');

    // ✅ استخدام نفس التنسيق
    const formattedRequests = requests.map(request => formatRequestResponse(req, request));

    res.status(200).json({
        status: 'success',
        message: 'هذه هي طلباتك',
        count: formattedRequests.length,
        data: formattedRequests
    });
});

/**
 * @description Update pending request
 * @route PUT /api/request/:id
 * @access Private (Patient or Admin)
 */
module.exports.updateRequest = asyncHandler(async (req, res) => {
    const isPatient = req.user.role === 'patient';
    const isAdmin = req.user.isAdmin;

    if (!isPatient && !isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح، فقط المرضى أو المشرفين يمكنهم تعديل الحالة'
        });
    }

    const request = await Pending_request.findById(req.params.id);
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الحالة غير موجودة'
        });
    }

    if (request.user.toString() !== req.user.id && !isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'هذه الحالة ليست لك'
        });
    }

    const updatableFields = ['pain_severity', 'pain_time', 'tooth_location', 'gender', 'is_pregnant', 'case_type', 'notes', 'age'];
    for (const field of updatableFields) {
        if (req.body[field] !== undefined) {
            request[field] = req.body[field];
        }
    }

    if (req.body.more_details !== undefined) {
        let moreDetailsData = req.body.more_details;
        if (typeof moreDetailsData === 'string') {
            try {
                moreDetailsData = JSON.parse(moreDetailsData);
            } catch (e) {
                return res.status(400).json({
                    status: 'error',
                    message: 'حقل more_details يجب أن يكون بتنسيق JSON صحيح'
                });
            }
        }
        request.more_details = moreDetailsData;
    }

    if (req.file) {
        request.photo = { url: `images/requests/${req.file.filename}` };
    }

    await request.save();

    // ✅ استخدام نفس التنسيق
    const formattedRequest = formatRequestResponse(req, request);

    res.status(200).json({
        status: 'success',
        message: 'تم تعديل الحالة بنجاح',
        data: formattedRequest
    });
});

/**
 * @description Delete pending request
 * @route DELETE /api/request/:id
 * @access Private (Patient or Admin)
 */
module.exports.deleteRequest = asyncHandler(async (req, res) => {
    const isPatient = req.user.role === 'patient';
    const isAdmin = req.user.isAdmin;

    if (!isPatient && !isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح، فقط المرضى أو المشرفين يمكنهم حذف الحالة'
        });
    }

    const request = await Pending_request.findById(req.params.id);
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الحالة غير موجودة'
        });
    }

    if (request.user.toString() !== req.user.id && !isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'هذه الحالة ليست لك'
        });
    }

    await request.deleteOne();

    res.status(200).json({
        status: 'success',
        message: 'تم حذف الحالة بنجاح'
    });
});

/**
 * @description Get all pending requests (for admin/student)
 * @route GET /api/request
 * @access Private (Admin or Student)
 */
module.exports.getAllRequests = asyncHandler(async (req, res) => {
    const isAdmin = req.user.isAdmin;
    const isStudent = req.user.role === 'student';

    if (!isAdmin && !isStudent) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح، هذه الخدمة للمشرفين والطلاب فقط'
        });
    }

    let query = {};

    if (isStudent) {
        // الطلاب يرون الطلبات المتاحة (بدون مشرف)
        query.overseer = null;
    }

    let requests = await Pending_request.find(query)
        .populate('case_type', '_id case_type');

    if (isAdmin) {
        requests = await Pending_request.find(query)
            .populate('case_type', '_id case_type')
            .populate('user', 'email');
    }

    // ✅ استخدام نفس التنسيق مع بيانات المريض للأدمن
    const formattedRequests = requests.map(request => 
        formatRequestWithPatient(req, request, isAdmin)
    );

    res.status(200).json({
        status: 'success',
        message: 'هذه هي جميع الطلبات',
        count: formattedRequests.length,
        data: formattedRequests
    });
});