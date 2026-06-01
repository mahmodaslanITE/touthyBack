const multer = require('multer');
const path = require('path');
const fs = require('fs');

const postsDir = path.join(__dirname, '../images/posts');
if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, postsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
        // قائمة الامتدادات المسموحة
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const ext = path.extname(file.originalname).toLowerCase();
       
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('只支持图片格式: jpg, jpeg, png, gif, webp, bmp'), false);
        }
    };

// ✅ زيادة عدد الصور المسموحة إلى 10
const uploadPostImages = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 10 صور كحد أقصى
    fileFilter: fileFilter
});

module.exports = uploadPostImages;