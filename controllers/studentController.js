const Student_profile = require('../models/Student_profile');
const asyncHandler=require('express-async-handler');
const { Verify_request, validateVerifyRequest} = require('../models/VerifyRequest');


/**
 * @description send request to verify account (only student)
 * @route student/identity
 */
module.exports.addVerifyRequest = asyncHandler(async (req, res) => {

    // 2. البحث عن بروفايل الطالب المرتبط باليوزر الحالي (req.user._id)
    const studentProfile = await Student_profile.findOne({ user: req.user.id });
    if (!studentProfile) {
        return res.json({status:'error',message:'  🙂 لو بهمك كنت عرفت لحالك '})

    }
    const exist=await Verify_request.findOne({student:studentProfile._id});
    if(exist){
        return res.status(400).json({status:'error',message:'عندك طلب قيد المراجعة .............استنالك شوي '})
    }
    // 3. إنشاء الطلب وربطه بالبروفايل
    const request = await Verify_request.create({
        student: studentProfile._id,
        document: `images/verify_requests/${req.file.filename}`
    });

    res.status(201).json(request);
});

module.exports.getAllVerifyRequests = asyncHandler(async (req, res) => {
    const isAdmin=req.user.isAdmin
    if(!isAdmin){
        return res.status(707).json({status:'error',message:'you are not admin'})
    }
    // جلب الطلبات مع بيانات الطالب (الاسم، الرقم، الصورة) من مودل Student_profile
    const requests = await Verify_request.find()
        .populate('student', 'first_name father_name last_name university_number profile_photo')
        .sort('-createdAt');

    res.status(200).json(requests);
});
