// ml/routes/mlRoutes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../../Middlewares/verifyToken');
const MLService = require('../services/mlService');
const DataService = require('../services/dataService');
const TrainingMonitor = require('../services/trainingMonitor');
const autoTrainMiddleware = require('../middleware/autoTrainMiddleware');

// ✅ تطبيق middleware التحقق التلقائي على جميع الروتات
router.use(autoTrainMiddleware);

// ============================================================
// 🔮 التنبؤ بحالة جديدة
// ============================================================

router.post('/predict', verifyToken, async (req, res) => {
    try {
        const { 
            age, 
            gender, 
            pain_severity, 
            pain_time, 
            tooth_location, 
            is_pregnant, 
            previous_treatment, 
            medicines, 
            chronic_diseases, 
            notes, 
            case_type 
        } = req.body;

        // // ✅ التحقق من الحقول المطلوبة
        // if (!age || !gender || !pain_severity|| !pain_time || !tooth_location) {
        //     return res.status(400).json({
        //         status: 'error',
        //         message: 'الرجاء إدخال جميع البيانات المطلوبة: age, gender, pain_severity, pain_time, tooth_location'
        //     });
        // }

        // ✅ التنبؤ باستخدام الميزات الجديدة
        const result = await MLService.predict({
            age,
            gender,
            pain_severity,
            pain_time,
            tooth_location,
            is_pregnant: is_pregnant || false,
            previous_treatment: previous_treatment || false,
            medicines: medicines || '',
            chronic_diseases: chronic_diseases || '',
            notes: notes || '',
            case_type: case_type || ''
        });

        res.status(200).json({
            status: 'success',
            message: 'تم التنبؤ بنجاح',
            data: result
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
// 📊 جلب معلومات النموذج
// ============================================================

router.get('/info', verifyToken, async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const modelPath = path.join(__dirname, '../models/knn_model.json');
        const metadataPath = path.join(__dirname, '../data/metadata/version.json');

        let info = {
            isTrained: fs.existsSync(modelPath),
            features: ['age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
                'is_pregnant', 'previous_treatment', 'medicines', 'chronic_diseases', 'notes', 'case_type']
        };

        if (fs.existsSync(modelPath)) {
            const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
            info = { ...info, ...modelData };
        }

        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            info = { ...info, metadata };
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

// ============================================================
// 🔄 إعادة تدريب النموذج (يدوي - للأدمن)
// ============================================================

router.post('/retrain', verifyToken, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                status: 'error',
                message: 'غير مصرح بالوصول، هذه الخدمة للمشرفين فقط'
            });
        }

        const result = await TrainingMonitor.checkAndTrain();

        if (!result.success) {
            return res.status(500).json({
                status: 'error',
                message: result.error || 'فشل التدريب'
            });
        }

        res.status(200).json({
            status: 'success',
            message: result.trained ? 'تم إعادة تدريب النموذج بنجاح' : 'لا توجد بيانات جديدة للتدريب',
            data: result.trained ? {
                totalRecords: result.totalRecords,
                bestK: result.bestK,
                accuracy: (result.accuracy * 100).toFixed(2) + '%'
            } : null
        });

    } catch (error) {
        console.error('❌ Retrain error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'فشل إعادة التدريب: ' + error.message
        });
    }
});

// ============================================================
// 📊 جلب حالة المراقبة
// ============================================================

router.get('/monitor-status', verifyToken, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                status: 'error',
                message: 'غير مصرح بالوصول'
            });
        }

        const status = TrainingMonitor.getStatus();
        const fs = require('fs');
        const path = require('path');
        const metadataPath = path.join(__dirname, '../data/metadata/version.json');
        
        let metadata = null;
        if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }

        res.status(200).json({
            status: 'success',
            data: {
                ...status,
                metadata: metadata,
                config: {
                    batchSize: 10,
                    checkOnEveryRequest: true
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
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

        const result = await DataService.exportFromMongoDB();

        if (!result.success) {
            return res.status(500).json({
                status: 'error',
                message: result.error || 'فشل تصدير البيانات'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'تم تصدير البيانات بنجاح',
            data: { totalRecords: result.totalRecords }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;