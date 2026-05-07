const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const Dental = require('../models/Dental');

// نقطة نهاية للأسئلة الذكية
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'الرجاء كتابة سؤال' });
    }
    
    console.log(`❓ سؤال: ${question}`);
    
    // 1. تحويل السؤال إلى embedding
    const questionEmbedding = await aiService.generateEmbedding(question);
    if (!questionEmbedding) {
      return res.status(500).json({ error: 'فشل في معالجة السؤال' });
    }
    
    // 2. جلب قاعدة المعرفة من MongoDB
    const knowledgeBase = await Dental.find({ embedding: { $ne: null } }).lean();
    
    if (knowledgeBase.length === 0) {
      return res.json({
        question,
        answer: 'عذراً، قاعدة المعرفة فارغة. يرجى إضافة بعض البيانات أولاً.',
        sources: []
      });
    }
    
    // 3. البحث عن إجابات مشابهة
    const similarAnswers = await aiService.findSimilarAnswers(
      questionEmbedding, 
      knowledgeBase, 
      2
    );
    
    if (similarAnswers.length === 0) {
      return res.json({
        question,
        answer: 'عذراً، لم أجد معلومات كافية للإجابة على هذا السؤال.',
        sources: []
      });
    }
    
    // 4. بناء السياق للإجابة
    const context = similarAnswers.map((item, index) => 
      `المصدر ${index + 1}:\nس: ${item.question}\nج: ${item.answer}`
    ).join('\n\n');
    
    // 5. توليد الإجابة النهائية
    const finalAnswer = await aiService.generateAnswer(question, context);
    
    // 6. إرسال الإجابة
    res.json({
      success: true,
      question,
      answer: finalAnswer,
      sources: similarAnswers.map(s => ({
        question: s.question,
        category: s.category,
        similarity: s.similarity.toFixed(3)
      })),
      disclaimer: '⚠️ هذه المعلومات لأغراض تعليمية، استشر طبيب الأسنان للتشخيص الدقيق'
    });
    
  } catch (error) {
    console.error('خطأ:', error);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// نقطة لإضافة بيانات جديدة إلى قاعدة المعرفة
router.post('/add-knowledge', async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ error: 'السؤال والإجابة مطلوبان' });
    }
    
    const newRecord = new Dental({
      question,
      answer,
      category: category || 'general'
    });
    
    await newRecord.save();
    
    res.json({
      success: true,
      message: 'تم إضافة المعرفة بنجاح',
      data: newRecord
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// نقطة لتوليد embedding لبيانات جديدة (للاستخدام الداخلي)
router.post('/generate-embeddings', async (req, res) => {
  try {
    const records = await Dental.find({ embedding: null });
    
    if (records.length === 0) {
      return res.json({ message: 'لا توجد بيانات تحتاج إلى توليد embeddings' });
    }
    
    let processed = 0;
    
    for (const record of records) {
      const textToEmbed = `سؤال: ${record.question}\nإجابة: ${record.answer}`;
      const embedding = await aiService.generateEmbedding(textToEmbed);
      
      if (embedding) {
        record.embedding = embedding;
        await record.save();
        processed++;
        console.log(`✅ تمت معالجة: ${record.question.slice(0, 50)}...`);
      }
      
      // انتظار قليلاً بين الطلبات
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    res.json({ 
      message: `تم توليد embeddings لـ ${processed} سجل`,
      total: records.length,
      processed
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// نقطة لجلب جميع المعرفة
router.get('/knowledge', async (req, res) => {
  try {
    const knowledge = await Dental.find({}).select('-embedding');
    res.json({
      count: knowledge.length,
      data: knowledge
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;