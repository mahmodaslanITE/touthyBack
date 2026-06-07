const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { createTreatmentRequest, getUserTreatmentRequests,  updateRequest, deleteRequest,  } = require('../controllers/patientController');
const { uploadRequestPhoto } = require('../Middlewares/upload');
const { getCourseOverseers, acceptRequest, showAllRequests, reassignOverseer,} = require('../controllers/studentController');
const {  getProcessingRequests, getFinishedRequests, getRejectedRequests } = require('../controllers/RequestController');
const router=express.Router();
//add request
router.post('/',verifyToken,uploadRequestPhoto.single('photo'),createTreatmentRequest);

// show all requestions from student
router.get('/',verifyToken,showAllRequests)

// the user can see his own requests
router.get('/my',verifyToken,getUserTreatmentRequests);
// student processing request 
router.get('/processing',verifyToken,getProcessingRequests);
// student finished request
router.get('/finished',verifyToken,getFinishedRequests);
// student rejected request
router.get('/rejected',verifyToken,getRejectedRequests);



// the student  can accept requests
router.post('/accept/:id/:overseer',verifyToken,acceptRequest)
router.put('/reassign-overseer/:id/:overseer',verifyToken,reassignOverseer)

//update the requests
router.put('/:id',verifyToken,uploadRequestPhoto.single('photo'),updateRequest)

//delete request
router.delete('/:id',verifyToken,deleteRequest)

//
router.get('/course-overseers/:id',verifyToken,getCourseOverseers)
module.exports=router