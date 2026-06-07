const express=require('express')
const router=express.Router();
const verifyToken=require('../Middlewares/verifyToken');
const { showOverseerRequests, rejectRequestWithOption, rejectRequest, completeRequest, addStageEvaluation } = require('../controllers/overseerController');

// finish treatment 
router.put('/treatment/complete/:id',verifyToken,completeRequest)

//reject request
router.put('/treatment/reject/:id',verifyToken,rejectRequest)

//reject with option
router.put('/treatment/reject/:id/:option',verifyToken,rejectRequestWithOption)

//show overseer requests in processer 
router.get('/treatment',verifyToken,showOverseerRequests)


router.put('/add-evaluation/:id',verifyToken,addStageEvaluation)




module.exports=router