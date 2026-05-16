const asyncHandler = require('express-async-handler');
const InProcess = require('../../models/InProcess');

module.exports.adminUpdateInProcess = asyncHandler(async (req, res) => {
    // 1. التحقق من صلاحية المشرف
    if (!req.user.isAdmin) {
        return res.status(403).json({
            status: 'error',
            message: 'غير مصرح لك - هذا الروت للمشرفين فقط'
        });
    }

    // 2. البحث عن الحالة
    const request = await InProcess.findById(req.params.id);
    
    if (!request) {
        return res.status(404).json({
            status: 'error',
            message: 'الحالة غير موجودة'
        });
    }

    // 3. منع تعديل الحقول الممنوعة
    if (req.body.patient) {
        return res.status(400).json({
            status: 'error',
            message: 'لا يمكن تعديل حقل patient'
        });
    }
    
    if (req.body.student) {
        return res.status(400).json({
            status: 'error',
            message: 'لا يمكن تعديل حقل student'
        });
    }
    
    if (req.body.date_of_accepting) {
        return res.status(400).json({
            status: 'error',
            message: 'لا يمكن تعديل حقل date_of_accepting'
        });
    }

    // ✅ 4. تحديث الحقول داخل كائن Requestion
    if (req.body.pain_severity !== undefined) {
        request.Requestion.pain_severity = req.body.pain_severity;
    }
    
    if (req.body.pain_time !== undefined) {
        request.Requestion.pain_time = req.body.pain_time;
    }
    
    if (req.body.tooth_location !== undefined) {
        request.Requestion.tooth_location = req.body.tooth_location;
    }
    
    if (req.body.gender !== undefined) {
        request.Requestion.gender = req.body.gender;
    }
    
    if (req.body.age !== undefined) {
        request.Requestion.age = req.body.age;
    }
    
    if (req.body.notes !== undefined) {
        request.Requestion.notes = req.body.notes;
    }
    
    // 5. معالجة more_details داخل Requestion
    if (req.body.more_details !== undefined) {
        if (typeof req.body.more_details === 'string') {
            try {
                request.Requestion.more_details = JSON.parse(req.body.more_details);
            } catch (err) {
                return res.status(400).json({
                    status: 'error',
                    message: 'more_details يجب أن يكون JSON صحيح'
                });
            }
        } else {
            request.Requestion.more_details = req.body.more_details;
        }
    }
    
    // 6. تحديث الحقول الخارجية
    if (req.body.case_type !== undefined) {
        return res.status(403).json({
            status:'erroe',
            message:'لا يمكنك تعديل نوع المعالجة من هنا في كود جاهز لتعدل المعالجة لحالها '
        })
    }
    
    if (req.body.overseer !== undefined) {
        return res.status(403).json({
            status:'erroe',
message:'لا يمكن تعديل المشرف باستخدام هذا الروت يوجد روت خاص لتعديل المشرف '        })    }

    // 7. حفظ التعديلات
    await request.save();

    // 8. إرجاع النتيجة
    res.status(200).json({
        status: 'success',
        message: 'تم التعديل بنجاح',
        data: {
            _id: request._id,
            patient: request.patient,
            student: request.student,
            Requestion: request.Requestion,
            case_type: request.case_type,
            overseer: request.overseer,
            date_of_accepting: request.date_of_accepting
        }
    });
});