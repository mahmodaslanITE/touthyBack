const asyncHandler=require('express-async-handler');
const InProcess = require('../models/InProcess');
const Finished = require('../models/Finished');
const Patient_profil = require('../models/Patient_profile');
const Student_profile = require('../models/Student_profile');
const { TreatmentRequest } = require('../models/Requestion');
const Treatment = require('../models/Treatment');
/**
 * @description view the request wich the overseer overlocks on it 
 * @route api/overseer/treatment
 * @method get
 * @access privte (only overseer)
 */
module.exports.show_overseer_requests_in_process = asyncHandler(async (req, res) => {
    const user = req.user;
  
    const requests = await InProcess.find({ overseer: user.id })
    .select('-overseer -__v') 
    .populate({
        path: 'Requestion',
        // حذفنا -_id من هنا لإظهار ID الـ Requestion نفسه
        select: 'pain_severity pain_time tooth_location gender is_pregnant age photo case_type more_details',
        populate: {
            path: 'case_type',
            // حذفنا -_id لإظهار ID نوع المعالجة
            select: 'case_type course', 
            populate: { 
                path: 'course', 
                select: 'course_name', // سيظهر الـ ID تلقائياً هنا أيضاً
            }
        }
    })
    .populate({
        path: 'patient',
        model: 'Patient_profil',
        foreignField: 'user',
        localField: 'patient',
        select: '-_id first_name father_name last_name'
    })
    .populate({
        path: 'student',
        model: 'Student_profile',
        foreignField: 'user',
        localField: 'student',
        select: '-_id first_name father_name last_name'
    })
    .lean();

// إعادة هيكلة البيانات مع الحفاظ على الـ IDs
const formattedRequests = requests.map(req => {
    const requestionData = req.Requestion || {};
    const caseTypeData = requestionData.case_type || {};
    const courseData = caseTypeData.course || {};

    return {
        ...req,
        // إظهار المعلومات بشكل منفصل مع الـ IDs الخاصة بها
        // case_type_id: caseTypeData._id || null,
        case_type_title: caseTypeData.case_type || null,
        course_id: courseData._id || null,
        course_name: courseData.course_name || null,
        
        // تنظيف الكائن من التداخل القديم
        Requestion: {
            ...requestionData,
            case_type: undefined 
        }
    };
});

res.status(200).json({ 
    status: 'success', 
    message: 'هذه  هي الطلبات التي انت مسؤول عن الاشراف عنها', 
    data: formattedRequests 
});});


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
 * @description رفض الطلب رفض نهائي 
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
    const targetId = requestInProcess.Requestion ;
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
    originalDoc.status='rejected',
    originalDoc.overseer_note=newNote
    await originalDoc.save();


    // 4. حذف الطلب من جدول InProcess لأنه لم يعد "تحت المعالجة"
    await InProcess.findByIdAndDelete(requestId);

    res.status(200).json({
        status: 'success',
        message: 'تم رفض الطلب وإعادته لقائمة الانتظار بنجاح',
        
    });
});


 /**
  * @desc rejected with option new caseType
  * @route /api/overseer/requests/reject/:id/:option
  * @method put 
  * @access private (only overseer )
  */
 module.exports.reject_request_with_option = asyncHandler(async (req, res) => {
    const  note  = req.body.note; // الملاحظة الجديدة من المشرف
    const requestId = req.params.id; // ID الطلب الموجود في InProcess
    const overseerId = req.user.id;
console.log(`the note is ${note}`)
    // 1. التحقق من الصلاحية
    if (req.user.role !== 'overseer') {
        return res.status(403).json({ message: 'غير مسموح لك بالقيام بهذا الإجراء' });
    }

    // 2. العثور على الطلب في جدول InProcess لضمان المسؤولية
    const requestInProcess = await InProcess.findOne({ _id: requestId, overseer: overseerId });

    if (!requestInProcess) {
        return res.status(404).json({ message: 'الطلب غير موجود أو أنك لست المشرف المسؤول عنه' });
    }

    /**
     * 
     * 
     */
    // the addes to get opton and change the treatmnt 
    const request_in_process=await InProcess.findOne({case_type:req.params.option,student:requestInProcess.student}
    )

    console.log(request_in_process)
    if(request_in_process){
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
    originalDoc.status='rejected',
    originalDoc.overseer_note=newNote,
    await originalDoc.save();
    // 4. حذف الطلب من جدول InProcess لأنه لم يعد "تحت المعالجة"
    await InProcess.findByIdAndDelete(requestId);

    res.status(200).json({
        status: 'success',
        message: 'تم رفض الطلب ورفض اقتراح حالة جديدة له لأن الأفندي حاجز حالة تانيو من نفس النوع الي حضرتك اقترحتو ف ريح حالك نم رفض الطلب نهائيا  وإعادته لقائمة الانتظار بنجاح',
        
    });} 
    
    
    else {
        // 1. تنظيف الـ option من أي مسافات أو أسطر زائدة
        const cleanOption = req.params.option.trim(); 
    
        const the_new_request = await InProcess.findById(requestId);
        
        // 2. استخدام القيمة المنظفة هنا
        the_new_request.case_type = cleanOption; 
        the_new_request.overseer = null; 
        await the_new_request.save();
        // تجهيز الملاحظة الجديدة
    const newNote = { 
        overseer: overseerId,
        note: note || "تم الرفض وإعادة المعالجة",
        rejectedAt: new Date()
    };

        const the_request_in_treatmentRequest=await TreatmentRequest.findById(the_new_request.Requestion);
        the_request_in_treatmentRequest.case_type=cleanOption
        the_request_in_treatmentRequest.overseer_note=newNote
        await the_request_in_treatmentRequest.save();
    
        // 3. واستخدامها هنا أيضاً للبحث في موديل Treatment
        const treatment = await Treatment.findById(cleanOption);
        
        if (!treatment) {
            return res.status(404).json({ message: 'نوع الحالة (option) غير موجود' });
        }
    
        const case_type = treatment.case_type;
        res.status(200).json({ 
            status: 'success', 
            message: `تم تغيير الحالة الى ${case_type} يتوجب من الطالب تعيين مشرف جديد لحالته` 
        });
    }
    
});


