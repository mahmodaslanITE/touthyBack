// ml-treatment/routes/treatmentRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../../Middlewares/verifyToken');
const BrainService = require('../services/brainService');
const TreatmentDataService = require('../services/dataService');

// ============================================================
// 📁 إعداد Multer لاستقبال الصور
// ============================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ============================================================
// 🔮 التنبؤ بنوع المعالجة (نص فقط)
// ============================================================

router.post('/predict', verifyToken, async (req, res) => {
    try {
        const { age, gender, pain_severity, pain_time, tooth_location, 
                is_pregnant, previous_treatment, takes_medication, medication_type } = req.body;

        if (!age || !gender || !pain_severity || !pain_time || !tooth_location) {
            return res.status(400).json({
                status: 'error',
                message: 'الرجاء إدخال جميع البيانات المطلوبة'
            });
        }

        if (!BrainService.isTrained) {
            const loaded = BrainService.loadModel();
            if (!loaded) {
                return res.status(500).json({
                    status: 'error',
                    message: 'النموذج غير مدرب. يرجى تشغيل التدريب أولاً.'
                });
            }
        }

        const features = [
            parseFloat(age) || 25,
            gender === 'female' ? 0 : 1,
            parseFloat(pain_severity) || 5,
            parseFloat(pain_time) || 3,
            parseFloat(tooth_location) || 20,
            is_pregnant ? 1 : 0,
            previous_treatment ? 1 : 0,
            takes_medication ? 1 : 0,
            parseFloat(medication_type) || 0
        ];

        const result = BrainService.predict(features);

        const Treatment = require('../../models/Treatment');
        let treatmentName = null;
        if (result.case_type && result.case_type !== 'unknown') {
            const treatment = await Treatment.findById(result.case_type);
            if (treatment) treatmentName = treatment.case_type;
        }

        res.status(200).json({
            status: 'success',
            message: 'تم التنبؤ بنوع المعالجة بنجاح',
            data: {
                case_type_id: result.case_type,
                case_type_name: treatmentName || 'غير معروف',
                probability: (result.probability * 100).toFixed(2) + '%',
                image_used: false,
                all_probabilities: result.all_probabilities.map(p => (p * 100).toFixed(2) + '%')
            }
        });

    } catch (error) {
        console.error('❌ Prediction error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'حدث خطأ أثناء التنبؤ: ' + error.message
        });
    }
});

// ============================================================
// 🖼️ التنبؤ مع صورة (ملتيبارت)
// ============================================================

router.post('/predict-with-image', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { age, gender, pain_severity, pain_time, tooth_location, 
                is_pregnant, previous_treatment, takes_medication, medication_type } = req.body;

        // التحقق من البيانات المطلوبة
        if (!age || !gender || !pain_severity || !pain_time || !tooth_location) {
            // حذف الملف المؤقت إذا وجد
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                status: 'error',
                message: 'الرجاء إدخال جميع البيانات المطلوبة'
            });
        }

        // تحميل النموذج
        if (!BrainService.isTrained) {
            const loaded = BrainService.loadModel();
            if (!loaded) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(500).json({
                    status: 'error',
                    message: 'النموذج غير مدرب. يرجى تشغيل التدريب أولاً.'
                });
            }
        }

        // تجهيز الميزات النصية
        const features = [
            parseFloat(age) || 25,
            gender === 'female' ? 0 : 1,
            parseFloat(pain_severity) || 5,
            parseFloat(pain_time) || 3,
            parseFloat(tooth_location) || 20,
            is_pregnant ? 1 : 0,
            previous_treatment ? 1 : 0,
            takes_medication ? 1 : 0,
            parseFloat(medication_type) || 0
        ];

        // معالجة الصورة (إذا وجدت)
        let imageFeatures = null;
        if (req.file) {
            try {
                const imageBuffer = await sharp(req.file.path)
                    .resize(32, 32, { fit: 'cover' })
                    .normalize()
                    .toBuffer();
                
                // اختزال ميزات الصورة
                imageFeatures = Array.from(imageBuffer).slice(0, 100);
                
                // حذف الملف المؤقت
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                
                console.log(`✅ Image processed: ${imageFeatures.length} features`);
            } catch (error) {
                console.error('❌ Image processing error:', error.message);
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            }
        }

        // التنبؤ
        const result = BrainService.predict(features, imageFeatures);

        // جلب اسم المعالجة
        const Treatment = require('../../models/Treatment');
        let treatmentName = null;
        if (result.case_type && result.case_type !== 'unknown') {
            const treatment = await Treatment.findById(result.case_type);
            if (treatment) treatmentName = treatment.case_type;
        }

        res.status(200).json({
            status: 'success',
            message: 'تم التنبؤ بنوع المعالجة بنجاح',
            data: {
                case_type_id: result.case_type,
                case_type_name: treatmentName || 'غير معروف',
                probability: (result.probability * 100).toFixed(2) + '%',
                image_used: imageFeatures !== null,
                all_probabilities: result.all_probabilities.map(p => (p * 100).toFixed(2) + '%')
            }
        });

    } catch (error) {
        console.error('❌ Prediction error:', error.message);
        
        // حذف الملف المؤقت في حالة الخطأ
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            status: 'error',
            message: 'حدث خطأ أثناء التنبؤ: ' + error.message
        });
    }
});

// ============================================================
// 📊 تصدير البيانات (Admin only)
// ============================================================

router.post('/export', verifyToken, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                status: 'error',
                message: 'غير مصرح بالوصول'
            });
        }

        const result = await TreatmentDataService.exportFromMongoDB();

        if (!result.success) {
            return res.status(500).json({
                status: 'error',
                message: result.error || 'فشل تصدير البيانات'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'تم تصدير بيانات المعالجات بنجاح',
            data: { totalRecords: result.totalRecords }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// ============================================================
// 📊 جلب معلومات النموذج
// ============================================================

router.get('/info', verifyToken, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const modelPath = path.join(__dirname, '../models/brain_model.json');

        let info = {
            isTrained: fs.existsSync(modelPath),
            features: ['age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
                'is_pregnant', 'previous_treatment', 'takes_medication', 'medication_type'],
            modelType: 'Brain.js Neural Network'
        };

        if (fs.existsSync(modelPath)) {
            const data = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
            info = { ...info, classes: data.numClasses, trainedAt: data.trainedAt };
        }

        res.status(200).json({
            status: 'success',
            data: info
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;