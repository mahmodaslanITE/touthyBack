// test-brain.js
const brain = require('brainjs');

// إنشاء شبكة عصبية بسيطة
const net = new brain.NeuralNetwork();

// تدريب على بيانات XOR
net.train([
    { input: [0, 0], output: [0] },
    { input: [0, 1], output: [1] },
    { input: [1, 0], output: [1] },
    { input: [1, 1], output: [0] }
]);

// اختبار
const result = net.run([1, 0]);
console.log('🔮 Prediction for [1, 0]:', result);