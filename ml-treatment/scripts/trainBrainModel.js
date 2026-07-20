// ml-treatment/scripts/trainBrainModel.js
require('dotenv').config();
const BrainService = require('../services/brainService');

async function train() {
    const result = await BrainService.train();
    
    if (result.success) {
        console.log('\n✅ Training completed successfully!');
        console.log(`   Classes: ${result.classes}`);
        
        // ✅ التحقق من نوع error
        if (typeof result.error === 'number') {
            console.log(`   Final error: ${result.error.toFixed(6)}`);
        } else if (typeof result.error === 'string') {
            console.log(`   Final error: ${result.error}`);
        } else {
            console.log(`   Final error: ${JSON.stringify(result.error)}`);
        }
        
        console.log(`   Iterations: ${result.iterations}`);
    } else {
        console.error('\n❌ Training failed:', result.error);
    }
    
    process.exit(result.success ? 0 : 1);
}

train();