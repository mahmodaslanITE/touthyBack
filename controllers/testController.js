const Treatment = require("../models/Treatment");
const asyncHandler=require('express-async-handler')
const socket = require('../socket/init');
const Student_profile = require("../models/Student_profile");
const { Practial_lesson } = require("../models/Practical_lesson");

/**
  * @desc rejected with option new caseType
  * @route /api/overseer/requests/reject/:id/:option
  * @method put 
  * @access private (only overseer )
  */
module.exports.reject_request_with_option_testone = asyncHandler(async (req, res) => {
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

  const patient=originalDoc.user
console.log(`the ptient is ${patient}`)
    const io = socket.getIO();
    if (io) {
      io.to('69a696ea8b36cdbf5ebc8386').emit('updatecasetype', {
        message: `تم رفض حالتك من المعالجة في الكلية للسبب التالي `,
        note
      });
      io.to(requestInProcess.student).emit('updatecasetype',{
        message: `تم رفض حالتك من المعالجة في الكلية للسبب التالي `,
        note
      })
    }
    res.status(200).json({
        status: 'success',
        message: 'تم رفض الطلب ورفض اقتراح حالة جديدة له لأن الأفندي حاجز حالة تانيو من نفس النوع الي حضرتك اقترحتو ف ريح حالك نم رفض الطلب نهائيا  وإعادته لقائمة الانتظار بنجاح',
        
    });} 
    
    
    else {
        // 1. تنظيف الـ option من أي مسافات أو أسطر زائدة
        const cleanOption = req.params.option.trim(); 
    
        const the_new_request = await InProcess.findById(requestId);
        

   

        const the_request_in_treatmentRequest=await TreatmentRequest.findById(the_new_request.Requestion);
       
    
        // 3. واستخدامها هنا أيضاً للبحث في موديل Treatment
        const treatment = await Treatment.findById(cleanOption);
        
        if (!treatment) {
            return res.status(404).json({ message: 'نوع الحالة (option) غير موجود' });
        }
        const originalDoc = await TreatmentRequest.findById(the_new_request.Requestion);

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
console.log(`io =   ${io}`)
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
