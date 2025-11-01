const express = require('express');
const router = express.Router();
const { getUserProfile } = require('../controllers/usercontroller');
const verifyToken = require('../Middlewares/verifyToken');

// git there profile himself 
router.get('/profile',verifyToken ,getUserProfile);
module.exports=router

//