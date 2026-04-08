const { TreatmentRequest, validateTreatmentRequest, validateUpdateRequest } = require('../models/Requestion');
const asyncHandler = require('express-async-handler');
const socket = require('../socket/init');
// الموديل بالاسم الجديد
const Student_profile = require('../models/Student_profile');
const InProcess = require('../models/InProcess');
const Treatment = require('../models/Treatment');
const Course = require('../models/Course');
const { OverseerProfile } = require('../models/Overseer_profile');

/**-----------------------------------------------------
 * @desc Create treatment request
 * @route POST /api/requestion
 * @access Private
 ------------------------------------------------------*/
 exports.createTreatmentRequest = asyncHandler(async (req, res) => {
  const user = req.user;

  // 1. التحقق من وجود المستخدم وصلاحياته أولاً
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'غير مصرح لك' });
  }
  if (user.role !== 'patient') {
    return res.status(403).json({ status: 'error', message: 'يسمح فقط للمرضى بإنشاء طلب' });
  }

  // 2. تنفيذ التحقق
  const { error } = validateTreatmentRequest(req.body);
  if (error) {
    // إرجاع مصفوفة الأخطاء كاملة للتأكد من رؤيتها
    return res.status(400).json({
      status: 'error',
      errors: error.details.map(d => d.message) 
    });
  }

  // 3. تحويل moreDetails من String إلى JSON Object
  let more_detailsData = req.body.more_details;
  if (typeof req.body.more_details === 'string') {
    try {
      more_detailsData = JSON.parse(req.body.more_details);
    } catch (e) {
      return res.status(400).json({ status: 'error', message: 'حقل moreDetails ليس بتنسيق JSON صحيح' });
    }
  }

  // 4. معالجة الصورة
  let photoData = req.file ? {
    publicId: null,
    url: `images/requests/${req.file.filename}`
  } : null;
const case_type=req.body.case_type
const treatment=await Treatment.findById(case_type)
if(!treatment){
  return res.status(400).json({
    status:'error',
    message:'المعالجة التي طلبتها غير متاحة حاليا '
  })
}
  // 5. الحفظ في قاعدة البيانات
  const request = new TreatmentRequest({
    ...req.body,
    more_details: more_detailsData,
    user: user.id,
    photo: photoData
  });

  await request.save();
  res.status(201).json({ status: 'success', data: request });
});



/**-----------------------------------------------------
 * @desc Show my requests
 * @route GET /api/requestion/my
 * @access Private
 ------------------------------------------------------*/
exports.getUserTreatmentRequests = asyncHandler(async (req, res) => {
  const user = req.user;

  const requests = await TreatmentRequest.find({ user: user.id });

  res.status(200).json({
    status: 'success',
    message: 'this is your requests',
    data: requests
  });
});

/**________________________________________________________________________________
 * @desc update the requestion until it is pending
 * @route Put /api/requestion/:id
 * @access private
 *_____________________________________________________________________
 */
 module.exports.updateRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  // check role
  if (role !== 'patient') {
    return res.status(403).json({
      status: 'error',
      message: 'انت مش مريض علشان تعدل الحالة'
    });
  }

  // find request
  const request = await TreatmentRequest.findById(req.params.id);

  // check if request exists
  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'الحالة غير موجودة'
    });
  }

  // check ownership
  if (request.user!= userId) {
    return res.status(403).json({
      status: 'error',
      message: 'هذه الحالة ليست لك'
    });
  }

  // check status
  if (request.status !== 'pending') {
    return res.status(403).json({
      status: 'error',
      message: 'لا يمكن تعديل الحالة بعد قبولها أو رفضها'
    });
  }

  // validate body
  const { error } = validateUpdateRequest(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  // update fields
  const {
    pain_severity,
    pain_time,
    tooth_location,
    gender,
    is_pregnant,
    case_type,
    notes,
    age
  } = req.body;

  if (pain_severity !== undefined) request.pain_severity = pain_severity;
  if (pain_time !== undefined) request.pain_time = pain_time;
  if (tooth_location !== undefined) request.tooth_location = tooth_location;
  if (gender !== undefined) request.gender = gender;
  if (is_pregnant !== undefined) request.is_pregnant = is_pregnant;
  if (case_type !== undefined) request.case_type = case_type;
  if (notes !== undefined) request.notes = notes;
  if (age !== undefined) request.age = age;

  // update photo if exists
  if (req.file) {
    request.photo = {
      url: `images/requests/${req.file.filename}`
    };
  }

  await request.save();

  res.status(200).json({
    status: 'success',
    message: 'تم التعديل بنجاح',
    data: request
  });
});

