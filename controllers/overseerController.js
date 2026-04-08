const asyncHandler=require('express-async-handler');
const InProcess = require('../models/InProcess');
const Finished = require('../models/Finished');
const { TreatmentRequest } = require('../models/Requestion');
/**
 * @description view the request wich the overseer overlocks on it 
 * @route api/overseer/treatment
 * @method get
 * @access privte (only overseer)
 */
module.exports.show_overseer_requests_in_process = asyncHandler(async (req, res) => {

    if (req.user.role !== 'overseer') {
        return res.status(403).json({
            status: 'error',
            message: 'عذراً، هذه الصلاحية للمشرفين فقط'
        });
    }

    const requests = await InProcess.find({ overseer: req.user.id });

    res.status(200).json({
        status: 'success',
        message: 'تم جلب الطلبات قيد المعالجة بنجاح',
        results: requests.length, 
        data: requests
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

    // 3. تحديث الطلب الأصلي في جدول TreatmentRequests
    // ملاحظة: نفترض أن InProcess يحمل حقل originalRequestId أو نفس الـ ID
    const TreatmentRequest = require('../models/TreatmentRequest'); 
    
    const updatedTreatment = await TreatmentRequest.findByIdAndUpdate(
        requestInProcess.originalRequestId || requestId, 
        {
            $set: { status: 'pending' },
            $push: { 
                more_details: { 
                    overseer: overseerId,
                    note: note || "تم الرفض وإعادة المعالجة",
                    rejectedAt: new Date()
                } 
            }
        },
        { new: true }
    );

    if (!updatedTreatment) {
        return res.status(404).json({ message: 'فشل العثور على الطلب الأصلي لتحديثه' });
    }

    // 4. حذف الطلب من جدول InProcess لأنه لم يعد "تحت المعالجة"
    await InProcess.findByIdAndDelete(requestId);

    res.status(200).json({
        status: 'success',
        message: 'تم رفض الطلب وإعادته لقائمة الانتظار بنجاح',
        data: updatedTreatment
    });
});


