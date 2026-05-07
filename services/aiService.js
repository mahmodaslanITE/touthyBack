const fetch = require('node-fetch');

class AIService {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.embeddingModel = 'nomic-embed-text';
    this.chatModel = 'phi3';
  }

  // تحويل النص إلى embedding
  async generateEmbedding(text) {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text,
        }),
      });
      
      const data = await response.json();
      return data.embeddings[0];
    } catch (error) {
      console.error('خطأ في توليد embedding:', error);
      return null;
    }
  }

  // حساب التشابه بين متجهين
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    
    return magA && magB ? dotProduct / (magA * magB) : 0;
  }

  // البحث عن إجابات مشابهة في قاعدة البيانات
  async findSimilarAnswers(questionEmbedding, knowledgeBase, limit = 3) {
    const rankedResults = knowledgeBase.map(item => ({
      ...item,
      similarity: item.embedding ? 
        this.cosineSimilarity(questionEmbedding, item.embedding) : 0
    }));
    
    return rankedResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // توليد إجابة باستخدام النموذج
  async generateAnswer(question, context) {
    const prompt = `أنت مساعد متخصص في طب الأسنان. أجب على السؤال بناءً على المعلومات التالية فقط. إذا لم تجد المعلومة، قل "لا أعرف".

المعلومات المتاحة:
${context}

سؤال: ${question}

إجابة:`;

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.chatModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
          }
        }),
      });
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('خطأ في توليد الإجابة:', error);
      return 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.';
    }
  }
}

module.exports = new AIService();