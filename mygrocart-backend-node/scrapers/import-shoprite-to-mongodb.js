const mongoose = require('mongoose');
const fs = require('fs');
const Store = require('./models/Store');
require('dotenv').config();

async function importStoresToMongoDB() {
    console.log('🚀 Starting MongoDB store import...');
    
    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mygrocart');
        console.log('✅ Connected to MongoDB');
        
        // Load the store database
        console.log('📖 Loading store database...');
        const databasePath = 'comprehensive-store-database-scrapedo.json';
        const storeData = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
        
        console.log(`📊 Found ${storeData.validStores.length} stores to import`);
        
        // Clear existing ShopRite stores (optional - remove if you want to keep existing data)
        console.log('🧹 Clearing existing ShopRite stores...');
        await Store.deleteMany({ chainName: 'ShopRite' });
        console.log('✅ Cleared existing stores');
        
        let importedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Import each store
        console.log('📥 Importing stores...');
        for (const storeInfo of storeData.validStores) {
            try {
                // Parse the coordinates
                let latitude = null;
                let longitude = null;
                
                if (storeInfo.latitude && storeInfo.longitude) {
                    latitude = parseFloat(storeInfo.latitude);
                    longitude = parseFloat(storeInfo.longitude);
                    
                    // Validate coordinates
                    if (isNaN(latitude) || isNaN(longitude)) {
                        latitude = null;
                        longitude = null;
                    }
                }
                
                // Parse the address components
                const addressParts = storeInfo.fullAddress ? storeInfo.fullAddress.split(', ') : [];
                let streetAddress = storeInfo.streetAddress || addressParts[0] || 'Unknown';
                let city = storeInfo.city || addressParts[1] || 'Unknown';
                let state = storeInfo.state || addressParts[2] || 'Unknown';
                let zipCode = storeInfo.zip || addressParts[3] || 'Unknown';
                
                // Clean up the data
                if (streetAddress === 'Unknown' && addressParts.length > 0) {
                    streetAddress = addressParts[0];
                }
                
                // Create store object
                const store = new Store({
                    chainName: 'ShopRite',
                    storeName: storeInfo.name || `ShopRite Store ${storeInfo.storeId}`,
                    storeId: storeInfo.storeId,
                    address: streetAddress,
                    city: city,
                    state: state,
                    zipCode: zipCode,
                    phone: storeInfo.phone || 'Unknown',
                    hours: storeInfo.hours || 'Unknown',
                    latitude: latitude,
                    longitude: longitude,
                    isActive: true,
                    lastUpdated: new Date()
                });
                
                // Save to MongoDB
                await store.save();
                importedCount++;
                
                if (importedCount % 25 === 0) {
                    console.log(`📥 Imported ${importedCount}/${storeData.validStores.length} stores...`);
                }
                
            } catch (error) {
                errorCount++;
                errors.push({
                    storeId: storeInfo.storeId,
                    storeName: storeInfo.name,
                    error: error.message
                });
                console.log(`❌ Error importing store ${storeInfo.storeId}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Import completed!');
        console.log('===============================');
        console.log(`✅ Successfully imported: ${importedCount} stores`);
        console.log(`❌ Errors: ${errorCount} stores`);
        console.log(`📊 Success rate: ${((importedCount / storeData.validStores.length) * 100).toFixed(1)}%`);
        
        if (errors.length > 0) {
            console.log('\n⚠️ Errors encountered:');
            errors.forEach(error => {
                console.log(`   ${error.storeId}: ${error.storeName} - ${error.error}`);
            });
        }
        
        // Show some statistics
        console.log('\n📈 Database Statistics:');
        const totalStores = await Store.countDocuments({ chainName: 'ShopRite' });
        const storesWithCoordinates = await Store.countDocuments({ 
            chainName: 'ShopRite', 
            latitude: { $ne: null }, 
            longitude: { $ne: null } 
        });
        const storesWithHours = await Store.countDocuments({ 
            chainName: 'ShopRite', 
            hours: { $ne: 'Unknown' } 
        });
        
        console.log(`   Total ShopRite stores: ${totalStores}`);
        console.log(`   Stores with coordinates: ${storesWithCoordinates}`);
        console.log(`   Stores with hours: ${storesWithHours}`);
        
        // Show sample stores by state
        console.log('\n🗺️ Sample stores by state:');
        const stateGroups = await Store.aggregate([
            { $match: { chainName: 'ShopRite' } },
            { $group: { _id: '$state', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        stateGroups.forEach(group => {
            console.log(`   ${group._id}: ${group.count} stores`);
        });
        
        return {
            success: true,
            imported: importedCount,
            errors: errorCount,
            total: storeData.validStores.length
        };
        
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
}

// Run the import
if (require.main === module) {
    importStoresToMongoDB().then(result => {
        if (result.success) {
            console.log('\n🎯 MongoDB import completed successfully!');
            console.log('Ready to use stores in PricePal backend!');
        } else {
            console.log('\n❌ MongoDB import failed!');
            console.log(`Error: ${result.error}`);
        }
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = importStoresToMongoDB;