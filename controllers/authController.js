const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { validateUserRegister, validateUserLogin, User } = require('../models/User');

// الموديلات بالأسماء الجديدة
const Student_profile = require('../models/Student_profile');
const Patient_profile = require('../models/Patient_profile');

/**-----------------------------------------------------
 * @desc Register new user (JSON)
 * @route POST /api/auth/register
 * @access Public
 ------------------------------------------------------*/
module.exports.createRegisterUser = asyncHandler(async (req, res) => {
  const { error } = validateUserRegister(req.body);
  if (error) {
    return res.status(400).json({
      status: "error",
      message: error.details.map(e => e.message).join(', ')
    });
  }

  const { email, password, first_name, last_name, role, university_number } = req.body;

  // منع تكرار الإيميل
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      status: "error",
      message: 'This email is already registered'
    });
  }

  // تشفير كلمة المرور
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // إنشاء المستخدم
  const newUser = new User({
    email,
    password: hashedPassword,
    role
  });

  await newUser.save();

  // إنشاء البروفايل حسب الدور
  let profile;
  if (role === 'student') {
    profile = new Student_profile({
      first_name,
      last_name,
      university_number,
      user: newUser._id
    });
  } else if (role === 'patient') {
    profile = new Patient_profile({
      first_name,
      last_name,
      university_number,
      user: newUser._id
    });
  } else {
    return res.status(400).json({
      status: "error",
      message: "نوع المستخدم غير صالح"
    });
  }

  await profile.save();

  const { _id, user, createdAt, updatedAt, __v, ...profileData } = profile._doc;

  const userData = {
    _id: newUser._id,
    email: newUser.email,
    role: newUser.role,
    profileData
  };

  res.status(201).json({
    status: "success",
    message: 'User registered successfully',
    data: userData
  });
});

/**-----------------------------------------------------
 * @desc Login user (JSON)
 * @route POST /api/auth/login
 * @access Public
 ------------------------------------------------------*/
module.exports.loginUser = asyncHandler(async (req, res) => {
  const { error } = validateUserLogin(req.body);
  if (error) {
    return res.status(400).json({
      status: "error",
      message: error.details.map(e => e.message).join(', ')
    });
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: 'Invalid email or password'
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({
      status: "error",
      message: 'Invalid email or password'
    });
  }

  // جلب البروفايل حسب الدور
  let profile;
  if (user.role === 'student') {
    profile = await Student_profile.findOne({ user: user._id });
  } else if (user.role === 'patient') {
    profile = await Patient_profile.findOne({ user: user._id });
  }

  const token = user.generateToken();

  let profileData = null;
  if (profile) {
    const { _id, user: userRef, createdAt, updatedAt, __v, ...rest } = profile._doc;
    profileData = rest;
  }

  const userData = user.isAdmin
    ? {
        _id: user._id,
        email: user.email,
        role: user.role,
        is_admin: true,
        profileData
      }
    : {
        _id: user._id,
        email: user.email,
        role: user.role,
        profileData
      };

  res.status(200).json({
    status: "success",
    message: 'Login successful',
    data: userData,
    token
  });
});
