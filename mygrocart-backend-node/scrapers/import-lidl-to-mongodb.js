const mongoose = require('mongoose');
const fs = require('fs');
const Store = require('../models/Store');
require('dotenv').config();

async function importLIDLStoresToMongoDB() {
    console.log('🚀 Starting LIDL MongoDB import...');
    
    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mygrocart');
        console.log('✅ Connected to MongoDB');
        
        // Load the LIDL store database
        console.log('📖 Loading LIDL store database...');
        const databasePath = '../databases/lidl-stores-final.json';
        const storeData = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
        
        console.log(`📊 Found ${storeData.validStores.length} LIDL stores to import`);
        
        // Clear existing LIDL stores
        console.log('🧹 Clearing existing LIDL stores...');
        await Store.deleteMany({ chainName: 'LIDL' });
        console.log('✅ Cleared existing LIDL stores');
        
        let importedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Import each store
        console.log('📥 Importing LIDL stores...');
        for (const storeInfo of storeData.validStores) {
            try {
                // Create store object
                const store = new Store({
                    chainName: 'LIDL',
                    storeName: storeInfo.name,
                    storeId: storeInfo.storeId,
                    address: storeInfo.fullAddress,
                    city: storeInfo.city,
                    state: storeInfo.state,
                    zipCode: storeInfo.zipCode,
                    latitude: storeInfo.latitude,
                    longitude: storeInfo.longitude
                });
                
                // Save to MongoDB
                await store.save();
                importedCount++;
                
                if (importedCount % 25 === 0) {
                    console.log(`📥 Imported ${importedCount}/${storeData.validStores.length} stores...`);
                }
                
            } catch (error) {
                console.log(`❌ Error importing store ${storeInfo.storeId}: ${error.message}`);
                errorCount++;
                errors.push({
                    storeId: storeInfo.storeId,
                    error: error.message
                });
            }
        }
        
        // Get final database statistics
        console.log('\n📊 Getting database statistics...');
        const storesCollection = mongoose.connection.db.collection('stores');
        
        // Count by chain
        const chainCounts = await storesCollection.aggregate([
            { $group: { _id: '$chainName', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        const totalStores = await storesCollection.countDocuments();
        
        // Count LIDL stores by state
        const lidlByState = await storesCollection.aggregate([
            { $match: { chainName: 'LIDL' } },
            { $group: { _id: '$state', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        // Print results
        console.log('\n🎉 LIDL Import completed!');
        console.log('===============================');
        console.log(`✅ Successfully imported: ${importedCount} stores`);
        console.log(`❌ Errors: ${errorCount} stores`);
        console.log(`📊 Success rate: ${((importedCount / storeData.validStores.length) * 100).toFixed(1)}%`);
        
        console.log('\n📈 Database Statistics:');
        chainCounts.forEach(chain => {
            console.log(`   ${chain._id}: ${chain.count} stores`);
        });
        console.log(`   Total: ${totalStores} stores`);
        
        console.log('\n🗺️ LIDL stores by state:');
        lidlByState.forEach(state => {
            console.log(`   ${state._id}: ${state.count} stores`);
        });
        
        if (errors.length > 0) {
            console.log('\n❌ Import errors:');
            errors.slice(0, 5).forEach(error => {
                console.log(`   ${error.storeId}: ${error.error}`);
            });
            if (errors.length > 5) {
                console.log(`   ... and ${errors.length - 5} more errors`);
            }
        }
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        
        console.log('\n🎯 LIDL MongoDB import completed successfully!');
        console.log('Ready to use LIDL stores in PricePal backend!');
        
    } catch (error) {
        console.error('❌ Error in LIDL import:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

// Run the import
importLIDLStoresToMongoDB();