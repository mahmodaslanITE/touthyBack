const { User } = require("../models/User");
const getUserProfile = require("./users");

function formateImageUrl(image){
     image=`${process.env.BASE_URL}/${image}`
    return image
}

async function formatPost  (post, reqUserId)  {
    try {
        // ✅ تحويل post إلى كائن عادي باستخدام toObject
        const postObj = post.toObject ? post.toObject() : post;
        
        const formattedImages = postObj.images?.map(img => ({
            url: `${process.env.BASE_URL}/${img.url}`,
            publicId: img.publicId,
            _id: img._id
        }
    )) || [];

        if (!postObj.publisher) {
            return {
                _id: postObj._id,
                content: postObj.content,
                is_for_me: false,
                images: formattedImages,
                count_likes: postObj.count_likes || 0,
                count_dislikes: postObj.count_dislikes || 0,
                count_comments: postObj.count_comments || 0,
                created_at: postObj.createdAt,
                publisher_role: postObj.publisher_role,
                publisher: {
                    _id: null,
                    full_name: 'ناشر محذوف',
                    profile_photo: null,
                    gender: null,
                    is_verified: false
                }
            };
        }

        const publisher = await User.findById(postObj.publisher);
        
        if (!publisher) {
            return {
                _id: postObj._id,
                content: postObj.content,
                is_for_me: false,
                images: formattedImages,
                count_likes: postObj.count_likes || 0,
                count_dislikes: postObj.count_dislikes || 0,
                count_comments: postObj.count_comments || 0,
                created_at: postObj.createdAt,
                publisher_role: postObj.publisher_role,
                publisher: {
                    _id: postObj.publisher,
                    full_name: 'مستخدم غير موجود',
                    profile_photo: null,
                    gender: null,
                    is_verified: false
                }
            };
        }

        const publisherProfile = await getUserProfile(postObj.publisher, publisher.role);
        const isForMe = postObj.publisher.toString() === reqUserId;

        return {
            _id: postObj._id,
            content: postObj.content,
            is_for_me: isForMe,
            images: formattedImages,
            count_likes: postObj.count_likes || 0,
            count_dislikes: postObj.count_dislikes || 0,
            count_comments: postObj.count_comments || 0,
            created_at: postObj.createdAt,
            publisher_role: postObj.publisher_role,
            publisher: {
                _id: postObj.publisher,
                full_name: publisherProfile ? 
                    `${publisherProfile.first_name} ${publisherProfile.father_name} ${publisherProfile.last_name}` : 
                    publisher.email || 'مستخدم',
                profile_photo: publisherProfile?.profile_photo ? 
                    `${process.env.BASE_URL}/${publisherProfile.profile_photo.url}` : null,
                gender: publisherProfile?.gender || null,
                is_verified: publisherProfile?.is_verified || false
            }
        };
    } catch (error) {
        console.error('Error in formatPost:', error.message);
        return {
            _id: post._id,
            content: post.content,
            is_for_me: false,
            images: post.images || [],
            count_likes: post.count_likes || 0,
            count_dislikes: post.count_dislikes || 0,
            count_comments: post.count_comments || 0,
            created_at: post.createdAt,
            publisher_role: post.publisher_role,
            publisher: {
                _id: null,
                full_name: 'خطأ في جلب البيانات',
                profile_photo: null,
                gender: null,
                is_verified: false
            }
        };
    }
};
module.exports={formateImageUrl,formatPost}