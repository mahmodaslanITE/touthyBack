const asyncHandler=require('express-async-handler');
const InProcess = require('../models/InProcess');
const Finished = require('../models/Finished');
const Patient_profil = require('../models/Patient_profile');
const Student_profile = require('../models/Student_profile');
const { TreatmentRequest } = require('../models/Requestion');
/**
 * @description view the request wich the overseer overlocks on it 
 * @route api/overseer/treatment
 * @method get
 * @access privte (only overseer)
 */
module.exports.show_overseer_requests_in_process = asyncHandler(async (req, res) => {
    // 1. التحقق من الصلاحية
    if (req.user.role !== 'overseer') {
        return res.status(403).json({ status: 'error', message: 'عذراً، هذه الصلاحية للمشرفين فقط' });
    }

    // 2. جلب الطلبات الأساسية
    const requests = await InProcess.find({ overseer: req.user.id }).lean();
    
   

    if (!requests || requests.length === 0) {
        return res.status(200).json({ status: 'success', data: [] });
    }

    // 3. تحويل المعرفات لنصوص (Strings) لضمان مطابقتها
    const patientUserIds = [...new Set(requests.map(r => r.patient?.toString()).filter(id => id))];
    const studentUserIds = [...new Set(requests.map(r => r.student?.toString()).filter(id => id))];
    const treatmentIds = [...new Set(requests.map(r => r.Requestion?.toString()).filter(id => id))];

    // 4. جلب البيانات (تأكد من استيراد الموديلات بشكل صحيح في أعلى الملف)
    const [patients, students, treatments] = await Promise.all([
        Patient_profil.find({ user: { $in: patientUserIds } }).lean(),
        Student_profile.find({ user: { $in: studentUserIds } }).lean(),
        TreatmentRequest.find({ _id: { $in: treatmentIds } }).lean()
    ]);

   

    // 5. دمج البيانات مع مقارنة ذكية (تحويل الكل لنصوص عند المقارنة)
    const fullData = requests.map(reqItem => {
        return {
            ...reqItem,
            patient_info: patients.find(p => p.user?.toString() === reqItem.patient?.toString()) || "بيانات المريض غير موجودة",
            student_info: students.find(s => s.user?.toString() === reqItem.student?.toString()) || "بيانات الطالب غير موجودة",
            treatment_info: treatments.find(t => t._id?.toString() === reqItem.Requestion?.toString()) || "تفاصيل العلاج غير موجودة"
        };
    });

    res.status(200).json({
        status: 'success',
        results: fullData.length,
        data: fullData
    });
});


/**
 * @description إنهاء الطلب ونقله إلى جدول المنتهية مع التقييم
 * @route PUT /api/overseer/treatment/:id/complete
 * @method PUT
 * @access Private (Overseer only)
 */
module.exports.complete_request = asyncHandler(async (req, res) => {
    const { rating, feedback } = req.body; // استلام التقييم والملاحظات من الـ Body
    const requestId = req.params.id;
    const overseerId = req.user.id;

    // 1. التحقق من الصلاحية
    if (req.user.role !== 'overseer') {
        return res.status(403).json({ message: 'غير مسموح لك بالقيام بهذا الإجراء' });
    }

    // 2. البحث عن الطلب والتأكد أن هذا المشرف هو المسؤول عنه
    const requestInProcess = await InProcess.findOne({ _id: requestId, overseer: overseerId });

    if (!requestInProcess) {
        return res.status(404).json({ 
            message: 'الطلب غير موجود أو أنك لست المشرف المسؤول عنه' 
        });
    }

    // 3. التحقق من وجود التقييم
    if (!rating) {
        return res.status(400).json({ message: 'يرجى وضع تقييم للطلب قبل الإغلاق' });
    }

    // 4. نقل البيانات لجدول المعالجات المنتهية (نفترض وجود Model باسم Finished)
    const finishedRequest = await Finished.create({
        user:requestInProcess.patient,
        overseer:req.user.id,
        student:requestInProcess.student, 
        _id: undefined,           
        rating: rating,           
        feedback: feedback,      
        completedAt: Date.now()   
    });

    //تعديل الحالة في جدول 
const treatment_request=await TreatmentRequest.findById(requestInProcess.Requestion);
treatment_request.status='done';
console.log(`this is treatment request ......${treatment_request}`)
await treatment_request.save();

    // 5. حذف الطلب من جدول "تحت المعالجة"
    await InProcess.findByIdAndDelete(requestId);

    res.status(200).json({
        status: 'success',
        message: 'تم إنهاء الطلب وتقييمه بنجاح ونقله للأرشيف',
        data: finishedRequest
    });
});

/**
 * @description رفض الطلب وإعادته لحالة الانتظار مع إضافة ملاحظات
 * @route PUT /api/overseer/requests/:id/reject
 * @method PUT
 * @access Private (Overseer only)
 */
module.exports.reject_request = asyncHandler(async (req, res) => {
    const { note } = req.body; // الملاحظة الجديدة من المشرف
    const requestId = req.params.id; // ID الطلب الموجود في InProcess
    const overseerId = req.user.id;

    // 1. التحقق من الصلاحية
    if (req.user.role !== 'overseer') {
        return res.status(403).json({ message: 'غير مسموح لك بالقيام بهذا الإجراء' });
    }

    // 2. العثور على الطلب في جدول InProcess لضمان المسؤولية
    const requestInProcess = await InProcess.findOne({ _id: requestId, overseer: overseerId });

    if (!requestInProcess) {
        return res.status(404).json({ message: 'الطلب غير موجود أو أنك لست المشرف المسؤول عنه' });
    }

    // 3. جلب الطلب الأصلي لتحديد كيفية تحديث more_details
    const targetId = requestInProcess.Requestion || requestId;
    const originalDoc = await TreatmentRequest.findById(targetId);

    if (!originalDoc) {
        return res.status(404).json({ message: 'فشل العثور على الطلب الأصلي لتحديثه' });
    }

    // تجهيز الملاحظة الجديدة
    const newNote = { 
        overseer: overseerId,
        note: note || "تم الرفض وإعادة المعالجة",
        rejectedAt: new Date()
    };

    let updateQuery;

    // فحص الحقل: إذا كان مصفوفة نستخدم $push، وإذا كان كائن نحوله لمصفوفة مع الحفاظ عليه
    if (Array.isArray(originalDoc.more_details)) {
        updateQuery = {
            $set: { status: 'pending' },
            $push: { more_details: newNote }
        };
    } else if (originalDoc.more_details && typeof originalDoc.more_details === 'object' && Object.keys(originalDoc.more_details).length > 0) {
        // إذا كان كائن (Object) قديم، ندمجه مع الملاحظة الجديدة في مصفوفة واحدة
        updateQuery = {
            $set: { 
                status: 'pending',
                more_details: [originalDoc.more_details, newNote] 
            }
        };
    } else {
        // إذا كان الحقل فارغاً تماماً
        updateQuery = {
            $set: { 
                status: 'pending',
                more_details: [newNote] 
            }
        };
    }

    const updatedTreatment = await TreatmentRequest.findByIdAndUpdate(
        targetId,
        updateQuery,
        { new: true }
    );

    // 4. حذف الطلب من جدول InProcess لأنه لم يعد "تحت المعالجة"
    await InProcess.findByIdAndDelete(requestId);

    res.status(200).json({
        status: 'success',
        message: 'تم رفض الطلب وإعادته لقائمة الانتظار بنجاح',
        data: updatedTreatment
    });
});
