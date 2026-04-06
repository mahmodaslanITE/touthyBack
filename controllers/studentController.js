const Student_profile = require('../models/Student_profile');
const asyncHandler=require('express-async-handler');
const { Verify_request, validateVerifyRequest} = require('../models/VerifyRequest');
const { date } = require('joi');
const Course = require('../models/Course');


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
    const exist=await Verify_request.findOne({student_profile:studentProfile.id});
    if(exist){
        return res.status(400).json({status:'error',message:'عندك طلب قيد المراجعة .............استنالك شوي '})
    }
    console.log(`exist.........${exist}`)
    // 3. إنشاء الطلب وربطه بالبروفايل
    const request = await Verify_request.create({
        user:studentProfile.user,
        student_profile: studentProfile._id,
        document: `images/verify_requests/${req.file.filename}`
    });

    res.status(201).json({status:'success',message:'ـم انشاء الطلب بنجاح',date:request});
});

module.exports.getAllVerifyRequests = asyncHandler(async (req, res) => {
    const isAdmin=req.user.isAdmin
    if(!isAdmin){
        return res.status(707).json({status:'error',message:'you are not admin'})
    }
    // جلب الطلبات مع بيانات الطالب (الاسم، الرقم، الصورة) من مودل Student_profile
    const requests = await Verify_request.find()
        .populate('student_profile', 'user first_name father_name last_name university_number profile_photo')
        .sort('-createdAt');

    res.status(200).json({status:'success',message:'هذه هي طلبات التوثيق أرسل لي الرقم الخاص بالطلب مع الموافقة أو الرفض',data:requests});
});


// عرض المشرفين عن مادة معينة 

/**
 * @description Get overseers for a specific course based on student category
 * @route GET /student/course-overseers/:courseName
 */
module.exports.getCourseOverseers = asyncHandler(async (req, res) => {
    // 1. البحث عن بروفايل الطالب المرتبط باليوزر الحالي لجلب الفئة (category)
    const studentProfile = await Student_profile.findOne({ user: req.user.id });
    
    if (!studentProfile) {
        return res.status(404).json({ 
            status: 'error', 
            message: 'لم يتم العثور على ملف شخصي لهذا الطالب' 
        });
    }

    const studentCategory = studentProfile.category; // تأكد أن الحقل بهذا الاسم في مودل الطالب

    // 2. البحث عن المادة وعمل Populate لبيانات المشرفين في فئة الطالب فقط
    const course = await Course.findById( req.params.id )
        // .populate({
        //     path: `overseers.${studentCategory}`,
        //     select: 'first_name last_name profile_photo phone' // اختر الحقول التي تريد عرضها للمشرف
        // });

    if (!course) {
        return res.status(404).json({ 
            status: 'error', 
            message: 'المادة غير موجودة' 
        });
    }

    // 3. استخراج البيانات من الـ Map
    const overseersList = course.overseers.get(studentCategory) || [];
    const sessionTime = course.categories.get(studentCategory);

    res.status(200).json({
        status: 'success',
        data: {
            course_name: course.course_name,
            category: studentCategory,
            time: sessionTime,
            overseers: overseersList
        }
    });
});
