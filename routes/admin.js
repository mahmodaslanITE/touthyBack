const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { createOverseer, getAllOverseers, assignOverseerToLesson } = require('../controllers/adminControllers/overseersController');
const { verifyAccountAccept, verifyAccountReject, getAllStudents, addCategory, getCategories, getAllVerifyRequests } = require('../controllers/adminControllers/studentsController');
const { getAllPatients } = require('../controllers/adminControllers/patientsController');
const { createCourse, getCourses, addTreatment, getAllTreatments, deleteTreatment, addPracticalLesson, getAllLessons } = require('../controllers/adminControllers/courses_and_treatments');
const { adminUpdateInProcess } = require('../controllers/adminControllers/requestions_controller');

const router=express.Router();
// add over seer 
router.post('/overseer',verifyToken,createOverseer);
router.put('/overseer/assign',verifyToken,assignOverseerToLesson)
//get verify requests
router.get('/verify',verifyToken,getAllVerifyRequests);
//verify account
router.post('/verify/accept/:id',verifyToken,verifyAccountAccept);
router.post('/verify/reject/:id',verifyToken,verifyAccountReject);
// get the users
router.get('/patients',verifyToken,getAllPatients);
router.get('/overseers',verifyToken,getAllOverseers);
router.get('/students',verifyToken,getAllStudents);

//add coures 
router.post('/course',verifyToken,createCourse);
router.get('/course',verifyToken,getCourses)

//treatment
router.post('/treatment',verifyToken,addTreatment)
router.get('/treatment',verifyToken,getAllTreatments)
router.delete('/treatment/:id',verifyToken,deleteTreatment)

//categories
router.post('/category',verifyToken,addCategory)
router.get('/category',verifyToken,getCategories)

//practical-lessons
router.post('/practical-lessons',verifyToken,addPracticalLesson)
router.get('/practical-lessons',verifyToken,getAllLessons)

// inprocess 
router.put('/in-proccess/:id',verifyToken,adminUpdateInProcess)

module.exports=router