const { required, string, object } = require('joi');
const mongoose=require('mongoose');
const inProcessSchema=mongoose.Schema({
    patient:{type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    student:{type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    Requestion:{
        type:Object
    },
    overseer:{type:mongoose.Schema.Types.ObjectId,
        ref:'Overseer',
        
    },
    date_of_accepting:{
        type:String,
        required:true
    },
    case_type:{
        type:String,
        
    },
    stage_evaluations: [
        {
            text: { type: String, required: true },
            date: { type: Date, default: Date.now }
        }
    ]
    
})
const InProcess_request=mongoose.model('InProcess_request',inProcessSchema);
module.exports=InProcess_request;