const express = require('express');
const router = express.Router();
const upload = require('../Middlewares/upload');
const verifyToken = require('../Middlewares/verifyToken');
const { updateProfilePhoto, updateUserProfile, showUserProfile } = require('../controllers/usercontroller');
//update user profile
// router.put('/',verifyToken,updat)
// Controller مؤقت لرفع الصورة
router.put('/photo', verifyToken, upload.single('file'),updateProfilePhoto);
router.put('/', verifyToken, upload.single('file'),updateUserProfile);

//show User Profile
router.get('/',verifyToken,showUserProfile)

module.exports = router;
