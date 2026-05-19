// controllers/reportController.js
const asyncHandler = require('express-async-handler');
const Report = require('../models/Report');
const{User} = require('../models/User');
const getUserProfile = require('../functions/users');
const socket = require('../socket/init');


/**
 * @desc Create a report about another user
 * @route POST /api/reports
 * @access Private (any authenticated user)
 */
module.exports.createReport = asyncHandler(async (req, res) => {
    const {  reason, type } = req.body;
    const role=req.user.role
    const reporterId = req.user.id;
    const reportedUserId=req.params.id

    // 1. التحقق من وجود المستخدم المبلغ عنه
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
        return res.status(404).json({
            status: 'error',
            message: 'المستخدم المبلغ عنه غير موجود'
        });
    }

    // 2. منع الإبلاغ عن النفس
    if (reporterId === reportedUserId) {
        return res.status(400).json({
            status: 'error',
            message: 'لا يمكنك الإبلاغ عن نفسك'
        });
    }

    // 3. التحقق من وجود سبب الإبلاغ
    if (!reason || reason.trim().length < 5) {
        return res.status(400).json({
            status: 'error',
            message: 'سبب الإبلاغ مطلوب ويجب أن يكون 5 أحرف على الأقل'
        });
    }

    // 4. منع التكرار (يمكن للمستخدم الإبلاغ عن نفس الشخص مرة كل 24 ساعة)
    const existingReport = await Report.findOne({
        reporter: reporterId,
        reportedUser: reportedUserId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: 'pending'
    });

    if (existingReport) {
        return res.status(429).json({
            status: 'error',
            message: 'لقد قمت بالإبلاغ عن هذا المستخدم بالفعل خلال الـ 24 ساعة الماضية'
        });
    }

    // 5. إنشاء التبليغ
    const report = await Report.create({
        reporter: reporterId,
        reportedUser: reportedUserId,
        reason: reason.trim(),
        type: type || 'other'
    });
    const user_profie=getUserProfile(reporterId,role)
    console.log(`the reporter is ${user_profie}`)
    const admins=await User.find({isAdmin:true})
admins.map((admin)=>{
    const admin_id=admin._id;
    const io = socket.getIO();
    if (io) {
        io.to(admin_id).emit('send_message', {
        //   message:`وصل بلاغ من ${reporter.first_name} ${reporter.last_name} ${reporter.last}`
        message:",وصل بلاغ",
        content:report
    })}});

    res.status(201).json({
        status: 'success',
        message: 'تم إرسال البلاغ بنجاح، سيتم مراجعته من قبل المشرفين',
        data: {
            reportId: report._id,
            reportedUser: reportedUser.name || reportedUser.email,
            reason: report.reason,
            type: report.type,
            status: report.status,
            createdAt: report.createdAt
        }
    });
});

/**
 * @desc Get all reports (Admin only)
 * @route GET /api/reports
 * @access Private (Admin only)
 */
module.exports.getAllReports = asyncHandler(async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح - هذا الروت للمشرفين فقط'
        });
    }

    const { status, type, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const reports = await Report.find(query)
        .populate('reporter', 'name email')
        .populate('reportedUser', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Report.countDocuments(query);

    res.status(200).json({
        status: 'success',
        count: reports.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: reports
    });
});

/**
 * @desc Update report status (Admin only)
 * @route PUT /api/reports/:id/status
 * @access Private (Admin only)
 */
module.exports.updateReportStatus = asyncHandler(async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح - هذا الروت للمشرفين فقط'
        });
    }

    const { status, adminNotes } = req.body;
    const reportId = req.params.id;

    const report = await Report.findById(reportId);
    if (!report) {
        return res.status(404).json({
            status: 'error',
            message: 'البلاغ غير موجود'
        });
    }

    report.status = status || report.status;
    if (adminNotes) report.adminNotes = adminNotes;
    report.reviewedAt = Date.now();
    report.reviewedBy = req.user.id;

    await report.save();

    res.status(200).json({
        status: 'success',
        message: 'تم تحديث حالة البلاغ بنجاح',
        data: report
    });
});

/**
 * @desc Get my reports (current user)
 * @route GET /api/reports/my-reports
 * @access Private
 */
module.exports.getMyReports = asyncHandler(async (req, res) => {
    const reports = await Report.find({ reporter: req.user.id })
        .populate('reportedUser', 'name email')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        count: reports.length,
        data: reports
    });
});

/**
 * @desc Get reports about me (reported user)
 * @route GET /api/reports/about-me
 * @access Private
 */
module.exports.getReportsAboutMe = asyncHandler(async (req, res) => {
    const reports = await Report.find({ reportedUser: req.user.id })
        .populate('reporter', 'name email')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        count: reports.length,
        data: reports
    });
});