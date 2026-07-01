const jwt = require('jsonwebtoken');

const checkAuthOrGuest = (req, res, next) => {
  const authHeader = req.headers?.authorization;
  console.log("token is :", authHeader);
  
  // التحقق من وجود التوكن
  if (!authHeader||authHeader==='Bearer') { 
    // إضافة واصفة للضيف
    
    return next(); // الاستمرار كضيف
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
    return res.status(403).json({ message: 'توكن غير صالح أو منتهي الصلاحية', error });
  }
};

module.exports = checkAuthOrGuest;