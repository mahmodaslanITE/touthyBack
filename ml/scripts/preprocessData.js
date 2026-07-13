// ml/scripts/preprocessData.js
require('dotenv').config();
const DataService = require('../services/dataService');

async function main() {
    const result = await DataService.preprocessData();
    if (result.success) {
        console.log('✅ Preprocess completed successfully!');
    } else {
        console.error('❌ Preprocess failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
}

main();