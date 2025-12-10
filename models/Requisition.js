const mongoose = require('mongoose');
const Joi=require('joi')
const TreatmentRequestSchema = new mongoose.Schema(
  {
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    pain_severity: {
      type: Number,
      min: 0,
      max: 10,
      required: true
    },
    pain_time: {
      type: String,
      required: true
    },
    tooth_location: {
      type: String,
      maxlength: 50,
      required: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'unknown'],
      required: true
    },
    is_regnant: {
      type: Boolean,
    },
    photo: {
        type: Object,
        default: {
          publicId: null,
          url: 'https://www.bing.com/th/id/OIP.PKlD9uuBX0m4S8cViqXZHAHaHa?w=195&h=211&c=8&rs=1&qlt=90&o=6&cb=12&pid=3.1&rm=2'
        }
      } ,
    status: {
      type: String,
      enum: ['pending', 'processing'],
    },
    case_type: {
      type: String,
      maxlength: 100,
      required: true
    },
    notes: {
      type: String,
      maxlength: 1000
    }
  },
  { timestamps: true }
);
const validateTreatmentRequest = (data) => {
    const schema = Joi.object({
      pain_severity: Joi.number().integer().min(0).max(10).required(),
      pain_time: Joi.string().required(),
      tooth_location: Joi.string().max(50).required(),
      gender: Joi.string().valid('male', 'female', 'unknown').required(),
      is_regnant: Joi.boolean().when('gender', {
        is: 'female',
        then: Joi.required().messages({
          'any.required': 'حقل الحمل مطلوب إذا كان الجنس أنثى'
        }),
        otherwise: Joi.optional()
      }),
      caseImageUrl: Joi.string().uri().optional(),
      status: Joi.string().valid('pending', 'processing'),
      case_type: Joi.string().max(100).required(),
      notes: Joi.string().max(1000).optional()
    }).options({ abortEarly: false });
  
    return schema.validate(data);
  };

 const TreatmentRequest= mongoose.model('TreatmentRequest', TreatmentRequestSchema);
module.exports ={TreatmentRequest,validateTreatmentRequest}
