// ml/services/dataService.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

class DataService {
    constructor() {
        this.rawDataPath = path.join(__dirname, '../data/raw/combined_data.csv');
        this.processedDataPath = path.join(__dirname, '../data/processed/training_data.csv');
        this.metadataPath = path.join(__dirname, '../data/metadata/version.json');
        this.trainedCountPath = path.join(__dirname, '../data/metadata/trained_count.json');
    }

    // ============================================================
    // 📊 إدارة عدد الحالات المدربة
    // ============================================================

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
            console.log(`✅ Trained count set to: ${count}`);
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

    async getTotalRecordsCount() {
        try {
            if (mongoose.connection.readyState !== 1) {
                await mongoose.connect(process.env.MONGO_URI, {
                    serverSelectionTimeoutMS: 30000,
                    socketTimeoutMS: 45000,
                });
            }
            const db = mongoose.connection.db;
            const finishedCount = await db.collection('finished_requests').countDocuments();
            const rejectedCount = await db.collection('rejected_requests').countDocuments();
            return finishedCount + rejectedCount;
        } catch (error) {
            console.error('Error getting total records:', error.message);
            return 0;
        }
    }


async checkBatchSize() {
    try {
        const currentCount = await this.getTotalRecordsCount();
        const previousCount = this.getLastTrainedCount();  // ✅ لا تستخدم || currentCount
        
        // ✅ إذا كان الملف غير موجود أو previousCount = 0، فهذا أول تدريب
        if (previousCount === 0) {
            console.log('🔄 First training detected (no trained count).');
            return true;
        }
        
        const newRecords = currentCount - previousCount;
        console.log(`📊 Previous: ${previousCount}, Current: ${currentCount}, New: ${newRecords}`);
        
        return newRecords >= 10;

    } catch (error) {
        console.error('Error checking batch size:', error.message);
        return false;
    }
}

   

    // ============================================================
    // 📊 تنسيق البيانات للتدريب
    // ============================================================

    formatData(items, status) {
        return items.map(item => {
            return {
                age: item.age || 25,
                gender: item.gender || 'male',
                pain_severity: item.pain_severity || 5,
                pain_time: item.pain_time || 'all',
                tooth_location: parseInt(item.tooth_location) || 20,
                is_pregnant: item.is_pregnant || false,
                previous_treatment: item.previous_treatment,
                medicines:item.medicines,
                chronic_diseases:item.medicines,
                notes:item.notes,
                status: status
            };
        });
    }

    // ============================================================
    // 💾 حفظ البيانات كـ CSV
    // ============================================================

