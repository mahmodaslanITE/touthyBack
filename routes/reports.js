const { createReport, get_pending_reports } = require('../controllers/reportController');
const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const router=express.Router();
// report any one
router.post('/:id',verifyToken,createReport) 
router.get('/',verifyToken,get_pending_reports)
module.exports=router