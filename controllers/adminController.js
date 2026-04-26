const asyncHandler = require('express-async-handler');
const { OverseerProfile } = require('../models/Overseer_profile'); 
const { User, validateAddOverseer } = require('../models/User');
const bcrypt = require('bcryptjs'); 
const Student_profile = require('../models/Student_profile');
const Patient_profil=require('../models/Patient_profile');
const { Verify_request } = require('../models/VerifyRequest');
const socket = require('../socket/init');
const Course = require('../models/Course');
const Treatment = require('../models/Treatment'); // استيراد مودل العلاج



/**
 * @desc create new overseer 
 * @route /api/admin/overseer
 * @method post 
 * @access private (Admin Only)
 */
module.exports.createOverseer = asyncHandler(async (req, res) => {
    // 1. التحقق من صحة البيانات المرسلة (Validation)
    const { error } = validateAddOverseer(req.body);
    if (error) {
        // نستخدم error.details[0].message للحصول على نص الخطأ الواضح
        return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    // 2. التحقق من الصلاحية (Admin Only)
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ 
            status: 'error', 
            message: 'تستهبل !!!! انت مش مدير لحتى تضيف مشرف' 
        });
    }

    // 3. استخراج البيانات من الطلب (هذا يمنع خطأ undefined)
    const { email, password,first_name,last_name,father_name } = req.body;

    // 4. التحقق من وجود المستخدم مسبقاً
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ status: 'error', message: 'هذا الإيميل مسجل مسبقاً' });
    }

    // 5. تشفير كلمة السر
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. إنشاء الحساب في جدول المستخدمين
    const overseer = await User.create({
        email,
        password: hashedPassword,
        role: 'overseer',
    });

    // 7. إنشاء ملف شخصي للمشرف وربطه بحسابه
    const profile= await OverseerProfile.create({
        user: overseer._id,
        first_name:first_name,
        last_name:last_name,
        father_name:father_name,
        is_verified:true
    });

    // 8. الرد بنجاح
    res.status(201).json({
        status: 'success',
        message: 'تم إنشاء حساب المشرف وملفه الشخصي بنجاح',
        data: {
            id: overseer._id,
            email: overseer.email,
            profile:profile

        }
    });
});

const fs = require('fs');
const path = require('path');
const { Category, valedate_add_category } = require('../models/Category');
const { validate_practical_lesson, Practial_lesson } = require('../models/Practical_lesson');
/**
 * @description قبول  طلب توثيق حساب
 * @route /api/admin/accept/reject/:id
 */

module.exports.verify_account_accept = asyncHandler(async (req, res) => {
    // 1. Admin Authorization check
    if (!req.user || !req.user.isAdmin) {
       return res.status(403).json({ status: 'error', message: 'غير مسموح لك بالوصول' });
    }

    // 2. Find the verification request
    const request = await Verify_request.findById(req.params.id);
    if (!request) {
       return res.status(404).json({ status: 'error', message: 'لا يوجد طلب بهذا المعرف' });
    }

    // 3. Find the student profile
    const student = await Student_profile.findById(request.student_profile);
    if (!student) {
        return res.status(404).json({ status: 'error', message: 'ملف الطالب غير موجود' });
    }

    // 4. Update student data from Admin input (req.body)
    const { first_name, father_name, last_name, university_number } = req.body;
    
    if (first_name) student.first_name = first_name;
    if (father_name) student.father_name = father_name;
    if (last_name) student.last_name = last_name;
    if (university_number) student.university_number = university_number;
    
    student.is_verified = true;
    await student.save();

    // 5. Delete the uploaded document from the server
    if (request.document) {
        // Construct the full path (assuming 'document' stores the relative path)
        const imagePath = path.join(__dirname, '..', request.document); 
        
        fs.unlink(imagePath, (err) => {
            if (err) console.error("فشل حذف ملف الصورة:", err);
            else console.log("تم حذف ملف طلب التوثيق من السيرفر");
        });
    }

    // 6. Remove the request from the database
    await Verify_request.findByIdAndDelete(req.params.id);

    // 7. Socket Notification
    const io = socket.getIO();
    if (io) {
        io.to(request.user.toString()).emit('VerifyAccepted', {
            message: `تم توثيق حسابك وتحديث بياناتك بنجاح`,
            timestamp: new Date()
        });
    }

    res.status(200).json({
        status: 'success',
        message: "تم توثيق الحساب، تحديث البيانات، وحذف الطلب بنجاح",
        data: student
    });
});


/**
 * @description رفض طلب توثيق حساب
 * @route /api/admin/verification/reject/:id
 */
