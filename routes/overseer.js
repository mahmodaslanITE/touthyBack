const express=require('express')
const router=express.Router();
const verifyToken=require('../Middlewares/verifyToken');
const { complete_request, reject_request, show_overseer_requests_in_process } = require('../controllers/overseerController');

// finish treatment 
router.put('/treatment/complete/:id',verifyToken,complete_request)

//reject request
router.put('/treatment/reject/:id',verifyToken,reject_request)

//show overseer requests in processer 
router.get('/treatment',verifyToken,show_overseer_requests_in_process)


module.exports=router