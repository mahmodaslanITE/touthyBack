const Student_profile = require('../models/Student_profile');
const asyncHandler=require('express-async-handler');
const { Verify_request, validateVerifyRequest} = require('../models/VerifyRequest');
const socket = require('../socket/init');

const Course = require('../models/Course');
const { OverseerProfile } = require('../models/Overseer_profile');
const { Practial_lesson } = require('../models/Practical_lesson');
const InProcess = require('../models/InProcess');
const { Pending_request } = require('../models/Pending');
const Treatment = require('../models/Treatment');
const { model } = require('mongoose');
const Finished = require('../models/Finished');
const Rejected=require('../models/Rejected')


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

  // 1. جلب الدرس أولاً للحصول على أرقام المعرفات
const lesson = await Practial_lesson.findOne({
    category: studentCategory,
    course: req.params.id
})
let overseersProfiles=null
let course_name=null
if (lesson) {
   course_name=await Course.findById(lesson.course)

    // 2. البحث في جدول البروفايل عن كل المعرفات الموجودة في مصفوفة overseers
     overseersProfiles = await OverseerProfile.find({
        user: { $in: lesson.overseers }
    }).select('first_name last_name user profile_photo');
}
else{
    return res.status(500).json({status:'error',message:'لم يتم تعيين موعد لفئتك بعد في هذه المادة'})
}
console.log(` the lesson is ${lesson}`)
res.status(200).json({status:'success',message:`المشرفين المسؤولين عن فئتك في مادة  ${course_name.course_name}`,data:overseersProfiles});

});
/*
 * @desc Show all requests
 * @route GET /api/requestion
 * @access Private
 ------------------------------------------------------*/
 module.exports.showAllRequesyions = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
  
    if (!userId) {
      return res.status(403).json({
        status: 'error',
        message: 'you have to login if you would show requests'
      });
    }
  
    if (role === 'patient') {
      return res.status(403).json({
        status: 'error',
        message: 'because of patients privacy you are not allowed to see requests'
      });
    }
  
    const undata = await Pending_request.find()
    .populate({
      path: 'case_type',
      select: '_id case_type course',
      populate: {
        path: 'course',
        select: '_id course_name'
      }
    });
  
  // إعادة فصل case_type و course
  const data = undata.map(item => ({
    _id: item._id,
    user: item.user,
    pain_severity: item.pain_severity,
    pain_time: item.pain_time,
    tooth_location: item.tooth_location,
    gender: item.gender,
    status: item.status,
    case_type: {
      _id: item.case_type._id,
      case_type: item.case_type.case_type
    },
    course_info: item.case_type.course
      ? {
          _id: item.case_type.course._id,
          course_name: item.case_type.course.course_name
        }
      : null,
    more_details: item.more_details,
    age: item.age,
    photo: item.photo,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }));
  
    res.status(200).json({
      status: 'success',
      message: 'this is all requests',
      data
    });
  });
  
  

/**-----------------------------------------------------
 * @desc Accept request
 * @route post /api/requestion/:id/accept/:overseerId
 * @access Private (student)
 ------------------------------------------------------*/
 module.exports.acceptRequest = asyncHandler(async (req, res) => {
    const user = req.user;
    const role = req.user.role;
    const { id, overseer } = req.params; // جلب الـ IDs من الرابط
  
    // 1. التحقق من صلاحية المستخدم
    if (!user || role !== 'student') {
      return res.status(403).json({ status: 'error', message: 'غير مسموح.. للطلاب فقط' });
    }
  
    // 2. جلب بيانات الطالب والطلب
    const student = await Student_profile.findOne({ user: user.id });
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'ملف الطالب غير موجود' });
    }
  
    const request = await Pending_request.findById(id);
    if (!request) {
      return res.status(404).json({ status: 'error', message: 'الطلب غير موجود او تم قبوله مسبقا' });
    }
    console.log(`the status is ${request.status}`)
  
    
  
    // 3. التحقق من عدم وجود حالة مماثلة قيد التنفيذ
    const request_in_process = await InProcess.findOne({ 
      student: user.id, 
      case_type: request.case_type 
    });
  const the_treatment = await Treatment.findById(request.case_type);
  
    if (request_in_process) {
      return res.status(403).json({
        status: 'error',
        message: `لديك حالة من نوع (${the_treatment.case_type}) قيد التنفيذ حالياً`
      });
    }
  
    if (!the_treatment) {
      return res.status(404).json({ status: 'error', message: 'بيانات المعالجة غير موجودة' });
    }
  
    const the_course = await Course.findById(the_treatment.course);
    if (!the_course) {
      return res.status(404).json({ status: 'error', message: 'المادة المرتبطة بهذه الحالة غير موجودة' });
    }
  
    const lesson=await Practial_lesson.findOne({course:the_treatment.course,category:student.category})
    const overseers=lesson.overseers
    if( ! overseers.includes(overseer)){
      return res.status(400).json({
        status:'error',
        message:'المشرف الذي اخترته غير مسؤول عن فئتك'
      })
    }
    
    
  
  
  
    // 5. تحديث حالة الطلب
    await Pending_request.findByIdAndDelete(id);
  
    // 6. إرسال التنبيه عبر Socket
    const location=lesson.hall;
    const time=lesson.time;

    const patientId = request.user.toString();
    
    const io = socket.getIO();
    if (io) {
      io.to(patientId).emit('requestAccepted', {
        message: `تم قبول حالتك من قبل الطالب ${student?.first_name || ''} ${student?.last_name || ''} يرجى الحضور الى العيادة ${location} في ..${time}`,
        time, location
      });
      io.to(overseer).emit('requestAccepted',{
        message:`لقد اختارك الطالب ${student.first_name} ${student.last_name} لتكون مسؤولا عن حالته ${the_treatment.case_type} يرجى الاطلاع عليها واتخاذ ما يلزم `,
        request_in_process
      })
    }

    const requestData = request.toObject();

