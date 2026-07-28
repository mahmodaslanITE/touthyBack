// ml/scripts/exportData.js
require('dotenv').config();  
const DataService = require('../services/dataService');

async function main() {
    const result = await DataService.exportFromMongoDB();
    if (result.success) {
        console.log('✅ Export completed successfully!');
    } else {
        console.error('❌ Export failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
}

main();