const express=require('express');
const { open_conversation, get_user_conversations } = require('../controllers/CorrespondenceControllers/conversationController');
const verifyToken = require('../Middlewares/verifyToken');
const router=express.Router();

// open conversation
router.post('/:receiverId',verifyToken,open_conversation)
router.get('/',verifyToken,get_user_conversations)





module.exports=router