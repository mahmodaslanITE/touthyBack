function formateImageUrl(image){
     image=`${process.env.BASE_URL}/${image}`
    return image
}
module.exports=formateImageUrl