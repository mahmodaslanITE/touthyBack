const express=require('express');
const { createOverseer } = require('../controllers/adminController');
const verifyToken = require('../Middlewares/verifyToken');
const router=express.Router();
// add over seer 
router.post('/overseer',verifyToken,createOverseer);
module.exports=router