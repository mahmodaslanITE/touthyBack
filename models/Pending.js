const mongoose = require('mongoose');
const Joi=require('joi')
const TreatmentRequestSchema = new mongoose.Schema(
  {
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    case_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Treatment',
      maxlength: 100,
      required: true
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
    is_pregnant: {
      type: Boolean,
    },
    more_details: {
      type: Object,
      maxlength: 1000
    },
    age:{
type:String,
required:true,

    },
    photo: {
        type: Object,
        default: {
          publicId: null,
          url: null
        }
      },
    
  },
  { timestamps: true }
);
const validateTreatmentRequest = (data) => {
  const schema = Joi.object({
    pain_severity: Joi.number().integer().min(0).max(10).required(),
    pain_time: Joi.string().required(),
    tooth_location: Joi.string().max(50).required(),
    age: Joi.string().required(),
    gender: Joi.string().valid('male', 'female', 'unknown').required(),
    is_pregnant: Joi.boolean().when('gender', {
      is: 'female',
      then: Joi.required().messages({
        'any.required': 'حقل الحمل مطلوب إذا كان الجنس أنثى'
      }),
      otherwise: Joi.optional()
    }),
    caseImageUrl: Joi.string().uri().optional(),
    case_type: Joi.string().max(100).required(),
    
    more_details: Joi.alternatives().try(Joi.string(), Joi.object()).optional()
    
  }).options({ abortEarly: false });
  return schema.validate(data);
}

const validateUpdateRequest = (data) => {
    const schema = Joi.object({
      pain_severity: Joi.number().integer().min(0).max(10),
      pain_time: Joi.string(),
      tooth_location: Joi.string().max(50),
      age:Joi.string(),
      gender: Joi.string().valid('male', 'female', 'unknown'),
      is_pregnant: Joi.boolean().when('gender', {
        is: 'female',
        then: Joi.required().messages({
          'any.required': 'حقل الحمل مطلوب إذا كان الجنس أنثى'
        }),
        otherwise: Joi.optional()
      }),
      caseImageUrl: Joi.string().uri().optional(),
      case_type: Joi.string().max(100),
      notes: Joi.string().max(1000).optional()
    }).options({ abortEarly: false });
  
    return schema.validate(data);
  };

 const Pending_request= mongoose.model('Pending_request', TreatmentRequestSchema);
module.exports ={Pending_request,validateTreatmentRequest,validateUpdateRequest};
