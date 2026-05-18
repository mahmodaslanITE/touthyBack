const { Pending_request,  validateUpdateRequest, validateTreatmentRequest } = require('../models/Pending');
const asyncHandler = require('express-async-handler');
// الموديل بالاسم الجديد
const Treatment = require('../models/Treatment');
const InProcess = require('../models/InProcess');

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

// التأكد من ان البيانات منطقية 
if(req.body.gender==='male'&&req.body.is_pregnant==='true'){ return res.status(707).json({
  status:'error',
  message :'ذكر وحامل يا خرا       ما تستحي على وجهك'
})}
  // 5. الحفظ في قاعدة البيانات
  const request = new Pending_request({
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

  const requests = await Pending_request.find({ user: user.id }).populate({
    path: 'case_type',
    select: '_id case_type',
  });

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
  const isAdmin=req.user.isAdmin

  // check role
  if (role !== 'patient' &&!isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'انت مش مريض علشان تعدل الحالة'
    });
  }

  // find request
  const request = await Pending_request.findById(req.params.id);

  // check if request exists
  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'الحالة غير موجودة'
    });
  }

  // check ownership
  if (request.user!= userId && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'هذه الحالة ليست لك'
    });
  }

  

  // validate body
  // const { error } = validateUpdateRequest(req.body);
  // if (error) {
  //   return res.status(400).json({
  //     status: 'error',
  //     message: error.details[0].message
  //   });
  // }

  // update fields
  const {
    pain_severity,
    pain_time,
    tooth_location,
    gender,
    is_pregnant,
    case_type,
    notes,
    age,
    more_details
  } = req.body
 // 3. تحويل moreDetails من String إلى JSON Object

  if (pain_severity !== undefined) request.pain_severity = pain_severity;
  if (pain_time !== undefined) request.pain_time = pain_time;
  if (tooth_location !== undefined) request.tooth_location = tooth_location;
  if (gender !== undefined) request.gender = gender;
  if (is_pregnant !== undefined) request.is_pregnant = is_pregnant;
  if (case_type !== undefined) request.case_type = case_type;
  if (notes !== undefined) request.notes = notes;
  if (age !== undefined) request.age = age;
  if(more_details !== undefined ){ let more_detailsData = req.body.more_details;
    if (typeof req.body.more_details === 'string') {
      try {
        more_detailsData = JSON.parse(req.body.more_details);
      } catch (e) {
        return res.status(400).json({ status: 'error', message: 'حقل moreDetails ليس بتنسيق JSON صحيح' });
      }
    }request.more_details= more_detailsData;}

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
  const isAdmin=req.user.isAdmin

  // check role
  if (role !== 'patient' && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'انت مش مريض علشان تحذف الحالة'
    });
  }

  // find request
  const request = await Pending_request.findById(req.params.id);

  // check if request exists
  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'الحالة غير موجودة'
    });
  }

// check ownership
if (request.user!= userId && !isAdmin) {
  return res.status(403).json({
    status: 'error',
    message: 'هذه الحالة ليست لك'
  });
}

  // delete request
  await request.deleteOne();

  res.status(200).json({
    status: 'success',
    message: 'تم حذف الحالة بنجاح'
  });
});

 /**
   * @desc get user proceccing request
   * @route api/requests/proccissing
   */
exports.getUserProcessingTreatmentRequests = asyncHandler(async (req, res) => {
  const user = req.user;
  const role =user.role;
  const isAdmin=user.isAdmin
  let requests;
  if(isAdmin){
    requests = await InProcess.find()
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
    .populate({
      path: 'student',
      model: 'Student_profile',
      foreignField: 'user',
      localField: 'student',
      select: '-_id first_name father_name last_name'
  })
    .lean();
  }
  else if(role=='student'){
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
      .select('-patient -__v')
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
