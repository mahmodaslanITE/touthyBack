const { TreatmentRequest, validateTreatmentRequest } = require('../models/Requisition');
const asyncHandler=require('express-async-handler')
/**
 -----------------------------------------------------------------------------
 * @desc add new requistion
 * @route api/requestion
 * @method POST
 * @access private
 -----------------------------------------------------------------------------*/
exports.createTreatmentRequest = async (req, res) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  const { error } = validateTreatmentRequest(req.body);
  if (error) {
    return res.status(400).json({ errors: error.details.map(d => d.message) });
  }

  try {
    const request = new TreatmentRequest({
      ...req.body,
      user: user.id // ربط الطلب بالمستخدم من التوكن
    });
    await request.save();
    res.status(201).json({status:'success',message:'creating request succecfuly',request});
  } catch (err) {
    res.status(500).json({ status:'error',message: err.message });
  }
};

/**-----------------------------------------------------------------------------
 * @desc show My requestions
 * @route api/requestion/my
 * @method get
 * @access private
 *------------------------------------------------------------------------------*/
exports.getUserTreatmentRequests = async (req, res) => {
  const user=req.user;
  const role=req.user.role
   try {
    const requests = await TreatmentRequest.find({ user: user.id });
    res.json({status:'succes',message:'this is your requests ',data:requests});
  } catch (err) {
    res.status(500).json({ status:'error',message: err.message });
  }
};

// جلب طلب واحد
exports.getTreatmentRequestById = async (req, res) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  try {
    const request = await TreatmentRequest.findOne({ _id: req.params.id, user: user.id });
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// تحديث طلب
exports.updateTreatmentRequest = async (req, res) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  const { error } = validateTreatmentRequest(req.body);
  if (error) {
    return res.status(400).json({ errors: error.details.map(d => d.message) });
  }

  try {
    const request = await TreatmentRequest.findOneAndUpdate(
      { _id: req.params.id, user: user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// حذف طلب
exports.deleteTreatmentRequest = async (req, res) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  try {
    const request = await TreatmentRequest.findOneAndDelete({ _id: req.params.id, user: user.id });
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    res.json({ message: 'تم حذف الطلب بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/**-----------------------------------------------------------------------------
 * @desc show all requestion
 * @route api/requestion
 * @method get
 * @access private
 *-----------------------------------------------------------------------------*/
module.exports.showAllRequesyions=asyncHandler(async(req,res)=>{
const  userId=req.user.id;
const role=req.user.role;
if(!userId){
  return res.status(403).json({status:'error',message:'you have to login if you would show requests'})
}
if(role==='patient'){
  return res.status(403).json({status:'error',message:'because of patients privacy you are not allowed to see requests'})
}
 const data=await TreatmentRequest.find();
res.status(200).json({status:'succes',message:'this is all requests',data})

})
const socket = require('../socket/init');
const { DentistProfile } = require('../models/DentistProfile');

module.exports.acceptRequest = asyncHandler(async (req, res) => {
const user=req.user;
const student=await DentistProfile.findOne({user:user.id});
const role=req.user.role;
const {date,hour,location}=req.body;
if(!user){
  return res.status(717).json({status:'error',message:'you have to login '})
}

if(role!='student'){
  return res.status(717).json({status:'error',message:'you are not allowed!!! ...only students '})
}
const request= await TreatmentRequest.findById(req.params.id);
if(request.status!='pending'){
  return res.status(717).json({status:'error',message:'there is another student accepted this case good luck '})
}
const patientId=request.user.toString();
  const io = socket.getIO();

  io.to(patientId).emit('requestAccepted', {
    message:`تم قبول حالتك من قبل الطالب ${student.first_name} ${student.last_name} يرجى الحضور الى العيادة ${location} في ${date}..${hour}`,
    date,hour,location
  });

  return res.status(200).json({
    status: 'success',
    message: 'request accepted and patient notified'
  });
});
