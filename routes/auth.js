const express=require('express');
const { createRegisterUser, loginUser, changePassword, logout } = require('../controllers/authController');
const { uploadVerifyRequestPhoto } = require('../Middlewares/upload');
const { addVerifyRequest } = require('../controllers/studentController');
const verifyToken = require('../Middlewares/verifyToken');
const router=express.Router();

router.post('/register',createRegisterUser);
router.post('/change-password',verifyToken,changePassword);
router.post('/login',loginUser);
router.post('/logout',verifyToken,logout);
router.post('/verify',verifyToken,uploadVerifyRequestPhoto.single('document'),addVerifyRequest);
module.exports=router;