const { User } = require("../models/User");

module.exports.getUserProfile= async function (req, res)  {
    // الوصول إلى بيانات المستخدم من التوكن
    const user=await User.findById(req.user.id).select('-password')
    res.json({ message: 'تم التحقق من التوكن', user });
  }