const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myDatabase', {
      
    });
    console.log('✅connected succesful')
  } catch (error) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', error.message);
    process.exit(1); // إيقاف التطبيق في حال فشل الاتصال
  }
};

module.exports = connectDB;
