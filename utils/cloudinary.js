const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

//uploade image
const cloudenaryUplodeImage=async(FileToUplode)=>{
  try {
    const data=await cloudinary.uploader.upload(FileToUplode,{
      resource_type:'auto'
    })
    return data
  } catch (error) {
   return error 
  }
}
//remove image
const cloudenaryRemoveImage=async(FileToUplode)=>{
  try {
    const resuult=await cloudinary.uploader.destroy(FileToUplode)
    return resuult
  } catch (error) {
   return error 
  }
}
module.exports = {
  cloudenaryRemoveImage,
  cloudenaryUplodeImage,
  cloudinary};
