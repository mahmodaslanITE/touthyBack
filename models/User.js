const Joi = require('joi');
const mongoose = require('mongoose');
const jwt=require('jsonwebtoken')

// User Schema
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Prevent duplicates
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['dentist', 'sick'],
    default: 'sick'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
 
}, { timestamps: true }); // Automatically adds createdAt and updatedAt
// 🔐 Generate JWT Token
UserSchema.methods.generateToken = function () {
  return jwt.sign(
    {
      id: this._id,
      username:this.username,
      role: this.role,
      isAdmin: this.isAdmin
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Token valid for 7 days
  );
};
// Validation for registration
const validateUserRegister = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    firstname: Joi.string().min(6).required(),
    lastname: Joi.string().min(6).required(),
    universitynumber: Joi.string().when('role', {
      is: 'dentist',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('dentist', 'sick').required(),
    bio: Joi.string().max(500),
    isAdmin: Joi.boolean()
  }).options({ abortEarly: false });

  return schema.validate(data);
};


// Validation for login
const validateUserLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }).options({ abortEarly: false });

  return schema.validate(data);
};

const User = mongoose.model('User', UserSchema);

module.exports = {
  User,
  validateUserRegister,
  validateUserLogin
};
