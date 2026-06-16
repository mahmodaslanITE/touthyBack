// utils/updateEnv.js
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

/**
 * قراءة ملف .env الحالي
 * @returns {Object} - محتوى الملف كـ Object
 */
const readEnvFile = () => {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        // تخطي الأسطر الفارغة والتعليقات
        if (line.trim() && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                envVars[key.trim()] = value;
            }
        }
    });
    
    return envVars;
};

/**
 * كتابة البيانات إلى ملف .env
 * @param {Object} envVars - البيانات الجديدة
 */
const writeEnvFile = (envVars) => {
    let content = '';
    
    for (const [key, value] of Object.entries(envVars)) {
        content += `${key}=${value}\n`;
    }
    
    fs.writeFileSync(envPath, content, 'utf8');
};

/**
 * تحديث قيمة محددة في ملف .env
 * @param {string} key - اسم المفتاح
 * @param {string} value - القيمة الجديدة
 */
const updateEnvVariable = (key, value) => {
    const envVars = readEnvFile();
    envVars[key] = value;
    writeEnvFile(envVars);
    
    // تحديث process.env مباشرة
    process.env[key] = value;
    
    return true;
};

/**
 * الحصول على BASE_URL من الطلب وتحديثها في .env
 * @param {Object} req - Express request object
 */
const updateBaseUrlFromRequest = (req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    updateEnvVariable('BASE_URL', baseUrl);
    return baseUrl;
};

module.exports = {
    readEnvFile,
    writeEnvFile,
    updateEnvVariable,
    updateBaseUrlFromRequest
};