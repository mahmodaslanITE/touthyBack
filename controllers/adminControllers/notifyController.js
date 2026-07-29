const asyncHandler=require('express-async-handler')
const socket = require('../../socket/init');
const { User } = require('../../models/User');
module.exports.notifyAll=asyncHandler(async(req,res)=>{
    const body=req.body.body||'empty'
    const title=req.body.title
    if(!req.user.isAdmin){
        return res.status(403).json({ status:'error',message:' انت لست ادمن '})
    }
    const io = socket.getIO();
    const users=await User.find();
    users.map((user)=>{
        if (io) {
            console.log(`the user id is ${user.id}`)
            io.to(user.id.toString()).emit('notify', {
                title:title,
                body:body
            });
        }
    })
    res.status(200).json({
        status:'success',
        message:' تم ابلاغ جميع المستخدمين '
    })
   
})