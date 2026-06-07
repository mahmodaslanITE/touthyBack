const Patient_profile = require('../../models/Patient_profile');
const asyncHandler=require('express-async-handler')
// ============================================================
// 👨‍⚕️ PATIENTS MANAGEMENT
// ============================================================

/**
 * @description Get all patients
 * @route GET /api/admin/patients
 * @access Private (Admin only)
 */
module.exports.getAllPatients = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مسموح بالوصول، هذه الصلاحية للمشرفين فقط'
        });
    }

    const patients = await Patient_profile.find();

    res.status(200).json({
        status: 'success',
        count: patients.length,
        data: patients
    });
});