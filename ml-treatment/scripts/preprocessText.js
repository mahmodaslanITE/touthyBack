// ml-treatment/scripts/preprocessText.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function preprocessText() {
    console.log('⏳ Preprocessing text data...');
    console.log('='.repeat(50));

    // التأكد من وجود المجلدات
    const modelsDir = path.join(__dirname, '../models');
    if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

    const inputPath = path.join(__dirname, '../data/processed/text_features.csv');
    const outputPath = path.join(__dirname, '../data/processed/training_data.csv');
    const scalerPath = path.join(__dirname, '../models/scaler.json');

    // قراءة البيانات
    const data = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream(inputPath)
            .pipe(csv())
            .on('data', (row) => data.push(row))
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`📊 Loaded ${data.length} records`);

    // ترميز المتغيرات
    const genderMap = { male: 0, female: 1 };
    const painTimeMap = { morning: 0, evening: 1, night: 2, all: 3 };
    const medTypeMap = { '': 0, painkiller: 1, antibiotic: 2, multiple: 3 };

    const processed = data.map(row => ({
        age: parseFloat(row.age) || 25,
        gender: genderMap[row.gender] !== undefined ? genderMap[row.gender] : 0,
        pain_severity: Math.min(10, Math.max(0, parseFloat(row.pain_severity) || 5)),
        pain_time: painTimeMap[row.pain_time] !== undefined ? painTimeMap[row.pain_time] : 3,
        tooth_location: parseFloat(row.tooth_location) || 20,
        is_pregnant: row.is_pregnant === 'true' ? 1 : 0,
        previous_treatment: row.previous_treatment === 'true' ? 1 : 0,
        takes_medication: row.takes_medication === 'true' ? 1 : 0,
        medication_type: medTypeMap[row.medication_type] !== undefined ? medTypeMap[row.medication_type] : 0,
        case_type: row.case_type
    }));

    // تطبيع الأرقام
    const features = ['age', 'gender', 'pain_severity', 'pain_time', 'tooth_location',
        'is_pregnant', 'previous_treatment', 'takes_medication', 'medication_type'];

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
        const newRow = {};
        features.forEach(f => {
            newRow[f] = (row[f] - means[f]) / stds[f];
        });
        newRow.case_type = row.case_type;
        return newRow;
    });

    // حفظ البيانات
    const csvWriter = require('csv-writer').createObjectCsvWriter({
        path: outputPath,
        header: [...features.map(f => ({ id: f, title: f })), { id: 'case_type', title: 'case_type' }]
    });
    await csvWriter.writeRecords(normalized);
    console.log(`💾 Saved to: ${outputPath}`);

    // حفظ معايير التطبيع
    fs.writeFileSync(scalerPath, JSON.stringify({ means, stds, features }, null, 2));
    console.log(`💾 Saved scaler to: ${scalerPath}`);

    console.log(`✅ Preprocessing completed: ${normalized.length} records`);
}

preprocessText().catch(console.error).finally(() => process.exit(0));