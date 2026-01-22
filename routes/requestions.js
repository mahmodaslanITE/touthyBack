const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { createTreatmentRequest, showAllRequesyions, getUserTreatmentRequests, acceptRequest } = require('../controllers/treatmentRequestController');
const { uploadRequestPhoto } = require('../Middlewares/upload');
const router=express.Router();
//add request
router.post('/',verifyToken,uploadRequestPhoto.single('photo'),createTreatmentRequest);

// show all requestions from student
router.get('/',verifyToken,showAllRequesyions)

// the user can see his own requests
router.get('/my',verifyToken,getUserTreatmentRequests);

// the student  can accept requests
router.post('/accept/:id',verifyToken,acceptRequest)
module.exports=router