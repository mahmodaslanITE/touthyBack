// ml-treatment/services/brainService.js
const brain = require('brainjs');
const fs = require('fs');
const path = require('path');

class BrainTreatmentService {
    constructor() {
        this.model = null;
        this.isTrained = false;
        this.classMap = {};
        this.numClasses = 0;
        this.features = [];
        this.modelPath = path.join(__dirname, '../models/brain_model.json');
        this.scalerPath = path.join(__dirname, '../models/scaler.json');
        this.configPath = path.join(__dirname, '../config/config.json');
        this.imageMode = false;
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading config:', error.message);
        }
        return {
            training: { iterations: 5000, errorThresh: 0.005, learningRate: 0.3 },
            features: ['age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
                'is_pregnant', 'previous_treatment', 'medicines', 'chronic_diseases', 'notes']
        };
    }

    // ============================================================
    // 📊 بناء النموذج
    // ============================================================

    buildModel(inputSize, outputSize) {
        const config = this.loadConfig();
        const hiddenLayers = config.training.hiddenLayers || [
            Math.floor(inputSize * 1.5),
            Math.floor(inputSize * 0.8)
        ];

        this.model = new brain.NeuralNetwork({
            hiddenLayers: hiddenLayers,
            activation: 'sigmoid',
            learningRate: config.training.learningRate || 0.3,
            iterations: config.training.iterations || 5000,
            errorThresh: config.training.errorThresh || 0.005
        });

        this.numClasses = outputSize;
        console.log(`✅ Model built: ${inputSize} inputs → ${outputSize} outputs`);
        console.log(`   Hidden layers: ${hiddenLayers.join(', ')}`);
        return this.model;
    }

    // ============================================================
    // 📐 تطبيع المدخلات
    // ============================================================

    normalizeInput(input) {
        return input.map(val => {
            if (val > 10) return val / 100;
            if (val > 5) return val / 10;
            return val;
        });
    }

    // ============================================================
    // 🧠 تدريب النموذج
    // ============================================================

    async train(useImages = false) {
        try {
            console.log('⏳ Training treatment prediction model...');
            console.log('='.repeat(50));

            const DataService = require('./dataService');
            const ImageService = require('./imageService');

            this.imageMode = useImages;

            const textData = await DataService.getTrainingData();
            if (!textData || textData.length === 0) {
                throw new Error('Training data not found. Run export first.');
            }

            console.log(`📊 Loaded ${textData.length} records`);

            // ✅ تجميع الفئات
            const uniqueClasses = [...new Set(textData.map(row => row.case_type))];
            this.classMap = {};
            uniqueClasses.forEach((cls, index) => {
                this.classMap[cls] = index;
            });
            this.numClasses = uniqueClasses.length;

            console.log(`📊 Treatment types: ${this.numClasses}`);

            // ✅ الميزات الجديدة (بدون more_details)
            const features = this.loadConfig().features || [
                'age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
                'is_pregnant', 'previous_treatment', 'medicines', 'chronic_diseases', 'notes'
            ];
            this.features = features;

            let trainingData = [];

            if (useImages) {
                const imagePaths = DataService.getImagePaths();
                const combinedData = await ImageService.getCombinedFeatures(textData, imagePaths);
                
                trainingData = combinedData.map(item => {
                    let input = [...item.text_features];
                    if (item.has_image) {
                        const imageFeatures = item.image_features.slice(0, 100);
                        input = [...input, ...imageFeatures];
                    }
                    const normalizedInput = this.normalizeInput(input);
                    const output = new Array(this.numClasses).fill(0);
                    const classIndex = this.classMap[item.case_type] || 0;
                    output[classIndex] = 1;
                    return { input: normalizedInput, output: output };
                });

                console.log(`📊 Using text + image features (${trainingData[0]?.input.length || 0} inputs)`);

            } else {
                // ✅ استخدام النص فقط
                trainingData = textData.map(row => {
                    const input = features.map(f => parseFloat(row[f]) || 0);
                    const normalizedInput = this.normalizeInput(input);
                    const output = new Array(this.numClasses).fill(0);
                    const classIndex = this.classMap[row.case_type] || 0;
                    output[classIndex] = 1;
                    return { input: normalizedInput, output: output };
                });

                console.log(`📊 Using text only (${features.length} inputs)`);
            }

            // ✅ إضافة بيانات وهمية إذا كان هناك نوع واحد فقط
            if (this.numClasses < 2) {
                console.log('⚠️ Only one treatment type found. Adding synthetic data...');
                const dummyClass = 'dummy_treatment_123';
                this.classMap[dummyClass] = 1;
                this.numClasses = 2;

                const dummyData = textData.slice(0, 5).map(row => {
                    const input = features.map(f => parseFloat(row[f]) || 0);
                    const normalizedInput = this.normalizeInput(input);
                    const output = new Array(this.numClasses).fill(0);
                    output[1] = 1;
                    return { input: normalizedInput, output: output };
                });
                trainingData.push(...dummyData);
                console.log(`   Added ${dummyData.length} synthetic samples`);
            }

            console.log(`📊 Training samples: ${trainingData.length}`);

            const inputSize = trainingData[0]?.input.length || features.length;
            this.buildModel(inputSize, this.numClasses);

            console.log('⏳ Training neural network...');

            const config = this.loadConfig();
            const result = this.model.train(trainingData, {
                iterations: config.training.iterations || 5000,
                errorThresh: config.training.errorThresh || 0.005,
                log: true,
                logPeriod: 500
            });

            console.log(`✅ Training completed!`);
            console.log(`   Final error: ${JSON.stringify(result)}`);

            this.isTrained = true;

            // ✅ تحديث العدد المدرب
            const totalRecords = await DataService.getTotalRecordsCount();
            DataService.setLastTrainedCount(totalRecords);

            this.saveModel();

            return {
                success: true,
                error: result,
                iterations: config.training.iterations || 5000,
                classes: this.numClasses,
                inputSize: inputSize,
                imageMode: useImages,
                totalRecords: totalRecords
            };

        } catch (error) {
            console.error('❌ Training error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // 💾 حفظ النموذج
    // ============================================================

    saveModel() {
        if (!this.model) return;

        const modelDir = path.dirname(this.modelPath);
        if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
        }

        const modelJson = this.model.toJSON();
        const metadata = {
            classMap: this.classMap,
            numClasses: this.numClasses,
            features: this.features,
            imageMode: this.imageMode,
            trainedAt: new Date().toISOString(),
            model: modelJson
        };

        fs.writeFileSync(this.modelPath, JSON.stringify(metadata, null, 2));
        console.log(`💾 Model saved to: ${this.modelPath}`);
    }

    // ============================================================
    // 📤 تحميل النموذج
    // ============================================================

    loadModel() {
        try {
            if (!fs.existsSync(this.modelPath)) {
                console.log('⚠️ Model not found. Train first.');
                return false;
            }

            const data = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
            
            this.classMap = data.classMap || {};
            this.numClasses = data.numClasses || 0;
            this.features = data.features || [];
            this.imageMode = data.imageMode || false;
            
            this.model = new brain.NeuralNetwork();
            this.model.fromJSON(data.model);
            
            this.isTrained = true;
            console.log(`✅ Model loaded from: ${this.modelPath}`);
            console.log(`   Classes: ${this.numClasses}`);
            console.log(`   Image mode: ${this.imageMode}`);
            return true;

        } catch (error) {
            console.error('Error loading model:', error.message);
            return false;
        }
    }

    // ============================================================
    // 🔮 التنبؤ
    // ============================================================

    predict(features, imageFeatures = null) {
        if (!this.isTrained || !this.model) {
            throw new Error('Model is not trained or loaded');
        }

        let input = [...features];

        if (this.imageMode && imageFeatures && imageFeatures.length > 0) {
            input = [...input, ...imageFeatures];
        }

        const normalizedInput = this.normalizeInput(input);
        const output = this.model.run(normalizedInput);
        
        const maxIndex = output.indexOf(Math.max(...output));
        const reversedClassMap = {};
        Object.entries(this.classMap).forEach(([key, value]) => {
            reversedClassMap[value] = key;
        });

        return {
            case_type: reversedClassMap[maxIndex] || 'unknown',
            probability: output[maxIndex] || 0,
            all_probabilities: output
        };
    }
}

module.exports = new BrainTreatmentService();