module.exports.verify_account_reject = asyncHandler(async (req, res) => {
    // 1. التحقق من صلاحية الأدمن
    if (!req.user || !req.user.isAdmin) {
       return res.status(403).json({ status: 'error', message: 'غير مسموح لك بالوصول' });
    }

    // 2. البحث عن طلب التوثيق
    const request = await Verify_request.findById(req.params.id);
    if (!request) {
       return res.status(404).json({ status: 'error', message: 'لا يوجد طلب بهذا المعرف' });
    }

    // 3. استلام سبب الرفض من الأدمن
    const { reject_reason } = req.body;
    if (!reject_reason) {
        return res.status(400).json({ status: 'error', message: 'يرجى تقديم سبب لرفض الطلب' });
    }

    // 4. حذف ملف الصورة المرتبط بالطلب من السيرفر
    if (request.document) {
        const imagePath = path.join(__dirname, '..', request.document);
        
        fs.unlink(imagePath, (err) => {
            if (err) console.error("فشل حذف ملف الصورة أثناء الرفض:", err);
            else console.log("تم حذف مستند التوثيق المرفوض من السيرفر");
        });
    }

    // 5. إرسال تنبيه للطالب عبر Socket قبل حذف الطلب
    const io = socket.getIO();
    if (io) {
        io.to(request.user.toString()).emit('VerifyRejected', {
            message: `للأسف، تم رفض طلب توثيق حسابك. السبب: ${reject_reason}`,
            reason: reject_reason,
            timestamp: new Date()
        });
    }

    // 6. حذف الطلب من قاعدة البيانات
    await Verify_request.findByIdAndDelete(req.params.id);

    res.status(200).json({
        status: 'success',
        message: "تم رفض الطلب بنجاح وحذف البيانات المتعلقة به"
    });
});


 /**
 * @description Get all patients
 * @route /api/admin/patients
 */
module.exports.get_all_patients = asyncHandler(async (req, res) => {
    // التأكد من صلاحية الأدمن
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ status: 'error', message: 'غير مسموح لك بالوصول' });
    }

    const patients = await  Patient_profil.find()
    
    res.status(200).json({
        status: 'success',
        results: patients.length,
        data: patients
    });
});

 /**
 * @description Get all overseers
 * @route /api/admin/overseers
 */
module.exports.get_all_overseers = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ status: 'error', message: 'غير مسموح لك بالوصول' });
    }

    const admins = await OverseerProfile.find();
    
    res.status(200).json({
        status: 'success',
        results: admins.length,
        data: admins
    });
});
/**
 * @description Get all students with their profiles
 * @route /api/admin/students
 */
module.exports.get_all_students = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ status: 'error', message: 'غير مسموح لك بالوصول' });
    }

    // جلب المستخدمين الذين دورهم "طالب" ودمج بيانات ملفهم الشخصي
    const students = await Student_profile.find();


    res.status(200).json({
        status: 'success',
        results: students.length,
        data: students
    });
});


/**
 * @description add Cours 
 * @route api/admin/cours 
 * @method post
 * @access private (admin)
 */


module.exports.createCourse = asyncHandler(async (req, res) => {
    
    // 1. التحقق من صلاحية الأدمن (isAdmin)
    if (!req.user || !req.user.isAdmin) { 
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح! يجب أن تكون مسؤولاً لإضافة مادة'
        });
    }

    const { course_name } = req.body;


 


    const new_course = await Course.create({
        course_name,
       
    });

    return res.status(201).json({
        status: 'success',
        message: 'تم',
        data: new_course
    });
});

// @الوصف: جلب جميع المواد مع بيانات المشرفين (الاسم الأول، الكنية، واسم الأب)
// @المسار: GET /api/courses
exports.get_courses = asyncHandler(async (req, res) => {
    const courses = await Course.find()
        .populate({
            path: 'overseers.$*', // الوصول للمصفوفات داخل الـ Map
            select: 'first_name last_name father_name',
        });

    if (!courses || courses.length === 0) {
        return res.status(404).json({ status: 'error', message: 'لا توجد مواد' });
    }

    return res.status(200).json({
        status: 'success',
        data: courses
    });
});

/**
 * @description add Treatment
 * @route api/admin/treatment
 * @method post
 * @access private only admin
 */
exports.addTreatment = async (req, res) => {
    const user=req.user
    if(!user.isAdmin){
        return res.status(403).json({
            status:'error',
            message:' you are noyt admin'
        })
    }
    try {
        const { case_type, course } = req.body;

        // 1. البحث عن المادة في جدول المواد باستخدام المعرف المرسل
        const existingCourse = await Course.findById(course);
        // 2. إذا لم يتم العثور على المادة، نرسل خطأ 404
        if (!existingCourse) {
            return res.status(404).json({
                status:'error',
                message: "المادة المطلوبة غير موجودة في قاعدة البيانات."
            });
        }

        // 3. إذا وجدت المادة، نقوم بإنشاء سجل العلاج الجديد
        const newTreatment = new Treatment({
            case_type: case_type,
            course: course // ربط العلاج بالمادة عبر الـ ID
        });

        // 4. حفظ البيانات
        await newTreatment.save();

        res.status(201).json({
            status:'success',
            message: "تمت إضافة سجل العلاج وربطه بالمادة بنجاح.",
            data: newTreatment
        });

    } catch (error) {
        // التعامل مع أخطاء السيرفر أو الـ ID غير الصحيح (Invalid ObjectId)
        res.status(500).json({
            status:'error',
            message: "حدث خطأ أثناء معالجة الطلب.",
            error: error.message
        });
    }
};



