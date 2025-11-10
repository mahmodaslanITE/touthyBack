
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
app.use('/api/user',require('./routes/users'))

// خطأ 404 لأي راوتر آخر
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

