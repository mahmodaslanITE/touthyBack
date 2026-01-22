const { TreatmentRequest, validateTreatmentRequest } = require('../models/Requisition');
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
  let photoData = {
    publicId: null,
    url: 'https://www.bing.com/th/id/OIP.PKlD9uuBX0m4S8cViqXZHAHaHa?w=195&h=211&c=8&rs=1&qlt=90&o=6&cb=12&pid=3.1&rm=2'
  };

  if (req.file) {
    photoData = {
      publicId: null,
      url: `/images/requests/${req.file.filename}`
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

/**-----------------------------------------------------
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
