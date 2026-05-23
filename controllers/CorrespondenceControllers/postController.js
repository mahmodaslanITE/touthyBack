const asyncHandler=require('express-async-handler');
/**
 * @description add post 
 * @route api/post
 * @method post
 * @access private 
 */
module.exports.add_post=asyncHandler(async(req,res)=>{
    const publisher_id=req.user.id;
    const publisher_role=req.user.role;

})