const express=require('express')
const router=express.Router();
const verifyToken=require('../Middlewares/verifyToken');
const { complete_request, reject_request, show_overseer_requests_in_process, reject_request_with_option, add_stage_evaluation } = require('../controllers/overseerController');

// finish treatment 
router.put('/treatment/complete/:id',verifyToken,complete_request)

//reject request
router.put('/treatment/reject/:id',verifyToken,reject_request)

//reject with option
router.put('/treatment/reject/:id/:option',verifyToken,reject_request_with_option)

//show overseer requests in processer 
router.get('/treatment',verifyToken,show_overseer_requests_in_process)


router.put('/add-evaluation/:id',verifyToken,add_stage_evaluation)




module.exports=router