/** 
 * @desc إضافة تقييم مرحلي للطلب
 * @route /api/overseer/add-evaluation/:id
 * @method post
 * @access private (Overseer only)
 */
module.exports.add_stage_evaluation = asyncHandler(async (req, res) => {
    const requestId = req.params.id; // ID الطلب في InProcess
    const  evaluationText  = req.body.evaluationText;
    const overseerId = req.user.id;

    if (!evaluationText) {
        return res.status(400).json({ message: "يرجى كتابة نص التقييم" });
    }

    // 1. العثور على الطلب والتأكد أن هذا المشرف هو المسؤول عنه
    const requestInProcess = await InProcess.findOne({ _id: requestId, overseer: overseerId });

    if (!requestInProcess) {
        return res.status(404).json({ message: "الطلب غير موجود أو أنك لست المشرف المسؤول عنه" });
    }

    // 2. تجهيز كائن التقييم الجديد
    const newEvaluation = {
        text: evaluationText,
        date: new Date()
    };

    // 3. الإضافة إلى المصفوفة في جدول InProcess
    requestInProcess.stage_evaluations.push(newEvaluation);
    await requestInProcess.save();

    // 4. (مهم) تحديث الجدول الأصلي TreatmentRequest لضمان مزامنة البيانات
    if (requestInProcess.Requestion) {
        await TreatmentRequest.findByIdAndUpdate(requestInProcess.Requestion, {
            $push: { stage_evaluations: newEvaluation }
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'تم إضافة التقييم المرحلي بنجاح',
        data: requestInProcess.stage_evaluations
    });
});

