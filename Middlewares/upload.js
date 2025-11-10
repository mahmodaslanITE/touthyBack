const multer = require('multer');
const path = require('path');

// تخزين الصور في مجلد /images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../images'));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s/g, '');
        cb(null, uniqueName);
    }
});

// فلتر للتحقق من نوع الملف
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('File type not supported'), false);
    }
};

// إعداد Multer
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // حد 5 ميجا
});

module.exports = upload;
