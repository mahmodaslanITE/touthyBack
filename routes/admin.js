const express=require('express');
const { createOverseer, get_all_patients, get_all_students, get_all_overseers, verify_account_accept, verify_account_reject, createCourse, get_courses, addTreatment, getAllTreatments, deleteTreatment, add_category, add_practical_lesson, get_categorirs, assign_overseer } = require('../controllers/adminController');
const verifyToken = require('../Middlewares/verifyToken');
const { getAllVerifyRequests } = require('../controllers/studentController');
const { get_all_lessons } = require('../controllers/adminControllers/courses_and_treatments');
const router=express.Router();
// add over seer 
router.post('/overseer',verifyToken,createOverseer);
router.put('/overseer/assign',verifyToken,assign_overseer)
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

//categories
router.post('/category',verifyToken,add_category)
router.get('/category',verifyToken,get_categorirs)

//practical-lessons
router.post('/practical-lessons',verifyToken,add_practical_lesson)
router.get('/practical-lessons',verifyToken,get_all_lessons)

module.exports=router