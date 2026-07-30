const asyncHandler = require('express-async-handler');
const socket = require('../../socket/init');
const { User } = require('../../models/User');

/**
 * @desc Send notification to users by roles
 * @route POST /api/admin/notify
 * @access Private (Admin only)
 */
module.exports.notifyAll = asyncHandler(async (req, res) => {
    // 1. التحقق من صلاحية الأدمن
    if (!req.user.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح، هذه الخدمة للمشرفين فقط'
        });
    }

    // 2. استقبال البيانات
    const { body, title, roles } = req.body;

    // 3. التحقق من وجود البيانات المطلوبة
    if (!title || !body) {
        return res.status(400).json({
            status: 'error',
            message: 'العنوان والمحتوى مطلوبان'
        });
    }

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'يجب تحديد دور واحد على الأقل للإشعار'
        });
    }

    // 4. التحقق من صحة الأدوار
    const validRoles = ['patient', 'student', 'overseer', 'admin'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: `الأدوار التالية غير صالحة: ${invalidRoles.join(', ')}`
        });
    }

    const io = socket.getIO();
    if (!io) {
        return res.status(500).json({
            status: 'error',
            message: 'Socket.IO غير متاح حالياً'
        });
    }

    // 5. جلب المستخدمين حسب الأدوار
    const users = await User.find({ role: { $in: roles } });

    if (users.length === 0) {
        return res.status(404).json({
            status: 'error',
            message: 'لا يوجد مستخدمون بهذه الأدوار'
        });
    }

    // 6. إرسال الإشعارات
    let sentCount = 0;
    let failedCount = 0;

    for (const user of users) {
        try {
            // ✅ إرسال الإشعار لكل مستخدم
            io.to(user._id.toString()).emit('notify', {
                title: title,
                body: body,
                timestamp: new Date().toISOString(),
                role: user.role
            });
            sentCount++;
            console.log(`✅ Notification sent to ${user.email} (${user.role})`);
        } catch (error) {
            failedCount++;
            console.error(`❌ Failed to send notification to ${user.email}:`, error.message);
        }
    }

    // 7. إرسال الرد
    res.status(200).json({
        status: 'success',
        message: `تم إرسال الإشعار إلى ${sentCount} مستخدم من دور: ${roles.join(', ')}`,
        data: {
            total: users.length,
            sent: sentCount,
            failed: failedCount,
            roles: roles,
            recipients: users.map(u => ({
                id: u._id,
                email: u.email,
                role: u.role
            }))
        }
    });
});