const mongoose=require('mongoose');
const profileSchema=mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  university_number: {
        type: String,
        required: true,
        trim: true
      },
  first_name: {
        type: String,
        required: true,
        trim: true
      },
    last_name: {
        type: String,
        required: true,
        trim: true
      },
      bio: {
        type: String,
        default: ''
      },
      profile_photo: {
        type: Object,
        default: {
          publicId: null,
          url: null
        }
      } 
})
const Student_profile=mongoose.model('Student_profile',profileSchema)
module.exports=Student_profile