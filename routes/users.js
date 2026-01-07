const express = require('express');
const router = express.Router();
const upload = require('../Middlewares/upload');
const verifyToken = require('../Middlewares/verifyToken');
const { updateProfilePhoto, updateUserProfile, showUserProfile } = require('../controllers/usercontroller');

// update profile photo
router.put('/photo', verifyToken, upload.single('file'),updateProfilePhoto);

// update user profile
router.put('/', verifyToken,updateUserProfile);

//show User Profile
router.get('/',verifyToken,showUserProfile)

module.exports = router;
