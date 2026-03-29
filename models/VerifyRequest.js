const Joi = require('joi');
const mongoose = require('mongoose');
const verify_request_schema=mongoose.Schema({
    document:{
        type:String,
        required:true
    },
    student_profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student_profile', // الربط بملف الطالب وليس اليوزر
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // الربط بملف الطالب وليس اليوزر
        required: true
    },
}, { timestamps: true })
const Verify_request = mongoose.model('Verify_request', verify_request_schema);

const validateVerifyRequest=(data)=>{
    const schema=Joi.object({
        document:Joi.required()
    })
    return schema.validate(data)
}

module.exports={Verify_request,validateVerifyRequest}
