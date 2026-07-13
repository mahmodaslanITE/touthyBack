// ml/services/trainingMonitor.js
const DataService = require('./dataService');
const MLService = require('./mlService');
const fs = require('fs');
const path = require('path');

class TrainingMonitor {
    constructor() {
        this.isTraining = false;
        this.lastTrainingTime = null;
        this.monitorLogPath = path.join(__dirname, '../logs/training_monitor.log');
        this.statsPath = path.join(__dirname, '../data/metadata/training_stats.json');
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        console.log(`🔄 ${message}`);

        const logDir = path.dirname(this.monitorLogPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(this.monitorLogPath, logMessage);
    }

    async checkAndTrain() {
        if (this.isTraining) {
            this.log('⚠️ Training already in progress, skipping...');
            return { success: false, message: 'Training already in progress' };
        }

        try {
            // ✅ التحقق من وجود 10 حالات جديدة
            const shouldRetrain = await DataService.checkBatchSize();

            if (!shouldRetrain) {
                this.log('✅ No new data (less than 10 records). Skipping retraining.');
                return { success: true, message: 'No new data', trained: false };
            }

            this.log('📊 New data detected (10+ new records). Starting retraining...');

            this.isTraining = true;
            const result = await MLService.fullTrain();
            this.isTraining = false;

            if (result.success) {
                this.lastTrainingTime = new Date();
                this.log(`✅ Retraining completed successfully!`);
                this.log(`   📊 Records: ${result.totalRecords}`);
                this.log(`   📈 Best K: ${result.bestK}`);
                this.log(`   🎯 Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
            } else {
                this.log(`❌ Retraining failed: ${result.error}`);
            }

            return { ...result, trained: true };

        } catch (error) {
            this.isTraining = false;
            this.log(`❌ Retraining error: ${error.message}`);
            return { success: false, error: error.message, trained: false };
        }
    }

    getStatus() {
        return {
            isTraining: this.isTraining,
            lastTrainingTime: this.lastTrainingTime,
            isModelTrained: MLService.isTrained
        };
    }
}

module.exports = new TrainingMonitor();