const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
console.log(authHeader)
console.log(authHeader.startsWith('Bearer '))
  // التحقق من وجود التوكن
  if (!authHeader /*|| !authHeader.startsWith('Bearer ')*/) {
    return res.status(401).json({ message: 'توكن غير موجود أو غير صالح' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // فك التوكن والتحقق منه
    const decoded = jwt.verify(authHeader, process.env.JWT_SECRET);

    // حفظ بيانات المستخدم في الطلب لاستخدامها لاحقًا
    req.user = decoded;
    console.log('Authenticated user:', req.user);

    next(); // الانتقال إلى الخطوة التالية
  } catch (error) {
    return res.status(403).json({ message: 'توكن غير صالح أو منتهي الصلاحية',error });
  }
};


module.exports = verifyToken;
