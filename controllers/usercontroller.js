const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require("fs");
const {User}=require("../models/User")
const Student_profile = require('../models/Student_profile');
const Patient_profile = require('../models/Patient_profile');
const { profile, error } = require('console');
const { date } = require('joi');
const { OverseerProfile } = require('../models/Overseer_profile');
const Patient_profil = require('../models/Patient_profile');
const { param } = require('../routes/requestions');
const getUserProfile = require('../functions/users');
const Finished = require('../models/Finished');
const InProcess = require('../models/InProcess');

/**-----------------------------------------------------
 * @desc Get user profile (student or patient)
 * @route  /api/profile
 * @access Private
 ------------------------------------------------------*/
module.exports.showUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role; 

  let profile;

  if (userRole === 'student') {
    profile = await Student_profile.findOne({ user: userId });
  } else if (userRole === 'patient') {
    profile = await Patient_profile.findOne({ user: userId });
  } 
   else if (userRole === 'overseer') {
    profile = await OverseerProfile.findOne({ user: userId });
  } 
  else {
    return res.status(400).json({
      status: "error",
      message: 'نوع المستخدم غير صالح'
    });
  }

  res.status(200).json({
    status: "success",
    message: 'this is your profile',
    data: profile
  });
});

/**-----------------------------------------------------
 * @desc Get all profiles
 * @route  /api/profile/all
 * @access Private
 ------------------------------------------------------*/
module.exports.getAllProfile = asyncHandler(async (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "Not implemented yet"
  });
});

/**-----------------------------------------------------
 * @desc Get any profiles
 * @route  /api/profile/:id
 * @access Private
 ------------------------------------------------------*/
module.exports.getProfile = asyncHandler(async (req, res) => {
  // 1. التأكد من أن المستخدم مسجل دخول (يأتي من middleware التحقق)
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'يجب تسجيل الدخول أولاً' });
  }
const the_user=await User.findById(req.params.id)
const user_role=the_user.role;
let profile=await getUserProfile(req.params.id,user_role);
  // 3. التأكد من وجود البروفايل في قاعدة البيانات
  if (!profile) {
    return res.status(404).json({ status: 'error', message: 'هذا الحساب غير موجود' });
  }
  let finishds=[]
  let processes=[]
  if(user_role=='student'){
 finishds=await Finished.find({student:req.params.id});
processes=await InProcess.find({student:req.params.id})
  } 
  else if(user_role=='overseer'){
    finishds=await Finished.find({overseer:req.params.id})
    processes=await InProcess.find({overseer:req.params.id})

  }
const formate={
  user:profile.user,
  first_name:profile.first_name,
  father_name:profile.father_name,
  last_name:profile.last_name,
  bio:profile.bio,
  profile_photo:profile.profile_photo,
  gender:profile.gender,
  role:user_role,
  category:profile.category,
  university_number:profile.university_number,
  age:profile.age,
  is_verified:profile.is_verified,
  count_cases_finishds:finishds.length,
  count_cases_in_process:processes.length,
  
}
  // 5. إرسال الرد الناجح
  res.status(200).json({ 
    status: 'success', 
    message: 'تم جلب البيانات بنجاح', 
    data:formate// تأكد من كتابتها data وليس date
  });
});


/**-----------------------------------------------------
 * @desc Update user profile (student or patient)
 * @route PUT /api/profile
 * @access Private
 ------------------------------------------------------*/
module.exports.updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  const { first_name, last_name,father_name, university_number, bio ,category} = req.body;

  let profile;

  if (userRole === 'student') {
    profile = await Student_profile.findOne({ user: userId });
  } else if (userRole === 'patient') {
    profile = await Patient_profile.findOne({ user: userId });
  } 
  else if(userRole==='overseer'){
    profile=await OverseerProfile.findOne({user:userId})
  }
  else {
    return res.status(400).json({
      status: "error",
      message: 'نوع المستخدم غير صالح'
    });
  }

  if (!profile) {
    return res.status(404).json({
      status: "error",
      message: 'الملف الشخصي غير موجود'
    });
  }

  if (first_name) profile.first_name = first_name;
  if (father_name) profile.father_name = father_name;
  if (last_name) profile.last_name = last_name;
  if (university_number) profile.university_number = university_number;
  if (bio) profile.bio = bio;
  if(category) profile.category=category

  await profile.save();

  const { _id, user, createdAt, updatedAt, __v, ...profileData } = profile._doc;

  res.status(200).json({
    status: "success",
    message: 'تم تحديث الملف الشخصي بنجاح',
    data: profileData,
  });
});

/**-----------------------------------------------------
 * @desc Update profile photo (student or patient)
 * @route PUT /api/profile/photo
 * @access Private
 ------------------------------------------------------*/
module.exports.updateProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: "error",
      message: "No file uploaded"
    });
  }

  let profile;

  if (req.user.role === "patient") {
    profile = await Patient_profile.findOne({ user: req.user.id });
  } else if (req.user.role === "student") {
    profile = await Student_profile.findOne({ user: req.user.id });
  } 
  else if(req.user.role==='overseer'){
    profile=await OverseerProfile.findOne({user:req.user.id})
  }
  else {
    return res.status(400).json({
      status: "error",
      message: 'نوع المستخدم غير صالح'
    });
  }

  if (!profile) {
    return res.status(404).json({
      status: "error",
      message: 'الملف الشخصي غير موجود'
    });
  }

  if (profile.profile_photo?.url) {
    const oldImagePath = path.join(
      __dirname,
      `../images/profile/${path.basename(profile.profile_photo.url)}`
    );
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  profile.profile_photo = {
    url: `images/profile/${req.file.filename}`
  };

  await profile.save();

  res.status(200).json({
    status: "success",
    message: "File uploaded successfully",
    profile_photo: {
      url: `/images/profile/${req.file.filename}`
    }
  });
});
