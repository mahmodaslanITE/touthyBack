const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const userRoutes = require('./routes/users');
const socket = require('./socket/init');

dotenv.config();

const app = express();
const server = http.createServer(app);

// لدعم JSON
app.use(express.json());

// جعل مجلد الصور متاح
app.use('/images', express.static(path.join(__dirname, 'images')));
// راوتر المستخدمين
app.use('/api/users', userRoutes);
app.use('/api/auth/', require('./routes/auth'));
app.use('/api/profile', require('./routes/users'));
app.use('/api/request', require('./routes/requestions'));

// خطأ 404 لأي راوتر آخر
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// اتصال قاعدة البيانات
require('./config/db')();

// تهيئة socket.io
const io = socket.init(server);

// استماع على الاتصالات
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('registerPatient', (patientId) => {
    socket.join(patientId.toString()); // يدخل غرفة باسم patientId
    console.log(`Patient ${patientId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
module.exports=io


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
