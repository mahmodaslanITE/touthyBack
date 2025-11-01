const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // التحقق من وجود التوكن
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'توكن غير موجود أو غير صالح' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // فك التوكن والتحقق منه
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // حفظ بيانات المستخدم في الطلب لاستخدامها لاحقًا
    req.user = decoded;

    next(); // الانتقال إلى الخطوة التالية
  } catch (error) {
    return res.status(403).json({ message: 'توكن غير صالح أو منتهي الصلاحية' });
  }
};


module.exports = verifyToken;
