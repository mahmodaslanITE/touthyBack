const { TreatmentRequest, validateTreatmentRequest, validateUpdateRequest } = require('../models/Requisition');
const asyncHandler = require('express-async-handler');
const socket = require('../socket/init');

// الموديل بالاسم الجديد
const Student_profile = require('../models/Student_profile');

/**-----------------------------------------------------
 * @desc Create treatment request
 * @route POST /api/requestion
 * @access Private
 ------------------------------------------------------*/
exports.createTreatmentRequest = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'توكن غير صالح أو غير موجود'
    });
  }

  const { error } = validateTreatmentRequest(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details.map(d => d.message).join(', ')
    });
  }
if(user.role!='patient'){
  return res.status(403).json({
    status:'error',
    message:'you are not allowed only patients'
  })
}
  let photoData=null

  if (req.file) {
    photoData = {
      publicId: null,
      url: `images/requests/${req.file.filename}`
    };
  }

  const request = new TreatmentRequest({
    ...req.body,
    user: user.id,
    photo: photoData
  });

  await request.save();

  res.status(201).json({
    status: 'success',
    message: 'تم إنشاء الطلب بنجاح',
    data: request
  });
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

/*
 * @desc Show all requests
 * @route GET /api/requestion
 * @access Private
 ------------------------------------------------------*/
module.exports.showAllRequesyions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;n

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

  const data = await TreatmentRequest.find();

  res.status(200).json({
    status: 'success',
    message: 'this is all requests',
    data
  });
});

/**-----------------------------------------------------
 * @desc Accept request
 * @route post /api/requestion/:id/accept
 * @access Private (student)
 ------------------------------------------------------*/
module.exports.acceptRequest = asyncHandler(async (req, res) => {
  const user = req.user;
  const role = req.user.role;
  const { date, hour, location } = req.body;

  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'you have to login'
    });
  }

  if (role !== 'student') {
    return res.status(403).json({
      status: 'error',
      message: 'you are not allowed... only students'
    });
  }

  const student = await Student_profile.findOne({ user: user.id });
  const request = await TreatmentRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'request not found'
    });
  }

  if (request.status !== 'pending') {
    return res.status(409).json({
      status: 'error',
      message: 'there is another student accepted this case'
    });
  }
request.status='processing';
await request.save();
  const patientId = request.user.toString();
  const io = socket.getIO();

  io.to(patientId).emit('requestAccepted', {
    message: `تم قبول حالتك من قبل الطالب ${student.first_name} ${student.last_name} يرجى الحضور الى العيادة ${location} في ${date}..${hour}`,
    date,
    hour,
    location
  });

  res.status(200).json({
    status: 'success',
    message: 'request accepted and patient notified'
  });
});
