// ml/scripts/fullTrain.js
require('dotenv').config();
const MLService = require('../services/mlService');

async function main() {
    const result = await MLService.fullTrain();
    if (result.success) {
        console.log('✅ Full training completed successfully!');
        console.log(`   📊 Records: ${result.totalRecords}`);
        console.log(`   📈 Best K: ${result.bestK}`);
        console.log(`   🎯 Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
    } else {
        console.error(`❌ Full training failed at step: ${result.step}`);
        console.error(`   Error: ${result.error}`);
    }
    process.exit(result.success ? 0 : 1);
}

main();