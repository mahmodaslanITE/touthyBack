const express=require('express');
const { createRegisterUser, loginUser, change_password } = require('../controllers/authController');
const { uploadVerifyRequestPhoto } = require('../Middlewares/upload');
const { addVerifyRequest } = require('../controllers/studentController');
const verifyToken = require('../Middlewares/verifyToken');
const router=express.Router();

router.post('/register',createRegisterUser);
router.post('/login',loginUser);
router.post('/change_password',verifyToken,change_password);
router.post('/verify',verifyToken,uploadVerifyRequestPhoto.single('document'),addVerifyRequest);
module.exports=router;