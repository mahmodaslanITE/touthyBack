const mongoose=require('mongoose');
const profileSchema=mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 
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
    
})
module.exports=mongoose.model('Admin_profile',profileSchema)
