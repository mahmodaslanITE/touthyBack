const express=require('express');
const { open_conversation, get_user_conversations } = require('../controllers/CorrespondenceControllers/conversationController');
const verifyToken = require('../Middlewares/verifyToken');
const { send_message } = require('../controllers/CorrespondenceControllers/messageContoller');
const { uploadConversationPhoto } = require('../Middlewares/upload');
const router=express.Router();

// open conversation
router.get('/:receiverId',verifyToken,open_conversation)
router.get('/',verifyToken,get_user_conversations)

//send message
router.post('/:id',verifyToken,uploadConversationPhoto.single('file'),send_message)





module.exports=router