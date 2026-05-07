const mongoose = require('mongoose');

const dentalSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  embedding: {
    type: [Number],
    default: null
  }
});

module.exports = mongoose.model('Dental', dentalSchema);