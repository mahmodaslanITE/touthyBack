const { required, string } = require('joi');
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
    request:{type:mongoose.Schema.Types.ObjectId,
        ref:'Requisition',
        required:true
    },
    date_of_accepting:{
        type:String,
        required:true
    },
    case_type:{
        type:String,
        
    }
})
const InProcess=mongoose.model('InProcess',inProcessSchema);
module.exports=InProcess;