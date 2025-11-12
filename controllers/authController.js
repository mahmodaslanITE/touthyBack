const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { validateUserRegister, validateUserLogin, User } = require('../models/User');
const { DentistProfile } = require('../models/DentistProfile');
const SickProfile = require('../models/SickProfile');

/**-----------------------------------------------------
 * @desc Register new user (JSON)
 * @route POST /api/auth/register
 * @access Public
 ------------------------------------------------------*/
module.exports.createRegisterUser = asyncHandler(async (req, res) => {
  const { error } = validateUserRegister(req.body);
  if (error) {
    return res.status(400).json({ status:"error",message: error.details.map(e => e.message).join(', ') });
  }

  const { email, password, first_name, last_name, role, university_number } = req.body;

  // Prevent duplicate emails
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({status:"error",message: 'This email is already registered' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const newUser = new User({
    email,
    password: hashedPassword,
    role
  });

  await newUser.save();

  // Create corresponding profile and link user
  let profile;
  if (role === 'dentist') {
    profile = new DentistProfile({
      first_name,
      last_name,
      university_number,
      user: newUser._id
    });
    await profile.save();
  } else {
    profile = new SickProfile({
      first_name,
      last_name,
      university_number,
      user: newUser._id
    });
    await profile.save();
  }


  // Clean response
  const { _id, user, createdAt, updatedAt, __v, ...profileData } = profile._doc;

  const userData = {
    _id: newUser._id,
    email: newUser.email,
    role: newUser.role
    , profileData
  };

  res.status(201).json({
    status:"success",
    message: 'User registered successfully',
    data:userData ,
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
    return res.status(400).json({ message: error.details.map(e => e.message).join(', ') });
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ status:"error",message: 'Invalid email or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({status:"error", message: 'Invalid email or password' });
  }

  // Fetch profile based on user role
  let profile;
  if (user.role === 'dentist') {
    profile = await DentistProfile.findOne({ user: user._id });
  } else {
    profile = await SickProfile.findOne({ user: user._id });
  }

  const token = user.generateToken();

  if (profile) {
    const { _id, user: userRef, createdAt, updatedAt, __v, ...rest } = profile._doc;
    profileData = rest;
  }
  
  
  const userData = {
    _id: user._id,
    email: user.email,
    role: user.role
    , profileData
  };

  res.status(200).json({
    status:"success",
    message: 'Login successful',
    data:userData,
    token
  });
});
