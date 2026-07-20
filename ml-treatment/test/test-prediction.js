// test/test-prediction.js
const BrainService = require('../services/brainService');

async function test() {
    console.log('🔮 Testing Treatment Prediction');
    console.log('='.repeat(50));

    const loaded = BrainService.loadModel();
    if (!loaded) {
        console.log('❌ Model not loaded. Please train first.');
        return;
    }

    const testCases = [
        {
            name: 'مريض 1 - شاب بألم شديد',
            features: [25, 1, 8, 3, 20, 0, 0, 1, 1]
        },
        {
            name: 'مريض 2 - امرأة حامل بألم متوسط',
            features: [28, 0, 6, 1, 22, 1, 0, 0, 0]
        },
        {
            name: 'مريض 3 - رجل مسن بألم خفيف',
            features: [55, 1, 3, 0, 18, 0, 1, 1, 2]
        }
    ];

    testCases.forEach((testCase, index) => {
        console.log(`\n📋 ${testCase.name}:`);
        console.log(`   Features: ${testCase.features.join(', ')}`);
        
        try {
            const result = BrainService.predict(testCase.features);
            console.log(`   🎯 Result: ${result.case_type}`);
            console.log(`   📊 Confidence: ${(result.probability * 100).toFixed(2)}%`);
            console.log(`   📈 All probabilities: ${result.all_probabilities.map(p => p.toFixed(4)).join(', ')}`);
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    });
}

test();