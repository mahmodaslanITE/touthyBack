const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const {  getUserDashboard } = require('../controllers/dashboardController');
const router=express.Router();

router.get('/',getUserDashboard)
module.exports=router