const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const {  getUserDashboard } = require('../controllers/dashboardController');
const checkAuthOrGuest = require('../Middlewares/geast_or_logged');
const router=express.Router();

router.get('/',checkAuthOrGuest,getUserDashboard)
module.exports=router