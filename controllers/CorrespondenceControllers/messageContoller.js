const asyncHandler=require('express-async-handler');
const Conversation = require('../../models/Correspondence/Conversation');
const Message = require('../../models/Correspondence/Message');
const socket = require('../../socket/init');

/**
 * @description send message 
 * @route api/message/:converersation
 * @method post 
 */
module.exports.send_message=asyncHandler(async(req,res)=>{
    const userId=req.user.id;
    const conversationId=req.params.id
    if(!userId){
        return res.status(301).json({
            status:'error',
            message:'يلزم تسجيل الدخول أولا '
        })
    }
    if(!req.body.text&&!req.file){
        return res.status(400).json({status:'error',message:'لا يمكن ارسال رسالة فارغة '})
    }
    const conversation=await Conversation.findById(conversationId);
    if(!conversation){
        return res.status(400).json({status:'error',message:'هذه المحادثة لم تعد موجودة او تم حذفها '})
    }
    const participants=conversation.participants;
    if(!participants.includes(userId)){
        return res.status(403).json({
            status:'error',
            message:'انت لست طرفا في هذه المحادثة من الاساس تم كشف محاولة الاختراق '
        })
    }
    const otherPartyId = conversation.participants.find(id => id.toString() !== userId.toString());
  
//  التحقق من وجود صورة 
let content;
let message_type;
if(req.file){
content=`images/conversation/${req.file.filename}`;
message_type='file'
}
else{ 
    content=req.body.text;
    message_type="text"
}
const newMessage=await Message.create({
    conversationId:conversationId,
    content:content,
    message_type:message_type,
    sender:userId
})
console.log(`the other party is ${otherPartyId}`)
const io = socket.getIO();
console.log(`the io is ${io}`)
if (io) {
  io.to(otherPartyId.toString()).emit('send_message', {
    message: `وصلتك رسالة من احدى المحادثات `,
    content:req.body
  });
 
}
res.status(201).json({
    status:'success',
    message:'تم ارسال الرسالة بنجاح ',
    data:newMessage

})
})