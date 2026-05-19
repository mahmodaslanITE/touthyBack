const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { createTreatmentRequest, getUserTreatmentRequests,  updateRequest, deleteRequest,  } = require('../controllers/patientController');
const { uploadRequestPhoto } = require('../Middlewares/upload');
const { getCourseOverseers, acceptRequest, showAllRequesyions, reassign_overseer,} = require('../controllers/studentController');
const { get_processing_requests, get_finished_requests, get_rejected_requests } = require('../controllers/RequestController');
const router=express.Router();
//add request
router.post('/',verifyToken,uploadRequestPhoto.single('photo'),createTreatmentRequest);

// show all requestions from student
router.get('/',verifyToken,showAllRequesyions)

// the user can see his own requests
router.get('/my',verifyToken,getUserTreatmentRequests);
// student processing request 
router.get('/processing',verifyToken,get_processing_requests);
// student finished request
router.get('/finished',verifyToken,get_finished_requests);
// student rejected request
router.get('/rejected',verifyToken,get_rejected_requests);



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