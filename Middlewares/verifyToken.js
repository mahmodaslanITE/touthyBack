const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("token is :",authHeader)
  // التحقق من وجود التوكن
  if (!authHeader /*|| !authHeader.startsWith('Bearer ')*/) {
    return res.status(401).json({ message: 'توكن غير موجود أو غير صالح' });
  }
  try {
    const token = authHeader.split(' ')[1];
    // فك التوكن والتحقق منه
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // حفظ بيانات المستخدم في الطلب لاستخدامها لاحقًا
    req.user = decoded;
    console.log('Authenticated user:', req.user);

    next(); // الانتقال إلى الخطوة التالية
  } catch (error) {
    return res.status(403).json({ message: 'توكن غير صالح أو منتهي الصلاحية',error });
  }
};


module.exports = verifyToken;
