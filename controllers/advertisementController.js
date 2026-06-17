const asyncHandler = require('express-async-handler');
const Advertisement = require('../models/Advertisement');

// ============================================================
// 📢 ADVERTISEMENTS MANAGEMENT
// ============================================================

/**
 * @description Create a new advertisement
 * @route POST /api/admin/advertisements
 * @access Private (Admin only)
 */
exports.createAdvertisement = asyncHandler(async (req, res) => {
    // 1. التحقق من صلاحية الأدمن
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح بالوصول، هذه الخدمة للمشرفين فقط'
        });
    }

    // 2. التحقق من وجود المحتوى
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'محتوى الإعلان مطلوب'
        });
    }

  

    // 4. التحقق من عدم تجاوز الحد الأقصى (3 إعلانات)
    const currentCount = await Advertisement.countDocuments();
    if (currentCount >= 3) {
        return res.status(400).json({
            status: 'error',
            message: 'لا يمكن إضافة أكثر من 3 إعلانات. قم بحذف إعلان أولاً'
        });
    }
let imageUrl;
    // 5. بناء رابط الصورة
    if(req.file){
     imageUrl = `images/posts/${req.file.filename}`;
    }
    // 6. إنشاء الإعلان
    const advertisement = await Advertisement.create({
        content: content.trim(),
        image: {url:imageUrl},
        created_by: req.user.id
    });
advertisement.image.url=`${process.env.BASE_URL}/${advertisement.image.url}`
    res.status(201).json({
        status: 'success',
        message: 'تم إنشاء الإعلان بنجاح',
        data: advertisement
    });
});

/**
 * @description Get all advertisements
 * @route GET /api/advertisements
 * @access Public
 */
exports.getAllAdvertisements = asyncHandler(async (req, res) => {
    const advertisements=await Advertisement.find();

    advertisements.map((adv)=>{
        adv.image.url=`${process.env.BASE_URL}/${adv.image.url}`
    })
    res.status(200).json({
        status: 'success',
        message: 'هذه هي جميع الإعلانات',
       
        count: advertisements.length,
        data: advertisements
    });
});


/**
 * @description Update advertisement
 * @route PUT /api/admin/advertisements/:id
 * @access Private (Admin only)
 */
exports.updateAdvertisement = asyncHandler(async (req, res) => {
    // 1. التحقق من صلاحية الأدمن
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح بالوصول، هذه الخدمة للمشرفين فقط'
        });
    }

    // 2. البحث عن الإعلان
    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
        return res.status(404).json({
            status: 'error',
            message: 'الإعلان غير موجود'
        });
    }

    // 3. تحديث الحقول
    const { content } = req.body;

    if (content) {
        advertisement.content = content.trim();
    }

    if (is_active !== undefined) {
        advertisement.is_active = is_active === 'true' || is_active === true;
    }

    // 4. تحديث الصورة إذا وجدت
    if (req.file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        advertisement.image = `${baseUrl}/images/advertisements/${req.file.filename}`;
    }

    await advertisement.save();

    res.status(200).json({
        status: 'success',
        message: 'تم تحديث الإعلان بنجاح',
        data: advertisement
    });
});

/**
 * @description Delete advertisement
 * @route DELETE /api/admin/advertisements/:id
 * @access Private (Admin only)
 */
exports.deleteAdvertisement = asyncHandler(async (req, res) => {
    // 1. التحقق من صلاحية الأدمن
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح بالوصول، هذه الخدمة للمشرفين فقط'
        });
    }

    // 2. البحث عن الإعلان
    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
        return res.status(404).json({
            status: 'error',
            message: 'الإعلان غير موجود'
        });
    }

    // 3. حذف الإعلان
    await advertisement.deleteOne();

    // 4. إرجاع العدد المتبقي من الإعلانات
    const remainingCount = await Advertisement.countDocuments();

    res.status(200).json({
        status: 'success',
        message: 'تم حذف الإعلان بنجاح',
        data: {
            remaining_count: remainingCount,
            max_allowed: 3
        }
    });
});