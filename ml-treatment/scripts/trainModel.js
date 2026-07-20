// ml-treatment/scripts/trainModel.js
require('dotenv').config();
const BrainService = require('../services/brainService');

async function train() {
    console.log('🚀 Starting training...');
    console.log('='.repeat(50));

    // اختر الوضع: false للنص فقط، true للنص + صورة
    const useImages = true;  // ✅ تفعيل الصور

    const result = await BrainService.train(useImages);

    if (result.success) {
        console.log('\n✅ Training completed successfully!');
        console.log(`   📊 Classes: ${result.classes}`);
        console.log(`   📈 Iterations: ${result.iterations}`);
        console.log(`   📉 Final error: ${JSON.stringify(result.error)}`);
        console.log(`   🖼️ Image mode: ${result.imageMode}`);
    } else {
        console.error('\n❌ Training failed:', result.error);
    }

    process.exit(result.success ? 0 : 1);
}

train();