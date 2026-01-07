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
    status:"success",
    message: 'تم تحديث الملف الشخصي بنجاح',
    data: profileData,
  });
});

/**-----------------------------------------------------
 * @desc Update profile photo (dentist or sick)
 * @route PUT /api/profile/photo
 * @access Private
 ------------------------------------------------------*/
const fs = require("fs");

module.exports.updateProfilePhoto = asyncHandler(async (req, res) => {
  console.log("📂 Received file:", req.file);
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // المسار المحلي للصورة
  const imagePath = path.join(__dirname, `../images/${req.file.filename}`);

  // الحصول على البروفايل حسب نوع المستخدم
  let profile;
  if (req.user.role === "patient") {
    profile = await SickProfile.findOne({ user: req.user.id });
  } else {
    profile = await DentistProfile.findOne({ user: req.user.id });
  }

  // حذف الصورة القديمة من السيرفر إذا كانت موجودة
  if (profile.profile_photo?.url) {
    const oldImagePath = path.join(__dirname, `../images/${path.basename(profile.profile_photo.url)}`);
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  // تحديث الصورة الجديدة في قاعدة البيانات
  profile.profile_photo = {
    url: `/images/${req.file.filename}` // رابط نسبي يمكن استخدامه في الواجهة الأمامية
  };

  await profile.save();

  // إرسال الرد للعميل
  res.status(200).json({
    message: "✅ File uploaded successfully",
    profile_photo: {
      url: `/images/${req.file.filename}`
    }
  });
});
