const express = require('express');
const router = express.Router();
const upload = require('../Middlewares/upload');
const verifyToken = require('../Middlewares/verifyToken');
//update user profile
// router.put('/',verifyToken,updat)
// Controller مؤقت لرفع الصورة
router.put('/photo', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('Uploaded file:', req.file);
    res.status(200).json({
        message: 'File uploaded successfully',
        file: req.file.filename
    });
});

module.exports = router;
