// test-mongo.js
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('⏳ Connecting to MongoDB...');
        console.log('📡 URI:', process.env.MONGO_URI);
        
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        
        console.log('✅ Connected successfully!');
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📊 Collections:', collections.map(c => c.name));
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();