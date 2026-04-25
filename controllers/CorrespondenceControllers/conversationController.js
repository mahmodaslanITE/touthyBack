const asyncHandler = require('express-async-handler');
const Conversation = require('../../models/Correspondence/Conversation');
const Message = require('../../models/Correspondence/Message');
const Student_profile = require('../../models/Student_profile');

// Route: post /api/conversations/:receiverId
exports.open_conversation = asyncHandler(async (req, res) => {
    const senderId = req.user.id; // القادم من الـ middleware (verifyToken)
    const receiverId = req.params.receiverId; // القادم من الرابط

    // 1. البحث عن محادثة بين الطرفين
    let conversation = await Conversation.findOne({ 
        participants: { $all: [senderId, receiverId] } 
    });

    // 2. إذا لم توجد محادثة، قم بإنشاء واحدة جديدة
    if (!conversation) {
        conversation = await Conversation.create({ 
            participants: [senderId, receiverId] 
        });
        return res.status(201).json({ 
            status:'success',
            message: "هذه المحادثة فارغة", 
            conversationId: conversation._id, 
            messages: [] 
        });
    }

    // 3. إذا وجدت، اجلب الرسائل المرتبطة بها
    const messages = await Message.find({ 
        conversationId: conversation._id 
    }).sort({ createdAt: 1 });

    // 4. إرجاع الرسائل أو تنبيه بأنها فارغة
    if (messages.length === 0) {
        return res.status(200).json({ 
            status:'success',
            message: "هذه المحادثة فارغة", 
            conversationId: conversation._id, 
            messages: [] 
        });
    }

    // 5. إرسال المحادثة والرسائل بنجاح
    res.status(200).json({ 
        status:'success',
        conversationId: conversation._id, 
        messages: messages 
    });
});



exports.get_user_conversations = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const conversations = await Conversation.find({
        participants: { $in: [userId] }
    }).sort({ updatedAt: -1 });

    const formattedConversations = await Promise.all(conversations.map(async (conv) => {
        // الإصلاح الجوهري: تحويل الـ ID إلى String للمقارنة الصحيحة
        const otherPartyId = conv.participants.find(id => id.toString() !== userId.toString());

        const otherPartyProfile = await Student_profile.findOne({ user: otherPartyId })
            .select('user first_name father_name last_name profile_photo');

        return {
            conversationId: conv._id,
            otherParty: otherPartyProfile ? {
                userId: otherPartyProfile.user,
                full_name: `${otherPartyProfile.first_name} ${otherPartyProfile.father_name} ${otherPartyProfile.last_name}`,
                profile_photo: otherPartyProfile.profile_photo
            } : { userId: otherPartyId, info: "Profile not found" },
            updatedAt: conv.updatedAt
        };
    }));

    res.status(200).json(formattedConversations);
});
