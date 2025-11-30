const asyncHandler = require('express-async-handler');
const { DentistProfile } = require('../models/DentistProfile');
const SickProfile = require('../models/SickProfile');
const path=require('path');
const { cloudenaryUplodeImage, cloudenaryRemoveImage } = require('../utils/cloudinary');
  /**-----------------------------------------------------
 * @desc Get user profile (dentist or sick)
 * @route  /api/profile
 * @access Private
 ------------------------------------------------------*/
 module.exports.showUserProfile=asyncHandler(async(req,res)=>{
  const userId=req.user.id;
  const userRole = req.user.role;

  let profile
  if (userRole === 'student') {
    profile = await DentistProfile.findOne({ user: userId });
  } else if (userRole === 'patient') {
    profile = await SickProfile.findOne({ user: userId });
  } else {
    return res.status(400).json({ message: 'نوع المستخدم غير صالح' });
  }
  const data=profile;
  res.status(200).json({message:'this is your profile',data:data})

 })
  /**-----------------------------------------------------
 * @desc Get all profile (dentist or sick)
 * @route  /api/profile/all
 * @access Private
 ------------------------------------------------------*/
 module.exports.getAllProfile=asyncHandler(async(req,res)=>{
 })
  /**-----------------------------------------------------
 * @desc Update user profile (dentist or sick)
 * @route PUT /api/profile
 * @access Private
 ------------------------------------------------------*/
module.exports.updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  const { first_name, last_name, university_number, bio } = req.body;

  let profile;

  if (userRole === 'student') {
    profile = await DentistProfile.findOne({ user: userId });
  } else if (userRole === 'patient') {
    profile = await SickProfile.findOne({ user: userId });
  } else {
    return res.status(400).json({ message: 'نوع المستخدم غير صالح' });
  }
  console.log("user id",userId)

  if (!profile) {
    return res.status(404).json({ message: 'الملف الشخصي غير موجود' });
  }

  // تحديث البيانات
  if (first_name) profile.first_name = first_name;
  if (last_name) profile.last_name = last_name;
  if (university_number) profile.university_number = university_number;
  if (bio) profile.bio = bio;

  await profile.save();

  const { _id, user, createdAt, updatedAt, __v, ...profileData } = profile._doc;

  res.status(200).json({
    status:"succes",
    message: 'تم تحديث الملف الشخصي بنجاح',
    data: profileData,
  });
});

/**-----------------------------------------------------
 * @desc Update profile photo (dentist or sick)
 * @route PUT /api/profile/photo
 * @access Private
 ------------------------------------------------------*/
 module.exports.updateProfilePhoto = asyncHandler(async (req, res) => {
  console.log("📂 Received file:", req.file);
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  //get the path of image
  const imagepath=path.join(__dirname,`../images/${req.file.filename}`)

  //uplode to cloudinary
  const result=await cloudenaryUplodeImage(imagepath);
  console.log(" upload photo to cludinary",result);
  //get user 
  let profile;
if (req.user.role === 'patient') {
  profile = await SickProfile.findOne({ user: req.user.id });
} else {
  profile = await DentistProfile.findOne({ user: req.user.id });
}

  //delete the old profile photo
  if(profile.profile_photo?.default?.publicId){
    await cloudenaryRemoveImage(profile.profile_photo.default.publicId)
  }
  //change the profile photo in the DB
  profile.profile_photo= {
    type: Object,
    default: {
      publicId: result.public_id,
      url: result.secure_url
    }
  } 
  await profile.save();
  // send response to cleint 
  res.status(200).json({
    message: "✅ File uploaded successfully",
    profile_photo:{
      publicId: result.public_id,
      url: result.secure_url
    }
  });
});


