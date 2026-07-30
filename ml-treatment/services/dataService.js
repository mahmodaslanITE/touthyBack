// ml-treatment/services/dataService.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

class TreatmentDataService {
    constructor() {
        this.textDataPath = path.join(__dirname, '../data/processed/text_features.csv');
        this.imagePathsPath = path.join(__dirname, '../data/processed/image_paths.json');
        this.metadataPath = path.join(__dirname, '../data/metadata/version.json');
        this.trainedCountPath = path.join(__dirname, '../data/metadata/trained_count.json');
        this.configPath = path.join(__dirname, '../config/config.json');
        this.imagesDir = path.join(__dirname, '../data/processed/images');
    }

    // ============================================================
    // 📊 تصدير البيانات من MongoDB (بدون more_details)
    // ============================================================

    async exportFromMongoDB() {
        try {
            console.log('⏳ Exporting treatment data from MongoDB...');
            console.log('='.repeat(50));

            if (mongoose.connection.readyState !== 1) {
                await mongoose.connect(process.env.MONGO_URI, {
                    serverSelectionTimeoutMS: 30000,
                    socketTimeoutMS: 45000,
                });
            }

            const db = mongoose.connection.db;
            const finished = await db.collection('finished_requests').find({}).toArray();

            console.log(`📊 Finished requests: ${finished.length}`);

            if (finished.length === 0) {
                return { success: false, message: 'No data found' };
            }

            // ✅ البيانات النصية (بدون more_details)
            const textData = this.prepareTextData(finished);
            
            // ✅ مسارات الصور
            const imageData = finished.map(item => ({
                id: item._id.toString(),
                case_type: item.case_type,
                imageUrl: item.photo?.url || null
            })).filter(item => item.imageUrl !== null);

            // ✅ حفظ البيانات النصية
            await this.saveToCSV(textData, this.textDataPath);

            // ✅ حفظ مسارات الصور
            if (!fs.existsSync(this.imagesDir)) {
                fs.mkdirSync(this.imagesDir, { recursive: true });
            }

            const imagePaths = [];
            for (const item of imageData) {
                if (item.imageUrl) {
                    const sourcePath = path.join(__dirname, '../../', item.imageUrl);
                    const targetPath = path.join(this.imagesDir, `${item.id}.jpg`);
                    
                    if (fs.existsSync(sourcePath)) {
                        fs.copyFileSync(sourcePath, targetPath);
                        imagePaths.push({
                            id: item.id,
                            case_type: item.case_type,
                            localPath: targetPath
                        });
                    }
                }
            }

            fs.writeFileSync(this.imagePathsPath, JSON.stringify(imagePaths, null, 2));
            console.log(`💾 Saved ${imagePaths.length} images`);

            // ✅ حفظ metadata
            const metadata = {
                last_export: new Date().toISOString(),
                total_records: textData.length,
                image_count: imagePaths.length,
                version: Date.now()
            };
            
            const metadataDir = path.dirname(this.metadataPath);
            if (!fs.existsSync(metadataDir)) {
                fs.mkdirSync(metadataDir, { recursive: true });
            }
            fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));

            console.log('✅ Export completed successfully!');
            return { success: true, totalRecords: textData.length };

        } catch (error) {
            console.error('❌ Export error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // 📝 تجهيز البيانات النصية (بدون more_details)
    // ============================================================

    prepareTextData(items) {
        return items.map(item => {
            // ✅ استخراج البيانات من Requestion
            const req = item.Requestion || item;
            
            return {
                age: req.age || 25,
                gender: req.gender || 'male',
                pain_severity: req.pain_severity || 5,
                pain_time: req.pain_time || 'all',
                tooth_location: parseInt(req.tooth_location) || 20,
                is_pregnant: req.is_pregnant || false,
                previous_treatment: req.previous_treatment || false,
                medicines: req.medicines || '',
                chronic_diseases: req.chronic_diseases || '',
                notes: req.notes || '',
                case_type: req.case_type || item.case_type || ''
            };
        });
    }

    // ============================================================
    // 💾 حفظ البيانات كـ CSV
    // ============================================================

    async saveToCSV(data, filePath) {
        const headers = [
            'age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
            'is_pregnant', 'previous_treatment', 'medicines', 'chronic_diseases', 'notes',
            'case_type'
        ];

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: headers.map(h => ({ id: h, title: h }))
        });

        await csvWriter.writeRecords(data);
        console.log(`💾 Saved text data to: ${filePath}`);
        return true;
    }

    // ============================================================
    // 📥 قراءة البيانات من CSV
    // ============================================================

    async loadFromCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    }

    // ============================================================
    // 📊 الحصول على بيانات التدريب
    // ============================================================

    async getTrainingData() {
        try {
            if (!fs.existsSync(this.textDataPath)) {
                return null;
            }
            const data = await this.loadFromCSV(this.textDataPath);
            return data;
        } catch (error) {
            console.error('Error loading training data:', error.message);
            return null;
        }
    }

    getImagePaths() {
        try {
            if (fs.existsSync(this.imagePathsPath)) {
                return JSON.parse(fs.readFileSync(this.imagePathsPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading image paths:', error.message);
        }
        return [];
    }

    // ============================================================
    // 📊 عدد الحالات
    // ============================================================

    async getTotalRecordsCount() {
        try {
            if (mongoose.connection.readyState !== 1) {
                await mongoose.connect(process.env.MONGO_URI);
            }
            const db = mongoose.connection.db;
            return await db.collection('finished_requests').countDocuments();
        } catch (error) {
            return 0;
        }
    }

    setLastTrainedCount(count) {
        try {
            const dir = path.dirname(this.trainedCountPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.trainedCountPath, JSON.stringify({
                count,
                updatedAt: new Date().toISOString()
            }, null, 2));
            console.log(`✅ Treatment trained count set to: ${count}`);
        } catch (error) {
            console.error('Error saving trained count:', error.message);
        }
    }

    getLastTrainedCount() {
        try {
            if (fs.existsSync(this.trainedCountPath)) {
                const data = JSON.parse(fs.readFileSync(this.trainedCountPath, 'utf8'));
                return data.count || 0;
            }
        } catch (error) {
            console.error('Error reading trained count:', error.message);
        }
        return 0;
    }
}

module.exports = new TreatmentDataService();