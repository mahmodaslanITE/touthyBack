const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publisher_role: { // تعديل إلى snake_case
        type: String,
        enum: ['patient', 'student', 'overseer', 'admin'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    images: {
        type: [{
            url: {
                type: String,
                
            },
            publicId: {
                type: String,
                
            }
        }],
        default: []
    },
 
}, {
    timestamps: true
});

module.exports = mongoose.model('Pendin_post', postSchema);
