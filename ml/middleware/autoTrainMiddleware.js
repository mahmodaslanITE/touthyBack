// ml/middleware/autoTrainMiddleware.js
const TrainingMonitor = require('../services/trainingMonitor');

const autoTrainMiddleware = async (req, res, next) => {
    // تجاهل طلبات التدريب نفسها
    if (req.path.includes('/retrain') || req.path.includes('/train') || req.path.includes('/monitor-status')) {
        return next();
    }

    // منع التدريب المتزامن
    if (TrainingMonitor.isTraining) {
        return next();
    }

    try {
        // ✅ التحقق من الحاجة للتدريب (في الخلفية)
        TrainingMonitor.checkAndTrain().catch(err => {
            console.error('❌ Background training failed:', err.message);
        });
        
        next();
    } catch (error) {
        console.error('❌ Auto-train middleware error:', error.message);
        next();
    }
};

module.exports = autoTrainMiddleware;