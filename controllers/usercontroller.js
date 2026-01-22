const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require("fs");

const Student_profile = require('../models/Student_profile');
const Patient_profile = require('../models/Patient_profile');

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
  } else {
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
 * @desc Update user profile (student or patient)
 * @route PUT /api/profile
 * @access Private
 ------------------------------------------------------*/
module.exports.updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  const { first_name, last_name, university_number, bio } = req.body;

  let profile;

  if (userRole === 'student') {
    profile = await Student_profile.findOne({ user: userId });
  } else if (userRole === 'patient') {
    profile = await Patient_profile.findOne({ user: userId });
  } else {
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
  if (last_name) profile.last_name = last_name;
  if (university_number) profile.university_number = university_number;
  if (bio) profile.bio = bio;

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
  } else {
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
