const express=require('express');
const verifyToken = require('../Middlewares/verifyToken');
const { getDashboard } = require('../controllers/dashboardController');
const router=express.Router();

router.get('/',verifyToken,getDashboard)
module.exports=router