// 1. عرض جميع المعالجات مع بيانات المواد المرتبطة
exports.getAllTreatments = async (req, res) => {
    try {
        let treatments
        // استخدمنا populate لجلب بيانات المادة بدلاً من مجرد الـ ID
        if(req.user.role==='patient'){treatments = await Treatment.find();}
        else {treatments = await Treatment.find().populate({
            path:'course',
            select:'course_name'
        })}
        
        res.status(200).json({
status:'success',
count: treatments.length,
            data: treatments
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. حذف معالجة محددة بواسطة الـ ID
exports.deleteTreatment = async (req, res) => {
    const user=req.user
    if(!user.isAdmin){
        return res.status(403).json({
            status:'error',
            message:' you are noyt admin'
        })
    }
    try {
        const treatment = await Treatment.findByIdAndDelete(req.params.id);

        if (!treatment) {
            return res.status(404).json({
                status:'error',
                message: "المعالجة غير موجودة لحذفها."
            });
        }

        res.status(200).json({
            status:'success',
            message: "تم حذف المعالجة بنجاح."
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @description add  category 
 * @route api/admin/category
 * @method post 
 * @access private( only admin)
 */
module.exports.add_category=asyncHandler(async(req,res)=>{
    const {error}=valedate_add_category(req.body);
    if(error){return res.status(400).json({status:'error',message:error.details[0].message})}
const user =req.user;
const isAdmin=req.user.isAdmin;
if(!isAdmin){return res.status(403).json({status:'error', message:'انت لست مشرف '})};
const result=await Category.create({
    category:req.body.category
})
res.status(201).json({status:'success',message:'تمت اضافة الفئة بنجاح',result})
})

/**
 * @description get  categories
 * @route api/admin/category
 * @method post 
 * @access private( only admin)
 */
module.exports.get_categorirs=asyncHandler(async(req,res)=>{
    const user =req.user;
const isAdmin=req.user.isAdmin;
if(!isAdmin){return res.status(403).json({status:'error', message:'انت لست مشرف '})};
const data=await Category.find();
res.status(201).json({status:'success',message:'هذه هي الفئات لدينا ',data})


})
/**
 * @description إضافة درس عملي جديد
 * @route /api/admin/practical-lessons
 * @method POST
 * @access private (Admin only)
 */
module.exports.add_practical_lesson = asyncHandler(async (req, res) => {
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
 * @description assign overseer on lesson 
 * @route PUT api/admin/overseer/assign 
 * @access private (only admin)
 */
module.exports.assign_overseer = asyncHandler(async (req, res) => {
    // 1. التحقق من الصلاحيات (يفضل أن يكون ذلك في Middleware منفصل)
    if (!req.user.isAdmin) {
        return res.status(403).json({ status: 'error', message: 'عذراً، هذه الصلاحية للمشرفين فقط' });
    }

    // 2. استقبال البيانات من req.body
    const { lessonId, overseerId } = req.body;

    // 3. البحث عن الحصة
    const lesson = await Practial_lesson.findById(lessonId);
    if (!lesson) {
        return res.status(404).json({ status: 'error', message: 'الحصة غير موجودة' });
    }

    // 4. التحقق من عدد المشرفين (أقصى حد 2)
    if (lesson.overseers.length >= 2) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'غير مسموح بتعيين أكثر من مشرفين على هذه المادة' 
        });
    }

    // 5. إضافة المشرف باستخدام push (مع التأكد من عدم تكراره إذا أردت)
    if (lesson.overseers.includes(overseerId)) {
        return res.status(400).json({ status: 'error', message: 'هذا المشرف معين بالفعل لهذه المادة' });
    }
    const course=await Course.findById(lesson.course);
    const overseer_profile= await OverseerProfile.findOne({user:overseerId});
    const category= await Category.findById(lesson.category)
    lesson.overseers.push(overseerId);
    await lesson.save();
console.log(overseer_profile)
const overseer_name=overseer_profile.first_name;
    res.status(200).json({ 
        status: 'success', 
        message:`تم تكليف المشرف ${overseer_name} ${overseer_profile.last_name} بالمادة ${course.course_name} للفئة ${category.category}`,
        data: lesson 
    });
});





