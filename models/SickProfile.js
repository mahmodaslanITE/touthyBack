const mongoose=require('mongoose');
const profileSchema=mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    firstname: {
        type: String,
        required: true,
        trim: true
      },
      universitynumber: {
        type: String,
        required: true,
        trim: true
      },
    lastname: {
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
          url: 'https://www.bing.com/th/id/OIP.PKlD9uuBX0m4S8cViqXZHAHaHa?w=195&h=211&c=8&rs=1&qlt=90&o=6&cb=12&pid=3.1&rm=2'
        }
      } 
})
const SickProfile=mongoose.model('SickProfile',profileSchema)
module.exports=SickProfile