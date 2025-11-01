const express=require('express');
const { createRegisterUser, loginUser } = require('../controllers/authController');
const router=express.Router();

router.post('/register',createRegisterUser);
router.post('/login',loginUser);
module.exports=router;