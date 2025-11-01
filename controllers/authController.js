const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { validateUserRegister, validateUserLogin, User } = require('../models/User');

/**-----------------------------------------------------
 * @desc Register new user (JSON)
 * @route POST /api/auth/register
 * @access Public
 ------------------------------------------------------*/
module.exports.createRegisterUser = asyncHandler(async (req, res) => {
  const { error } = validateUserRegister(req.body);
  if (error) {
    return res.status(400).json({ message: error.details.map(e => e.message).join(', ') });
  }

  const { email, password, username, role, bio, isAdmin, profile_photo } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'This email is already registered' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    email,
    password: hashedPassword,
    username,
    role,
    bio,
    isAdmin: isAdmin || false,
    profile_photo: {
      url: profile_photo?.url || 'https://www.bing.com/th/id/OIP.PKlD9uuBX0m4S8cViqXZHAHaHa?w=195&h=211&c=8&rs=1&qlt=90&o=6&cb=12&pid=3.1&rm=2',
      publicId: profile_photo?.publicId || null
    }
  });

  const result = await newUser.save();
  const { password: _, ...userData } = result._doc;
  res.status(201).json({ message: 'User registered successfully', data: userData });
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
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  const { password: _, ...userData } = user._doc;
  const token = user.generateToken();
  res.status(200).json({ message: 'Login successful', data: userData,token });
});
