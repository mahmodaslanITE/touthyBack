const express=require('express');
const { createOverseer, get_all_patients, get_all_students, get_all_overseers, verify_account_accept, verify_account_reject, createCourse, get_courses, addTreatment, getAllTreatments, deleteTreatment } = require('../controllers/adminController');
const verifyToken = require('../Middlewares/verifyToken');
const { getAllVerifyRequests } = require('../controllers/studentController');
const router=express.Router();
// add over seer 
router.post('/overseer',verifyToken,createOverseer);
//get verify requests
router.get('/verify',verifyToken,getAllVerifyRequests);
//verify account
router.post('/verification/accept/:id',verifyToken,verify_account_accept);
router.post('/verification/reject/:id',verifyToken,verify_account_reject);
// get the users
router.get('/patients',verifyToken,get_all_patients);
router.get('/overseers',verifyToken,get_all_overseers);
router.get('/students',verifyToken,get_all_students);

//add coures 
router.post('/course',verifyToken,createCourse);
router.get('/course',verifyToken,get_courses)

//treatment
router.post('/treatment',verifyToken,addTreatment)
router.get('/treatment',verifyToken,getAllTreatments)
router.delete('/treatment/:id',verifyToken,deleteTreatment)

module.exports=router