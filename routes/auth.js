const express=require('express');
const { createRegisterUser, loginUser } = require('../controllers/authController');
const { uploadVerifyRequestPhoto } = require('../Middlewares/upload');
const { addVerifyRequest } = require('../controllers/studentController');
const verifyToken = require('../Middlewares/verifyToken');
const router=express.Router();

router.post('/register',createRegisterUser);
router.post('/login',loginUser);
router.post('/verify',verifyToken,uploadVerifyRequestPhoto.single('document'),addVerifyRequest);
module.exports=router;