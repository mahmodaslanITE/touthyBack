// ml/scripts/trainModel.js
require('dotenv').config();
const MLService = require('../services/mlService');

async function main() {
    const result = await MLService.train();
    if (result.success) {
        console.log('✅ Training completed successfully!');
    } else {
        console.error('❌ Training failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
}

main();