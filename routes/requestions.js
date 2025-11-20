const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { createTreatmentRequest } = require('../controllers/treatmentRequestController');
const router=express.Router();
//add request
router.post('/',verifyToken,createTreatmentRequest);
module.exports=router