    async saveToCSV(data, filePath) {
        const headers = [
            'age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
            'is_pregnant', 'previous_treatment',  "medicines",
        "chronic_diseases",
        "notes",'status'
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
        console.log(`💾 Saved to: ${filePath}`);
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
    // 📊 تصدير البيانات من MongoDB
    // ============================================================

    async exportFromMongoDB() {
        try {
            console.log('⏳ Exporting data from MongoDB...');
            console.log('='.repeat(50));

            if (mongoose.connection.readyState !== 1) {
                console.log('⏳ Connecting to MongoDB...');
                await mongoose.connect(process.env.MONGO_URI, {
                    serverSelectionTimeoutMS: 30000,
                    socketTimeoutMS: 45000,
                });
                console.log('✅ Connected to MongoDB');
            }

            const db = mongoose.connection.db;

            const finished = await db.collection('finished_requests').find({}).toArray();
            const rejected = await db.collection('rejected_requests').find({}).toArray();

            console.log(`📊 Real data from database:`);
            console.log(`   ✅ Finished requests: ${finished.length}`);
            console.log(`   ❌ Rejected requests: ${rejected.length}`);

            const realFinished = this.formatData(finished, 1);
            const realRejected = this.formatData(rejected, 0);
            const allData = [...realFinished, ...realRejected];

            console.log(`\n📊 Total records: ${allData.length}`);
            console.log(`   ✅ Accepted: ${allData.filter(d => d.status === 1).length}`);
            console.log(`   ❌ Rejected: ${allData.filter(d => d.status === 0).length}`);

            if (allData.length === 0) {
                console.log('⚠️ No data found in database!');
                return { success: false, message: 'No data found' };
            }

            await this.saveToCSV(allData, this.rawDataPath);

            const metadata = {
                last_export: new Date().toISOString(),
                total_records: allData.length,
                accepted_count: allData.filter(d => d.status === 1).length,
                rejected_count: allData.filter(d => d.status === 0).length,
                version: Date.now()
            };

            const metadataDir = path.dirname(this.metadataPath);
            if (!fs.existsSync(metadataDir)) {
                fs.mkdirSync(metadataDir, { recursive: true });
            }
            fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));

            console.log('\n' + '='.repeat(50));
            console.log('✅ Export completed successfully!');
            console.log('='.repeat(50));

            return { success: true, totalRecords: allData.length };

        } catch (error) {
            console.error('\n❌ Export error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // 🔄 معالجة البيانات (Preprocessing)
    // ============================================================

    async preprocessData() {
        try {
            console.log('⏳ Preprocessing data...');

            if (!fs.existsSync(this.rawDataPath)) {
                console.log('❌ No raw data found. Run export first.');
                return { success: false, message: 'No raw data found' };
            }

            const data = await this.loadFromCSV(this.rawDataPath);
            console.log(`📊 Loaded ${data.length} records`);

            const processed = data.map(row => {
                const genderMap = { male: 0, female: 1 };
                const painTimeMap = { morning: 0, evening: 1, night: 2, all: 3 };
                const medTypeMap = { '': 0, painkiller: 1, antibiotic: 2, multiple: 3 };

                return {
                    age: parseFloat(row.age) || 25,
                    gender: genderMap[row.gender] !== undefined ? genderMap[row.gender] : 0,
                    pain_severity: Math.min(10, Math.max(0, parseFloat(row.pain_severity) || 5)),
                    pain_time: painTimeMap[row.pain_time] !== undefined ? painTimeMap[row.pain_time] : 3,
                    tooth_location: parseFloat(row.tooth_location) || 20,
                    is_pregnant: row.is_pregnant === 'true' ? 1 : 0,
                    previous_treatment: row.previous_treatment === 'true' ? 1 : 0,
                    takes_medication: row.takes_medication === 'true' ? 1 : 0,
                    medication_type: medTypeMap[row.medication_type] !== undefined ? medTypeMap[row.medication_type] : 0,
                    rating: parseFloat(row.rating) || 3,
                    status: parseInt(row.status)
                };
            });

            const features = ['age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
                'is_pregnant', 'previous_treatment', 'takes_medication', 'medication_type', 'rating'];

            const means = {};
            const stds = {};

            features.forEach(f => {
                const values = processed.map(row => row[f]);
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
                means[f] = mean;
                stds[f] = Math.sqrt(variance) || 1;
            });

            const normalized = processed.map(row => {
                const normalizedRow = {};
                features.forEach(f => {
                    normalizedRow[f] = (row[f] - means[f]) / stds[f];
                });
                normalizedRow.status = row.status;
                return normalizedRow;
            });

            await this.saveToCSV(normalized, this.processedDataPath);

            const scalerPath = path.join(__dirname, '../models/scaler.json');
            const scalerDir = path.dirname(scalerPath);
            if (!fs.existsSync(scalerDir)) {
                fs.mkdirSync(scalerDir, { recursive: true });
            }
            fs.writeFileSync(scalerPath, JSON.stringify({ means, stds, features }, null, 2));

            console.log(`✅ Preprocessing completed: ${processed.length} records processed`);
            console.log(`   Features: ${features.join(', ')}`);

            return { success: true, totalRecords: processed.length };

        } catch (error) {
            console.error('❌ Preprocess error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // 📊 الحصول على بيانات التدريب
    // ============================================================

    async getTrainingData() {
        try {
            if (!fs.existsSync(this.processedDataPath)) {
                return null;
            }
            const data = await this.loadFromCSV(this.processedDataPath);
            return data;
        } catch (error) {
            console.error('Error loading training data:', error.message);
            return null;
        }
    }
}

module.exports = new DataService();