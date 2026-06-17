const express=require('express');
const uploadPostImages = require('../Middlewares/uploadPost');
const verifyToken = require('../Middlewares/verifyToken');
const { createAdvertisement, getAllAdvertisements, deleteAdvertisement } = require('../controllers/advertisementController');
const router=express.Router();

router.post('/',uploadPostImages.single('image'),verifyToken,createAdvertisement);
router.get('/',verifyToken,getAllAdvertisements);
router.delete('/:id',verifyToken,deleteAdvertisement);
module.exports=router