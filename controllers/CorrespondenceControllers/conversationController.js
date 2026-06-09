const asyncHandler = require('express-async-handler');
const Conversation = require('../../models/Correspondence/Conversation');
const Message = require('../../models/Correspondence/Message');
const Student_profile = require('../../models/Student_profile');
const { User } = require('../../models/User');
const Patient_profil = require('../../models/Patient_profile');
const { OverseerProfile } = require('../../models/Overseer_profile');
const getUserProfile = require('../../utils/users');

/**
 * دالة مساعدة لجلب ملف المستخدم الشخصي بناءً على دوره
 * @param {string} userId - معرف المستخدم
 * @param {string} role - دور المستخدم (student, patient, overseer)
 * @returns {Promise<Object|null>} - ملف المستخدم الشخصي
 */

/**
 * دالة مساعدة لتنسيق بيانات الطرف الآخر
 */
const formatOtherPartyProfile = (profile, userId, role) => {
    if (!profile) return null;
    
    return {
        userId: userId,
        full_name: `${profile.first_name} ${profile.father_name} ${profile.last_name}`.trim(),
        profile_photo: profile.profile_photo,
        role: role,
        
    };
};

/**
 * دالة مساعدة لتنسيق الرسائل
 */
const formatMessages = (messages, currentUserId) => {
    return messages.map(message => ({
        _id: message._id,
        conversationId: message.conversationId,
        sender: message.sender,
        content: message.content,
        message_type: message.message_type,
        isRead: message.isRead,
        createdAt: message.createdAt,
        is_from_me: message.sender.toString() === currentUserId
    }));
};

/**
 * @description فتح محادثة جديدة أو استرجاع محادثة موجودة
 * @route POST /api/conversations/:receiverId
 */
exports.open_conversation = asyncHandler(async (req, res) => {
    const senderId = req.user.id;
    const receiverId = req.params.receiverId;

    if (senderId === receiverId) {
        return res.status(400).json({
            status: "error",
            message: 'لا يمكنك فتح محادثة مع نفسك'
        });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
        return res.status(404).json({
            status: "error",
            message: 'المستخدم غير موجود'
        });
    }
    // جلب ملف المستخدم الشخصي للطرف الآخر
    const receiverProfile = await getUserProfile(receiverId, receiver.role);
    if (!receiverProfile) {
        return res.status(404).json({
            status: "error",
            message: 'بيانات المستخدم غير مكتملة'
        });
    }

    const otherPartyProfile = formatOtherPartyProfile(receiverProfile, receiverId, receiver.role);

    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] }
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [senderId, receiverId]
        });

        return res.status(201).json({
            status: 'success',
            message: "تم إنشاء محادثة جديدة",
            data: {
                otherPartyProfile: otherPartyProfile,
                conversationId: conversation._id,
                messages: []
            }
        });
    }

    const messages = await Message.find({
        conversationId: conversation._id
    }).select('-conversationId').sort({ createdAt: 1 });

    const formattedMessages = formatMessages(messages, senderId);

    res.status(200).json({
        status: 'success',
        message: messages.length ? "تم جلب المحادثة بنجاح" : "المحادثة فارغة",
        data: {
            conversationId: conversation._id,
            otherPartyProfile: otherPartyProfile,
            count: formattedMessages.length,
            messages: formattedMessages
        }
    });
});

/**
 * @description جلب جميع محادثات المستخدم
 * @route GET /api/conversations
 */
exports.get_user_conversations = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // جلب جميع محادثات المستخدم
    const conversations = await Conversation.find({
        participants: { $in: [userId] }
    }).sort({ updatedAt: -1 });

    if (conversations.length === 0) {
        return res.status(200).json({
            status: 'success',
            message: 'لا توجد محادثات بعد',
            data: []
        });
    }

    // تجميع معرفات الأطراف الأخرى
    const otherPartiesIds = conversations.map(conv => 
        conv.participants.find(id => id.toString() !== userId.toString())
    );

    // جلب بيانات المستخدمين للأطراف الأخرى دفعة واحدة
    const otherUsers = await User.find({ _id: { $in: otherPartiesIds } });
    const usersMap = new Map(otherUsers.map(user => [user._id.toString(), user]));

    // تجميع الملفات الشخصية حسب الدور
    const profilesPromises = otherPartiesIds.map(async (otherId) => {
        const user = usersMap.get(otherId.toString());
        if (!user) return { otherId, profile: null, role: null };
        
        const profile = await getUserProfile(otherId, user.role);
        return { otherId, profile, role: user.role };
    });

    const profilesResults = await Promise.all(profilesPromises);
    const profilesMap = new Map(profilesResults.map(result => [result.otherId.toString(), result]));

    // تنسيق المحادثات
    const formattedConversations = conversations.map(conv => {
        const otherPartyId = conv.participants.find(id => id.toString() !== userId.toString());
        const otherData = profilesMap.get(otherPartyId.toString());
        
        let otherPartyProfile = null;
        if (otherData && otherData.profile) {
            otherPartyProfile = formatOtherPartyProfile(otherData.profile, otherPartyId, otherData.role);
        }

        return {
            conversationId: conv._id,
            last_message: conv.last_message || null,
            otherPartyProfile: otherPartyProfile,
            updatedAt: conv.updatedAt
        };
    });

    res.status(200).json({
        status: 'success',
        message: 'تم جلب محادثاتك بنجاح',

        data: formattedConversations
    });
});