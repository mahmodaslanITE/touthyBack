const asyncHandler=require('express-async-handler');
const { Practial_lesson } = require('../../models/Practical_lesson');

/**
 * @description get all practial lesson 
 * @route api/admin/practical-lessons
 * @method get 
 * @access private (only admin )
 */
module.exports.get_all_lessons=asyncHandler(async(req,res)=>{
    const isAdmin=req.user.isAdmin;
    if(!isAdmin){return res.status(403).json({
        status:'error',
        message:'غير مصرح لك برؤيتها      فقط الادمن '
    })}
    const data=await Practial_lesson.find().populate({path:'course',select:'course_name'});
    res.status(200).json({
        status:'success',
        message:' هذه جميع الدروس العملية التي تم تسجيلها لدينا ',
        data
    })
})