/**-----------------------------------------------------
 * @desc delete requests
 * @route DELETE /api/requestion
 * @access Private
/**-----------------------------------------------------*/
 module.exports.deleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  // check role
  if (role !== 'patient') {
    return res.status(403).json({
      status: 'error',
      message: 'انت مش مريض علشان تحذف الحالة'
    });
  }

  // find request
  const request = await TreatmentRequest.findById(req.params.id);

  // check if request exists
  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'الحالة غير موجودة'
    });
  }

// check ownership
if (request.user!= userId) {
  return res.status(403).json({
    status: 'error',
    message: 'هذه الحالة ليست لك'
  });
}

  // check status (optional but recommended)
  if (request.status !== 'pending') {
    return res.status(403).json({
      status: 'error',
      message: 'لا يمكن حذف الحالة بعد قبولها أو رفضها'
    });
  }

  // delete request
  await request.deleteOne();

  res.status(200).json({
    status: 'success',
    message: 'تم حذف الحالة بنجاح'
  });
});


/* **************************************************************************************************************
                                                      الروتات الخاصة بالطالب                                   
******************************************************************************************************************/
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

  const data = await TreatmentRequest.find({ status: 'pending' }).populate('case_type','course');

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
  const { date, hour, location } = req.body;
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

  const request = await TreatmentRequest.findById(id);
  if (!request) {
    return res.status(404).json({ status: 'error', message: 'الطلب غير موجود' });
  }

  if (request.status !== 'pending') {
    return res.status(409).json({ status: 'error', message: 'تم قبول هذه الحالة مسبقاً' });
  }

  // 3. التحقق من عدم وجود حالة مماثلة قيد التنفيذ
  const request_in_process = await InProcess.findOne({ 
    student: user.id, 
    case_type: request.case_type 
  });
console.log(` request in process .....${request_in_process}`)
const the_treatment = await Treatment.findById(request.case_type);

  if (request_in_process) {
    return res.status(403).json({
      status: 'error',
      message: `لديك حالة من نوع (${the_treatment.case_type}) قيد التنفيذ حالياً`
    });
  }

  // 4. التحقق من المشرف بناءً على فئة الطالب وهيكل الـ Map
  if (!the_treatment) {
    return res.status(404).json({ status: 'error', message: 'بيانات المعالجة غير موجودة' });
  }

  const the_course = await Course.findById(the_treatment.course);
  if (!the_course) {
    return res.status(404).json({ status: 'error', message: 'المادة المرتبطة بهذه الحالة غير موجودة' });
  }

  // جلب قائمة المشرفين (مع معالجة الـ Map أو الـ Object)
const category = student.category; 
const rawOverseers = (the_course.overseers instanceof Map) 
    ? the_course.overseers.get(category) 
    : the_course.overseers[category];

// التأكد من أن القائمة موجودة وهي مصفوفة
if (!rawOverseers || !Array.isArray(rawOverseers)) {
    return res.status(403).json({ 
        status: 'error', 
        message: `لا توجد قائمة مشرفين للمجموعة: ${category}` 
    });
}

// الحل: فلترة المصفوفة من أي قيم فارغة قبل المقارنة لتجنب خطأ toString()
const is_allowed = rawOverseers
    .filter(id => id != null) // استبعاد أي قيمة null أو undefined داخل المصفوفة
    .some(id => id.toString() === overseer.toString());

if (!is_allowed) {
    return res.status(403).json({
        status: 'error',
        message: 'المشرف المختار غير متاح لمجموعتك الدراسية'
    });
}

  // 5. تحديث حالة الطلب
  request.status = 'processing';
  await request.save();

  // 6. إرسال التنبيه عبر Socket
  const patientId = request.user.toString();
  const io = socket.getIO();
  if (io) {
    io.to(patientId).emit('requestAccepted', {
      message: `تم قبول حالتك من قبل الطالب ${student?.first_name || ''} ${student?.last_name || ''} يرجى الحضور الى العيادة ${location} في ${date}..${hour}`,
      date, hour, location
    });
  }
  // 7. إضافة السجل لجدول العمليات (InProcess)
  const in_process = new InProcess({
    patient: request.user,
    student: user.id,
    Requestion: request.id,
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


/**-----------------------------------------------------
 * @desc Show my procissing requests
 * @route GET /api/requestion/myProcissing
 * @access Private
 ------------------------------------------------------*/
 exports.getUserProcessingTreatmentRequests = asyncHandler(async (req, res) => {
  const user = req.user;

  const requests = await InProcess.find({ student: user.id}).populate('Requestion','pain_severity pain_time tooth_location gender is_pregnant age photo case_type more_details').exec();

  res.status(200).json({
    status: 'success',
    message: 'this is your procissing requests',
    data: requests
  });
});
