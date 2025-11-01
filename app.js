const express = require('express');
const connectDB = require('./config/db');
const multer = require('multer');
const upload = multer();
const app = express();
app.use(express.json())
app.use(upload.none());
require('dotenv').config();

// هذا يسمح بقراءة x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));// الاتصال بقاعدة البيانات
connectDB();

//routes
app.use('/api/auth/',require('./routes/auth'))
app.use('/api/user',require('./routes/users'))

// server conniction
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀server is running on port ${PORT}`));
