const asyncHandler = require('express-async-handler');
const Conversation = require('../../models/Correspondence/Conversation');
const Message = require('../../models/Correspondence/Message');
const Student_profile = require('../../models/Student_profile');
const {User}=require('../../models/User');
const Patient_profil=require('../../models/Patient_profile')
const {OverseerProfile}=require('../../models/Overseer_profile')
/**
 * @description open  conversations
 * @route : post /api/conversations/:receiverId
 */
exports.open_conversation = asyncHandler(async (req, res) => {
    const senderId = req.user.id; // القادم من الـ middleware (verifyToken)
    const receiverId = req.params.receiverId; // القادم من الرابط

    const user=await User.findById(receiverId);
    if(!user){
        return res.status(400).json({
            status:"error",
            messages:'هذا الايدي ليس لشخص كي تفتح معه محادثة '
        })
    }
    // 1. البحث عن محادثة بين الطرفين
    let conversation = await Conversation.findOne({ 
        participants: { $all: [senderId, receiverId] } 
    });
    const userOtherParty=await User.findById(receiverId);
    const role=userOtherParty.role;
    let otherPartyProfile
    if(role==='student'){
     otherPartyProfile = await Student_profile.findOne({ user:receiverId })
        .select('user first_name father_name last_name profile_photo');
    }
    else if(role==='patient'){
        otherPartyProfile = await Patient_profil.findOne({ user: receiverId })
        .select('user first_name father_name last_name profile_photo');
    }
    else if(role==='overseer'){
        otherPartyProfile = await OverseerProfile.findOne({ user: receiverId })
        .select('user first_name father_name last_name profile_photo');}
       const  otherPartyProfile_formate={
             userId:req.params.receiverId,
            full_name:` ${otherPartyProfile.first_name} ${otherPartyProfile.father_name} ${otherPartyProfile.last_name}`
        ,profile_photo:otherPartyProfile.profile_photo,
        role:role
        }
        // 2. إذا لم توجد محادثة، قم بإنشاء واحدة جديدة
    if (!conversation) {
        conversation = await Conversation.create({ 
            participants: [senderId, receiverId] 
        });
        return res.status(201).json({ 
            status:'success',
            message: "هذه المحادثة فارغة", 
            data:{otherPartyProfile:otherPartyProfile_formate,
            conversationId: conversation._id, 
            messages: [] }
        });
    }

    // 3. إذا وجدت، اجلب الرسائل المرتبطة بها
    let messages = await Message.find({ 
        conversationId: conversation._id 
    }).select('-conversationId').sort({ createdAt: 1 });

    // 4. إرجاع الرسائل أو تنبيه بأنها فارغة
    if (messages.length === 0) {
        return res.status(200).json({ 
            status:'success',
            message: "هذه المحادثة فارغة", 
           data:{ otherPartyProfile:otherPartyProfile_formate,
            conversationId: conversation._id, 
            messages: [] }
        });
    }
 messages=messages.map((message)=>{
   return {_id:message.id,
    conversationId: message.conversationId,
    sender: message.sender,
    content: message.content,
    message_type: message.message_type,
    isRead: message.isRead,
    createdAt: message.createdAt,
    is_from_me:(message.sender==senderId)?true:false
}
})
    // 5. إرسال المحادثة والرسائل بنجاح
    res.status(200).json({ 
        status:'success',
        messages:'هذه هي محادثتك',
    data:{
        conversationId: conversation._id, 
        otherPartyProfile:otherPartyProfile_formate,
         messages}
    });
});

/**
 * @description get user   conversations
 * @get : post /api/conversations
 */

exports.get_user_conversations = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const conversations = await Conversation.find({
        participants: { $in: [userId] }
    }).sort({ updatedAt: -1 });

    

    const formattedConversations = await Promise.all(conversations.map(async (conv) => {
        // الإصلاح الجوهري: تحويل الـ ID إلى String للمقارنة الصحيحة
        const otherPartyId = conv.participants.find(id => id.toString() !== userId.toString());
        const userOtherParty=await User.findOne({_id:otherPartyId})
        const role=userOtherParty.role;
        let otherPartyProfile
        if(role==='student'){
         otherPartyProfile = await Student_profile.findOne({ user: otherPartyId })
            .select('user first_name father_name last_name profile_photo');
        }
        else if(role==='patient'){
            otherPartyProfile = await Patient_profil.findOne({ user: otherPartyId })
            .select('user first_name father_name last_name profile_photo');
        }
        else if(role==='overseer'){
            otherPartyProfile = await OverseerProfile.findOne({ user: otherPartyId })
            .select('user first_name father_name last_name profile_photo');
        }
        return {
            conversationId: conv._id,
            last_message:conv.last_message,
            otherPartyProfile: otherPartyProfile ? {
                userId: otherPartyProfile.user,
                full_name: `${otherPartyProfile.first_name} ${otherPartyProfile.father_name} ${otherPartyProfile.last_name}`,
                profile_photo: otherPartyProfile.profile_photo,
                role:role,
            } : { userId: otherPartyId, info: "Profile not found" },            
            
            updatedAt: conv.updatedAt
        };
    }));

    res.status(200).json({status:' success',message:'this is your convrsation',data:formattedConversations});
});



