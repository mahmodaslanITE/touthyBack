// ml/services/mlService.js
const { Neighbors } = require('@kanaries/ml');
const fs = require('fs');
const path = require('path');
const DataService = require('./dataService');

class MLService {
    constructor() {
        this.model = null;
        this.isTrained = false;
        this.scaler = null;
        this.features = [];
        this.modelPath = path.join(__dirname, '../models/knn_model.json');
        this.scalerPath = path.join(__dirname, '../models/scaler.json');
        this.configPath = path.join(__dirname, '../config/config.json');
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                return config;
            }
            return {
                model: { defaultK: 5, weights: 'distance' },
                training: { kValues: [1, 3, 5, 7, 9, 11, 13, 15] }
            };
        } catch (error) {
            console.error('Error loading config:', error.message);
            return { model: { defaultK: 5, weights: 'distance' } };
        }
    }

    loadScaler() {
        try {
            if (fs.existsSync(this.scalerPath)) {
                this.scaler = JSON.parse(fs.readFileSync(this.scalerPath, 'utf8'));
                this.features = this.scaler.features || [];
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading scaler:', error.message);
            return false;
        }
    }

    async train() {
        try {
            console.log('⏳ Training KNN model...');
            console.log('='.repeat(50));

            const data = await DataService.getTrainingData();
            if (!data || data.length === 0) {
                console.log('❌ No training data found.');
                return { success: false, message: 'No training data found' };
            }

            const features = ['age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
                'is_pregnant', 'previous_treatment', 'takes_medication', 'medication_type', 'rating'];

            const X = data.map(row => features.map(f => parseFloat(row[f])));
            const y = data.map(row => parseInt(row.status));

            console.log(`📊 Training data: ${X.length} samples, ${features.length} features`);

            const splitIndex = Math.floor(X.length * 0.8);
            const X_train = X.slice(0, splitIndex);
            const y_train = y.slice(0, splitIndex);
            const X_test = X.slice(splitIndex);
            const y_test = y.slice(splitIndex);

            console.log(`📊 Training set: ${X_train.length} samples`);
            console.log(`📊 Testing set: ${X_test.length} samples`);

            const config = this.loadConfig();
            const kValues = config.training.kValues || [1, 3, 5, 7, 9, 11, 13, 15];

            let bestK = config.model.defaultK || 5;
            let bestScore = 0;

            for (const k of kValues) {
                if (k > X_train.length) continue;

                try {
                    const knn = new Neighbors.KNearstNeighbors(k, 'distance', '2-norm');
                    knn.fit(X_train, y_train);

                    const predictions = knn.predict(X_test);
                    let correct = 0;
                    for (let i = 0; i < predictions.length; i++) {
                        if (predictions[i] === y_test[i]) correct++;
                    }
                    const score = correct / predictions.length;

                    console.log(`   K=${k}: Accuracy = ${(score * 100).toFixed(2)}%`);

                    if (score > bestScore) {
                        bestScore = score;
                        bestK = k;
                    }
                } catch (err) {
                    console.log(`   K=${k}: Skipped (${err.message})`);
                }
            }

            console.log(`✅ Best K: ${bestK} (Accuracy: ${(bestScore * 100).toFixed(2)}%)`);

            const finalKnn = new Neighbors.KNearstNeighbors(bestK, 'distance', '2-norm');
            finalKnn.fit(X, y);

            const modelData = {
                bestK: bestK,
                accuracy: bestScore,
                featureNames: features,
                trainedAt: new Date().toISOString(),
                totalSamples: X.length
            };

            const modelDir = path.dirname(this.modelPath);
            if (!fs.existsSync(modelDir)) {
                fs.mkdirSync(modelDir, { recursive: true });
            }

            this.model = finalKnn;
            this.isTrained = true;

            fs.writeFileSync(this.modelPath, JSON.stringify(modelData, null, 2));

            console.log(`\n📈 Model Evaluation:`);
            console.log(`   Best K: ${bestK}`);
            console.log(`   Accuracy: ${(bestScore * 100).toFixed(2)}%`);
            console.log(`   Training samples: ${X.length}`);
            console.log(`\n✅ Model saved to: ${this.modelPath}`);

            // ✅ تحديث العدد الذي تم التدريب عليه
            const totalRecords = await DataService.getTotalRecordsCount();
            DataService.setLastTrainedCount(totalRecords);

            return {
                success: true,
                bestK,
                accuracy: bestScore,
                totalSamples: X.length,
                totalRecords: totalRecords
            };

        } catch (error) {
            console.error('❌ Training error:', error.message);
            return { success: false, error: error.message };
        }
    }

    loadModel() {
        try {
            if (!fs.existsSync(this.modelPath)) {
                console.log('⚠️ Model not found. Train first.');
                return false;
            }

            const modelData = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
            this.isTrained = true;
            this.features = modelData.featureNames || [];

            console.log(`✅ Model loaded from: ${this.modelPath}`);
            console.log(`   Best K: ${modelData.bestK}`);
            console.log(`   Accuracy: ${(modelData.accuracy * 100).toFixed(2)}%`);
            console.log(`   Trained at: ${modelData.trainedAt}`);

            return true;

        } catch (error) {
            console.error('Error loading model:', error.message);
            return false;
        }
    }

    async predict(patientData) {
        try {
            if (!this.loadScaler()) {
                throw new Error('Scaler not found. Please preprocess data first.');
            }

            if (!this.isTrained) {
                this.loadModel();
            }

            const genderMap = { male: 0, female: 1 };
            const painTimeMap = { morning: 0, evening: 1, night: 2, all: 3 };
            const medTypeMap = { '': 0, painkiller: 1, antibiotic: 2, multiple: 3 };

            const features = [
                parseFloat(patientData.age) || 25,
                genderMap[patientData.gender] !== undefined ? genderMap[patientData.gender] : 0,
                parseFloat(patientData.pain_severity) || 5,
                painTimeMap[patientData.pain_time] !== undefined ? painTimeMap[patientData.pain_time] : 3,
                parseFloat(patientData.tooth_location) || 20,
                patientData.is_pregnant ? 1 : 0,
                patientData.previous_treatment ? 1 : 0,
                patientData.takes_medication ? 1 : 0,
                medTypeMap[patientData.medication_type] !== undefined ? medTypeMap[patientData.medication_type] : 0,
                parseFloat(patientData.rating) || 3
            ];

            const { means, stds } = this.scaler;
            const normalizedFeatures = features.map((val, i) => {
                const featureName = this.scaler.features[i] || `feature_${i}`;
                return (val - means[featureName]) / stds[featureName];
            });

            const data = await DataService.getTrainingData();
            if (!data || data.length === 0) {
                throw new Error('No training data available for prediction.');
            }

            const featureNames = ['age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
                'is_pregnant', 'previous_treatment', 'takes_medication', 'medication_type', 'rating'];

            const X = data.map(row => featureNames.map(f => parseFloat(row[f])));
            const y = data.map(row => parseInt(row.status));

            const knn = new Neighbors.KNearstNeighbors(9, 'distance', '2-norm');
            knn.fit(X, y);

            const prediction = knn.predict([normalizedFeatures])[0];

            // حساب الثقة
            const distances = [];
            const k = 9;

            for (let i = 0; i < X.length; i++) {
                let dist = 0;
                for (let j = 0; j < normalizedFeatures.length; j++) {
                    dist += Math.pow(normalizedFeatures[j] - X[i][j], 2);
                }
                dist = Math.sqrt(dist);
                distances.push({ index: i, distance: dist });
            }

            distances.sort((a, b) => a.distance - b.distance);
            const nearestK = distances.slice(0, k);
            let avgDistance = 0;
            for (const d of nearestK) {
                avgDistance += d.distance;
            }
            avgDistance = avgDistance / nearestK.length;

            const confidence = Math.max(0, Math.min(100, (1 / (1 + avgDistance)) * 100));

            return {
                prediction: prediction === 1 ? '✅ مقبولة' : '❌ مرفوضة',
                prediction_code: prediction,
                confidence: confidence.toFixed(2) + '%'
            };

        } catch (error) {
            console.error('❌ Prediction error:', error.message);
            throw error;
        }
    }

    async fullTrain() {
        console.log('🚀 Starting full training pipeline...');
        console.log('='.repeat(50));

        const exportResult = await DataService.exportFromMongoDB();
        if (!exportResult.success) {
            return { success: false, step: 'export', error: exportResult.error };
        }

        const preprocessResult = await DataService.preprocessData();
        if (!preprocessResult.success) {
            return { success: false, step: 'preprocess', error: preprocessResult.error };
        }

        const trainResult = await this.train();
        if (!trainResult.success) {
            return { success: false, step: 'train', error: trainResult.error };
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Training pipeline completed successfully!');
        console.log('='.repeat(50));

        return {
            success: true,
            totalRecords: trainResult.totalRecords,
            bestK: trainResult.bestK,
            accuracy: trainResult.accuracy
        };
    }
}

module.exports = new MLService();