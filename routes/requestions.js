const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { createTreatmentRequest, getUserTreatmentRequests,  updateRequest, deleteRequest } = require('../controllers/treatmentRequestController');
const { uploadRequestPhoto } = require('../Middlewares/upload');
const { getCourseOverseers, getUserProcessingTreatmentRequests, acceptRequest, showAllRequesyions, reassign_overseer, get_student_finished_requests, get_student_rejected_requests } = require('../controllers/studentController');
const router=express.Router();
//add request
router.post('/',verifyToken,uploadRequestPhoto.single('photo'),createTreatmentRequest);

// show all requestions from student
router.get('/',verifyToken,showAllRequesyions)

// the user can see his own requests
router.get('/my',verifyToken,getUserTreatmentRequests);
// student processing request 
router.get('/myProcessing',verifyToken,getUserProcessingTreatmentRequests);
// student finished request
router.get('/myfinished',verifyToken,get_student_finished_requests);
// student rejected request
router.get('/myrejected',verifyToken,get_student_rejected_requests);



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