const { Category } = require("../../models/Category");
const Course = require("../../models/Course");
const { OverseerProfile } = require("../../models/Overseer_profile");
const { Practial_lesson } = require("../../models/Practical_lesson");

/** 
 * @description assign overseer on lesson 
 * @route PUT api/admin/overseer/assign 
 * @access private (only admin)
 */
module.exports.assign_overseer = asyncHandler(async (req, res) => {
    // 1. التحقق من الصلاحيات (يفضل أن يكون ذلك في Middleware منفصل)
    if (!req.user.isAdmin) {
        return res.status(403).json({ status: 'error', message: 'عذراً، هذه الصلاحية للمشرفين فقط' });
    }

    // 2. استقبال البيانات من req.body
    const { lessonId, overseerId } = req.body;

    // 3. البحث عن الحصة
    const lesson = await Practial_lesson.findById(lessonId);
    if (!lesson) {
        return res.status(404).json({ status: 'error', message: 'الحصة غير موجودة' });
    }

    // 4. التحقق من عدد المشرفين (أقصى حد 2)
    if (lesson.overseers.length >= 2) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'غير مسموح بتعيين أكثر من مشرفين على هذه المادة' 
        });
    }

    // 5. إضافة المشرف باستخدام push (مع التأكد من عدم تكراره إذا أردت)
    if (lesson.overseers.includes(overseerId)) {
        return res.status(400).json({ status: 'error', message: 'هذا المشرف معين بالفعل لهذه المادة' });
    }
    const course=await Course.findById(lesson.course);
    const overseer_profile= await OverseerProfile.findOne({user:overseerId});
    const category= await Category.findById(lesson.category)
    lesson.overseers.push(overseerId);
    await lesson.save();
console.log(overseer_profile)
const overseer_name=overseer_profile.first_name;
    res.status(200).json({ 
        status: 'success', 
        message:`تم تكليف المشرف ${overseer_name} ${overseer_profile.last_name} بالمادة ${course.course_name} للفئة ${category.category}`,
        data: lesson 
    });
});





