// controllers/reportController.js
const asyncHandler = require('express-async-handler');
const Report = require('../models/Report');
const{User} = require('../models/User');
const getUserProfile = require('../utils/users');
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
    const reported=req.params.id

    // 1. التحقق من وجود المستخدم المبلغ عنه
    const reportedUser = await User.findById(reported);
    if (!reportedUser) {
        return res.status(404).json({
            status: 'error',
            message: 'المستخدم المبلغ عنه غير موجود'
        });
    }

    // 2. منع الإبلاغ عن النفس
    if (reporterId === reported) {
        return res.status(400).json({
            status: 'error',
            message: 'لا يمكنك الإبلاغ عن نفسك'
        });
    }
    // 4. منع التكرار (يمكن للمستخدم الإبلاغ عن نفس الشخص مرة كل 24 ساعة)
    const existingReport = await Report.findOne({
        reporter: reporterId,
        reported: reported,
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
        reported: reported,
        reason: reason,
        type: type || 'other'
    });
    const reporter=await getUserProfile(reporterId,role)
    const admins=await User.find({isAdmin:true})
    const io = socket.getIO();

admins.map((admin)=>{
    const admin_id=admin._id.toString();
    if (io) {
        io.to(admin_id).emit('report', {
          message:`وصل بلاغ من ${reporter.first_name} ${reporter.last_name} ${reporter.last}`,
        content:report
    })}});

    res.status(201).json({
        status: 'success',
        message: 'تم إرسال البلاغ بنجاح، سيتم مراجعته من قبل المشرفين',
        data: {
            reportId: report._id,
            reported: reportedUser.name || reportedUser.email,
            reason: report.reason,
            type: report.type,
            status: report.status,
            createdAt: report.createdAt
        }
    });
});


/**
 * @desc Get pending reports (Admin only)
 * @route GET /api/reports
 * @access Private (Admin only)
 */
module.exports.get_pending_reports = asyncHandler(async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح - هذا الروت للمشرفين فقط'
        });
    }

    const reports = await Report.find({ status: 'pending' });
    if(reports.length==0){
        return res.status(200).json({
            status:'success',
            message:' لا يوجد ابلاغات جديدة '
        })
    }
    
    const formated_reports = await Promise.all(reports.map(async (report) => {
        const reporter = await User.findById(report.reporter);
        const reporter_role = reporter.role;
        
        const reported = await User.findById(report.reported);
        const reported_role = reported.role;
        
        const reporter_profile = await getUserProfile(reporter._id, reporter_role);
        const reported_profile = await getUserProfile(reported._id, reported_role);

        
        return {
            _id:report._id,
            reason: report.reason,
            type: report.type,
            status: report.status,
            admin_note: report.adminNotes,
            reviewed_at: report.reviewedAt,
            reviewed_by: report.reviewedBy,
            created_at: report.createdAt,
            reporter:{ full_name:`${reporter_profile.first_name} ${reporter_profile.father_name} ${reporter_profile.last_name}`},
            reported: reported_profile
        };
    }));

    res.status(200).json({
        status: 'success',
        count: formated_reports.length,
        data: formated_reports
    });
});

/**
 * @description rewiw reports
 * @route api/reporst/:id
 * @method put 
 * @access private (only admin )
 */
module.exports.review_report=asyncHandler(async(req,res)=>{
    const note=req.body.note;
    const admin_id=req.user.id;
    const isAdmin=req.user.isAdmin;
    const report_id=req.params.id;
    const report=await Report.findById(report_id);
    if(!isAdmin){
        return res.status(403).json({
            status:'error',
            message:'انت مش ادمن '
        })
    }
    if(!report){
        return res.status(404).json({
            status:'error',
            message:'الابلاغ غير موجود '
        })
    }
    if(report.status=='reviewed'){
        return res.status(404).json({
            status:'error',
            message:' هذا الابلاغ تم حله مسبقا '
        })
    }
    report.status='reviewed';
    report.reviewedBy=admin_id;
    report.reviewedAt=Date.now();
    if(note){report.adminNotes=note};
    await report.save();
    res.status(200).json({
        status:'success',
        message:'تمت مراجعة الابلاغ بنجاح '
    })
})


/**
 * @description Get all admins with their profiles (accessible by all authenticated users)
 * @route GET /api/admins
 * @access Private (any authenticated user)
 */
module.exports.getAllAdmins = asyncHandler(async (req, res) => {
    // 1. فقط التأكد من أن المستخدم مسجل دخول (وليس بالضرورة أدمن)
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'يجب تسجيل الدخول أولاً'
        });
    }

    // 2. جلب جميع المستخدمين الذين دورهم admin ✅ تصحيح اسم الحقل
    const admins = await User.find({ isAdmin: true }).select('-password -__v');

    // 3. جلب الملفات الشخصية لكل أدمن
    const adminsWithProfiles = await Promise.all(
        admins.map(async (admin) => {
            const profile = await getUserProfile(admin._id, admin.role);
            
            return {
                _id: admin._id,
                profile: {
                    first_name: profile?.first_name || '',
                    father_name: profile?.father_name || '',
                    last_name: profile?.last_name || '',
                    full_name: profile ? 
                        `${profile.first_name || ''} ${profile.father_name || ''} ${profile.last_name || ''}`.trim() : 
                        admin.email,
                    profile_photo: profile?.profile_photo || null,
                    bio: profile?.bio || '',
                    gender: profile.gender || 'gay',
                },
            };
        })
    );

    // 4. إرسال الرد
    res.status(200).json({
        status: 'success',
        message: 'هذه قائمة جميع المشرفين',
        count: adminsWithProfiles.length,
        data: adminsWithProfiles
    });
});