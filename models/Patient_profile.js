const mongoose=require('mongoose');
const profileSchema=mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User',},
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
const Patient_profil=mongoose.model('Patient_profil',profileSchema)
module.exports=Patient_profil