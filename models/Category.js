const Joi = require('joi');
const mongoose=require('mongoose');
const category_schema=mongoose.Schema({
    category:{
        type:String,
        required:true,
    }
})
const Category=mongoose.model('Category',category_schema);
const valedate_add_category=(data)=>{
    const schema=Joi.object({
        category:Joi.string().required()
    })
    return schema.validate(data)
}
module.exports={Category,valedate_add_category}