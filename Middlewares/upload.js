const multer = require('multer');
const path = require('path');

// تخزين الصور في مجلد /images
const storageProfile = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../images/profile'));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s/g, '');
        cb(null, uniqueName);
    }
});
const storageRequest = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../images/requests'));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s/g, '');
        cb(null, uniqueName);
    }
});

// فلتر للتحقق من نوع الملف
const fileFilter = (req, file, cb) => {
    const allowedExtensions=['.jpg','.jpeg','.png','.gif','webp','bmp'];
    const extentions=file.originalname.toLowerCase().match(/\.[0-9a-z]+$/)?.[0] || '';
    if (allowedExtensions.includes(extentions)) {
        cb(null, true);
    } else {
        cb(new Error('File type not supported'), false);
    }
};

// multer to upload profile photo
const uploadProfilePhoto = multer({
    storage:storageProfile,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // حد 5 ميجا
});

// multer to upload request photo

const uploadRequestPhoto = multer({
    storage:storageRequest,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // حد 5 ميجا
});

module.exports = {uploadProfilePhoto,uploadRequestPhoto};
