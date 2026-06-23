// test-cloudinary.js
require('dotenv').config();
const cloudinary = require('./config/cloudinary');

async function testCloudinary() {
    try {
        console.log('🔍 Testing Cloudinary connection...');
        
        // ✅ اختبار ping
        const result = await cloudinary.api.ping();
        console.log('✅ Cloudinary connection successful!');
        console.log('📊 Result:', result);
        
        // ✅ اختبار رفع صورة وهمية (اختياري)
        // const uploadResult = await cloudinary.uploader.upload('path/to/image.jpg', {
        //     folder: 'test'
        // });
        // console.log('📸 Upload result:', uploadResult.secure_url);
        
    } catch (error) {
        console.error('❌ Cloudinary connection failed:', error.message);
    }
}

testCloudinary();