// إزالة الحقول التي لا تريدها
delete requestData._id;
delete requestData.user;
delete requestData.case_type;
delete requestData.createdAt;
delete requestData.updatedAt;
delete requestData.__v;

    // 7. إضافة السجل لجدول العمليات (InProcess)
    const in_process = new InProcess({
      patient: request.user,
      student: user.id,
      Requestion: requestData,
      case_type: request.case_type,
      overseer: overseer, // تخزين المشرف الذي تم اختياره
      date_of_accepting: new Date()
    });
    
    await in_process.save();
  
    res.status(200).json({
      status: 'success',
      message: 'تم قبول الطلب بنجاح وتم إشعار المريض والمشرف'
    });
  });
  
  /**
   * @desc get user proceccing request
   */
  exports.getUserProcessingTreatmentRequests = asyncHandler(async (req, res) => {
    const user = req.user;
    const role =user.role;
    let requests;
    if(role=='student'){
     requests = await InProcess.find({ student: user.id })
        .select('-student -__v')
        .populate({
            path: 'case_type',
            model: 'Treatment',
            populate: {
                path: 'course',
                model: 'Course',
                select: 'course_name' // سيجلب الـ _id تلقائياً مع الاسم
            }
        })
        .populate({
            path: 'patient',
            model: 'Patient_profil',
            foreignField: 'user',
            localField: 'patient',
            select: '-_id first_name father_name last_name'
        })
        .populate({
            path: 'overseer',
            model: 'OverseerProfile',
            foreignField: 'user',
            localField: 'overseer',
            select: '-_id first_name father_name last_name'
        })
        .lean();
      }else if(role=='patient'){
         requests = await InProcess.find({ patient: user.id })
        .select('-student -__v')
        .populate({
            path: 'case_type',
            model: 'Treatment',
            populate: {
                path: 'course',
                model: 'Course',
                select: 'course_name' // سيجلب الـ _id تلقائياً مع الاسم
            }
        })
        .populate({
            path: 'student',
            model: 'Student_profile',
            foreignField: 'user',
            localField: 'student',
            select: '-_id first_name father_name last_name'
        })
        .populate({
            path: 'overseer',
            model: 'OverseerProfile',
            foreignField: 'user',
            localField: 'overseer',
            select: '-_id first_name father_name last_name'
        })
        .lean();
      }
    // إعادة تشكيل البيانات لفصل case_type عن course
    const formattedRequests = requests.map(doc => {
        const item = { ...doc };
        
        if (item.case_type) {
            // 1. استخراج الـ course في كائن منفصل
            item.course_info = item.case_type.course;
            
            // 2. تحديث كائن case_type ليحتوي فقط على بياناته وحذف التداخل
            item.case_type = {
                _id: item.case_type._id,
                case_type: item.case_type.case_type
            };
            
            // 3. حذف الكائن الأصلي المتداخل
            // delete item.case_type;
        }

        return item;
    });

    res.status(200).json({
        status: 'success',
        message: 'this is your processing requests',
        data: formattedRequests
    });
});


/**
 * get finished treatment for student  and patient
 */
