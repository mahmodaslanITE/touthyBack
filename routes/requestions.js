const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { createTreatmentRequest, getUserTreatmentRequests,  updateRequest, deleteRequest } = require('../controllers/treatmentRequestController');
const { uploadRequestPhoto } = require('../Middlewares/upload');
const { getCourseOverseers, getUserProcessingTreatmentRequests, acceptRequest, showAllRequesyions, reassign_overseer } = require('../controllers/studentController');
const router=express.Router();
//add request
router.post('/',verifyToken,uploadRequestPhoto.single('photo'),createTreatmentRequest);

// show all requestions from student
router.get('/',verifyToken,showAllRequesyions)

// the user can see his own requests
router.get('/my',verifyToken,getUserTreatmentRequests);
router.get('/myProcessing',verifyToken,getUserProcessingTreatmentRequests);

// the student  can accept requests
router.post('/accept/:id/:overseer',verifyToken,acceptRequest)
router.put('/reassign-overseer/:id/:overseer',verifyToken,reassign_overseer)

//update the requests
router.put('/:id',verifyToken,uploadRequestPhoto.single('photo'),updateRequest)

//delete request
router.delete('/:id',verifyToken,deleteRequest)

//
router.get('/course-overseers/:id',verifyToken,getCourseOverseers)
module.exports=router