
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const userRoutes = require('./routes/users');

dotenv.config();

const app = express();

// لدعم JSON
app.use(express.json());

// جعل مجلد الصور متاح
app.use('/images', express.static(path.join(__dirname, 'images')));

// راوتر المستخدمين
app.use('/api/users', userRoutes);
app.use('/api/auth/',require('./routes/auth'))
app.use('/api/profile',require('./routes/users'))
app.use('/api/request',require('./routes/requestions'))

// خطأ 404 لأي راوتر آخر
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
require('./config/db')()
require('dotenv').config();

console.log("Mongo URI:", process.env.MONGO_URI);
console.log("Cloudinary Name:", process.env.CLOUD_NAME);
console.log("Cloudinary Key:", process.env.CLOUD_API_KEY);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

