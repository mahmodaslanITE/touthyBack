const express=require('express');
const { createOverseer, verify_account, get_all_patients, get_all_students, get_all_overseers } = require('../controllers/adminController');
const verifyToken = require('../Middlewares/verifyToken');
const router=express.Router();
// add over seer 
router.post('/overseer',verifyToken,createOverseer);
router.post('/verification/:id',verifyToken,verify_account);
router.get('/patients',verifyToken,get_all_patients);
router.get('/overseers',verifyToken,get_all_overseers);
router.get('/students',verifyToken,get_all_students)
module.exports=router