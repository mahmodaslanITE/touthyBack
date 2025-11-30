const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { createTreatmentRequest, showAllRequesyions, getUserTreatmentRequests, acceptRequest } = require('../controllers/treatmentRequestController');
const router=express.Router();
//add request
router.post('/',verifyToken,createTreatmentRequest);
router.get('/',verifyToken,showAllRequesyions)
router.get('/my',verifyToken,getUserTreatmentRequests);
router.post('/accept/:id',verifyToken,acceptRequest)
module.exports=router