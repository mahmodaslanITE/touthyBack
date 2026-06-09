const { createReport, get_pending_reports, review_report, getAllAdmins } = require('../controllers/reportController');
const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const router=express.Router();
// report any one
router.post('/:id',verifyToken,createReport) 
router.put('/:id',verifyToken,review_report) 
router.get('/',verifyToken,get_pending_reports)
router.get('/admins',verifyToken,getAllAdmins)
module.exports=router