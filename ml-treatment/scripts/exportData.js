// ml-treatment/scripts/exportData.js
require('dotenv').config();
const TreatmentDataService = require('../services/dataService');

async function main() {
    const result = await TreatmentDataService.exportFromMongoDB();
    if (result.success) {
        console.log('✅ Treatment data export completed successfully!');
        console.log(`   📊 Records: ${result.totalRecords}`);
    } else {
        console.error('❌ Export failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
}

main();