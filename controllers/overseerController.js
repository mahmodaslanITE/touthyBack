const asyncHandler=require('express-async-handler');
const InProcess = require('../models/InProcess');
const Finished = require('../models/Finished');
const Student_profile = require('../models/Student_profile');
const { Pending_request } = require('../models/Pending');
const Treatment = require('../models/Treatment');
const socket = require('../socket/init');
const { Practial_lesson } = require('../models/Practical_lesson');
const Rejected = require('../models/Rejected');

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
            path: 'case_type',
            model: 'Treatment',
            populate: {
                path: 'course',
                model: 'Course',
                select: 'course_name'
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

    // إعادة هيكلة البيانات لفصل الكائنات
    const formattedRequests = requests.map(doc => {
        const item = { ...doc };

        if (item.case_type) {
            // 1. فصل معلومات الكورس
            item.course_info = item.case_type.course || null;

            // 2. فصل معلومات الحالة (بدون تداخل الكورس داخلها)
            item.case_type = {
                _id: item.case_type._id,
                case_type: item.case_type.case_type
            };

            // 3. حذف الحقل الأصلي المتداخل
            // delete item.case_type;
        }

        return item;
    });

    res.status(200).json({
        status: 'success',
        message: 'هذه هي الطلبات التي انت مسؤول عن الاشراف عنها',
        data: formattedRequests
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
        patient:requestInProcess.patient,
        overseer:req.user.id,
        Requestion:requestInProcess.Requestion,
        student:requestInProcess.student, 
        case_type:requestInProcess.case_type,
        _id: undefined,           
        rating: rating,           
        feedback: feedback,      
        completedAt: Date.now()   
    });



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
    const {note} = req.body; // استلام التقييم والملاحظات من الـ Body
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
    if (!note) {
        return res.status(400).json({ message: `يرجى ذكر سبب الرفض `});
    }

    // 4. نقل البيانات لجدول المعالجات المنتهية (نفترض وجود Model باسم Finished)
    const rejectedRequest = await Rejected.create({
        patient:requestInProcess.patient,
        overseer:req.user.id,
        Requestion:requestInProcess.Requestion,
        student:requestInProcess.student, 
        case_type:requestInProcess.case_type,
        note    :note,
        _id: undefined,           
        completedAt: Date.now()   
    });



    // 5. حذف الطلب من جدول "تحت المعالجة"
    await InProcess.findByIdAndDelete(requestId);

    
const patient=requestInProcess.patient.toString();
const studentID=requestInProcess.student.toString()
    const io = socket.getIO();
    if (io) {
      io.to(patient).emit('request_rejected', {
        message: `تم رفض حالتك من المعالجة في الكلية للسبب التالي `,
        note
      });
      io.to(studentID).emit('request_rejected',{
        message: `تم رفض حالتك من المعالجة في الكلية للسبب التالي `,
        note
      })
    }
    res.status(200).json({
        status: 'success',
        message: 'تم رفض الحالة ونقلها للأرشيف ',
        data: rejectedRequest
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

    console.log(`the request in process ${request_in_process}`)

    //the first 
    if(request_in_process){
        const rejectedRequest = await Pending_request.create({
        user:requestInProcess.patient,
        ...requestInProcess.Requestion,
        case_type:requestInProcess.case_type,
        completedAt: Date.now()   
    });



    // 5. حذف الطلب من جدول "تحت المعالجة"
    await InProcess.findByIdAndDelete(requestId);

    
const patient=requestInProcess.patient.toString();
const studentID=requestInProcess.student.toString()
    const io = socket.getIO();
    if (io) {
      io.to(patient).emit('request_rejected', {
        message: `تم رفض حالتك من المعالجة في الكلية للسبب التالي `,
        note
      });
      io.to(studentID).emit('request_rejected',{
        message: `تم رفض حالتك من المعالجة في الكلية للسبب التالي `,
        note
      })
    
    res.status(200).json({
        status: 'success',
        message: 'تم رفض الحالة واعادتها الى رتل الانتظار ورفض اقتراحك بتغيير الحالة ',
        data: rejectedRequest
    });
}}
    

//the last
    else {
        // 1. تنظيف الـ option من أي مسافات أو أسطر زائدة
        const cleanOption = req.params.option.trim(); 
    
        const the_new_request = await InProcess.findById(requestId);
        
        // 2. استخدام القيمة المنظفة هنا
        the_new_request.case_type = cleanOption; 
        the_new_request.overseer = null; 
        await the_new_request.save();
        // تجهيز الملاحظة الجديدة


        
        // 3. واستخدامها هنا أيضاً للبحث في موديل Treatment
        const treatment = await Treatment.findById(cleanOption);
        
        if (!treatment) {
            return res.status(404).json({ message: 'نوع الحالة (option) غير موجود' });
        }
        const originalDoc = the_new_request.Requestion;

        if (!originalDoc) {
            return res.status(404).json({ message: 'فشل العثور على الطلب الأصلي لتحديثه' });
        }
        const case_type = treatment.case_type;
        const io = socket.getIO();
        const student= await Student_profile.findOne({user:requestInProcess.student})
        console.log(`the student is ${student.category}`)
        const course=treatment.course;
        const lesson=await Practial_lesson.findOne({course:course,category:student.category})
        console.log(`the lesson is ${lesson}`)
        const patient=originalDoc.user.toString()
        const studentID=requestInProcess.student.toString();
        console.log(`the student is ${studentID}`)
        console.log(`the ptient is ${patient}`)
        if (io) {
          io.to(patient).emit('updatecasetype', {
            message: ` ${lesson.time }تم تغيير موعد معالجتك الى موعد اخر  في القاعة ${lesson.hall}`,
            time:lesson.time,
            location:lesson.hall
            
          });

          io.to(studentID).emit('updatecasetype',{
            message: `${ case_type}تم تغيير نوع المعالجة الى معالجة اخرى لذلك يتوجب عليك تعيين مشرف جديد لحالتك`,
            treatment
          })
        }
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

    // 4. (مهم) تحديث الجدول الأصلي Pending_request لضمان مزامنة البيانات
    if (requestInProcess.Requestion) {
        await Pending_request.findByIdAndUpdate(requestInProcess.Requestion, {
            $push: { stage_evaluations: newEvaluation }
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'تم إضافة التقييم المرحلي بنجاح',
        data: requestInProcess.stage_evaluations
    });
});