module.exports.get_student_finished_requests=asyncHandler(async(req,res)=>{
const user = req.user;
const role =user.role;
let requests;
if(role=='student'){
 requests = await Finished.find({ student: user.id })
    .select('-student -__v')
    .populate({
        path: 'case_type',
        model: 'Treatment',
        populate: {
            path: 'course',
            model: 'Course',
            select: 'course_name' // سيجلب الـ _id تلقائياً مع الاسم
        }
    })
    .populate({
        path: 'patient',
        model: 'Patient_profil',
        foreignField: 'user',
        localField: 'patient',
        select: '-_id first_name father_name last_name'
    })
    .populate({
        path: 'overseer',
        model: 'OverseerProfile',
        foreignField: 'user',
        localField: 'overseer',
        select: '-_id first_name father_name last_name'
    })
    .lean();
  }
  else if(role=='patient'){
    requests = await Finished.find({ patient: user.id })
    .select('-student -__v')
    .populate({
        path: 'case_type',
        model: 'Treatment',
        populate: {
            path: 'course',
            model: 'Course',
            select: 'course_name' // سيجلب الـ _id تلقائياً مع الاسم
        }
    })
    .populate({
        path: 'student',
        model: 'Student_profile',
        foreignField: 'user',
        localField: 'student',
        select: '-_id first_name father_name last_name'
    })
    .populate({
        path: 'overseer',
        model: 'OverseerProfile',
        foreignField: 'user',
        localField: 'overseer',
        select: '-_id first_name father_name last_name'
    })
    .lean();
  }
// إعادة تشكيل البيانات لفصل case_type عن course
const formattedRequests = requests.map(doc => {
    const item = { ...doc };
    
    if (item.case_type) {
        // 1. استخراج الـ course في كائن منفصل
        item.course_info = item.case_type.course;
        
        // 2. تحديث كائن case_type ليحتوي فقط على بياناته وحذف التداخل
        item.case_type = {
            _id: item.case_type._id,
            case_type: item.case_type.case_type
        };
        
        // 3. حذف الكائن الأصلي المتداخل
        // delete item.case_type;
    }

    return item;
});

res.status(200).json({
    status: 'success',
    message: 'this is your finished  requests',
    data: formattedRequests
});
});

 /**
/**
 * get rejected  treatment for student 
 */
module.exports.get_student_rejected_requests=asyncHandler(async(req,res)=>{
const user = req.user;
const role =user.role;
let requests;
if(role=='student'){
    
requests = await Rejected.find({ student: user.id })
    .select('-student -__v')
    .populate({
        path: 'case_type',
        model: 'Treatment',
        populate: {
            path: 'course',
            model: 'Course',
            select: 'course_name' // سيجلب الـ _id تلقائياً مع الاسم
        }
    })
    .populate({
        path: 'patient',
        model: 'Patient_profil',
        foreignField: 'user',
        localField: 'patient',
        select: '-_id first_name father_name last_name'
    })
    .populate({
        path: 'overseer',
        model: 'OverseerProfile',
        foreignField: 'user',
        localField: 'overseer',
        select: '-_id first_name father_name last_name'
    })
    .lean();
  }
  else if (role=='patient'){
    requests = await Rejected.find({ patient: user.id })
    .select('-student -__v')
    .populate({
        path: 'case_type',
        model: 'Treatment',
        populate: {
            path: 'course',
            model: 'Course',
            select: 'course_name' // سيجلب الـ _id تلقائياً مع الاسم
        }
    })
    .populate({
        path: 'student',
        model: 'Student_profile',
        foreignField: 'user',
        localField: 'student',
        select: '-_id first_name father_name last_name'
    })
    .populate({
        path: 'overseer',
        model: 'OverseerProfile',
        foreignField: 'user',
        localField: 'overseer',
        select: '-_id first_name father_name last_name'
    })
    .lean();
  }
// إعادة تشكيل البيانات لفصل case_type عن course
const formattedRequests = requests.map(doc => {
    const item = { ...doc };
    
    if (item.case_type) {
        // 1. استخراج الـ course في كائن منفصل
        item.course_info = item.case_type.course;
        
        // 2. تحديث كائن case_type ليحتوي فقط على بياناته وحذف التداخل
        item.case_type = {
            _id: item.case_type._id,
            case_type: item.case_type.case_type
        };
        
        // 3. حذف الكائن الأصلي المتداخل
        // delete item.case_type;
    }

    return item;
});

res.status(200).json({
    status: 'success',
    message: 'this is your rejected   requests',
    data: formattedRequests
});
});

 /**
 * @desc إعادة تعيين مشرف للطلب بعد تغيير نوع الحالة
 * @route /api/student/reassign-overseer/:id/overseer
 * @method put
 * @access private (Student only)
 */
module.exports.reassign_overseer = asyncHandler(async (req, res) => {
  const requestId = req.params.id; // ID الطلب في جدول InProcess
  const overseerId  = req.params.overseer; // ID المشرف الجديد الذي اختاره الطالب
  const studentId = req.user.id;   // ID الطالب من التوكن

  // 1. التحقق من وجود الطلب في InProcess وتأكيد ملكيته للطالب
  const requestInProcess = await InProcess.findOne({ _id: requestId, student: studentId });

  if (!requestInProcess) {
      return res.status(404).json({ 
          message: 'الطلب غير موجود أو لا يخصك، لا يمكنك تعديله' 
      });
  }

  
 
  if (requestInProcess.overseer !== null) {
      return res.status(400).json({ 
          message: 'هذا الطلب لديه مشرف بالفعل، لا يمكنك تعيين مشرف جديد حالياً' 
      });
  }

  // 3. تحديث المشرف في جدول InProcess
  requestInProcess.overseer = overseerId;
  await requestInProcess.save();


  

  res.status(200).json({
      status: 'success',
      message: 'تم تعيين المشرف الجديد بنجاح، الطلب الآن قيد المراجعة',
      data: requestInProcess
  });
});
