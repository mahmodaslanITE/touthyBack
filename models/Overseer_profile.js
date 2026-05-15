const mongoose=require('mongoose');
const profileSchema=mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  university_number: {
        type: String,
        trim: true
      },
  first_name: {
        type: String,
        required: true,
        trim: true,
        default:'undifind'
      },
    father_name: {
        type: String,
        required: true,
        trim: true,
        default:'undifind'
      },
    last_name: {
        type: String,
        required: true,
        trim: true,
        default:'undifind'
      },
      bio: {
        type: String,
        default: ''
      },
      profile_photo: {
        type: Object,
       
      } ,
      is_verified:{
        type:Boolean,
        default:false
      },
      phone_number:{
        type:String
      }
})
const OverseerProfile=mongoose.model('OverseerProfile',profileSchema)
module.exports={OverseerProfile}