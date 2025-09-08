const mongoose = require('mongoose');
const fs = require('fs');
const Store = require('../models/Store');
require('dotenv').config();

async function importACMEStoresToMongoDB() {
    console.log('🚀 Starting ACME Markets MongoDB import...');
    
    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mygrocart');
        console.log('✅ Connected to MongoDB');
        
        // Load the ACME store database
        console.log('📖 Loading ACME store database...');
        const databasePath = '../databases/acme-stores-final.json';
        const storeData = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
        
        console.log(`📊 Found ${storeData.validStores.length} ACME stores to import`);
        
        // Clear existing ACME stores (optional - remove if you want to keep existing data)
        console.log('🧹 Clearing existing ACME stores...');
        await Store.deleteMany({ chainName: 'ACME Markets' });
        console.log('✅ Cleared existing ACME stores');
        
        let importedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Import each store
        console.log('📥 Importing ACME stores...');
        for (const storeInfo of storeData.validStores) {
            try {
                // Clean and parse the store data (the extraction had some issues)
                const cleanedStore = cleanACMEStoreData(storeInfo);
                
                if (!cleanedStore) {
                    errorCount++;
                    errors.push({
                        storeId: storeInfo.storeId,
                        error: 'Failed to clean store data'
                    });
                    continue;
                }
                
                // Handle coordinates (optional now)
                const lat = parseFloat(cleanedStore.latitude);
                const lng = parseFloat(cleanedStore.longitude);
                
                const storeData = {
                    chainName: 'ACME Markets',
                    storeName: cleanedStore.name || `ACME Markets ${cleanedStore.city}`,
                    storeId: storeInfo.storeId,
                    address: cleanedStore.streetAddress || 'Unknown',
                    city: cleanedStore.city || 'Unknown',
                    state: cleanedStore.state || 'Unknown',
                    zipCode: cleanedStore.zipCode || 'Unknown'
                };
                
                // Add coordinates only if they're valid
                if (!isNaN(lat) && !isNaN(lng) && lat && lng) {
                    storeData.latitude = lat;
                    storeData.longitude = lng;
                } else {
                    console.log(`⚠️ Store ${storeInfo.storeId} imported without coordinates`);
                }
                
                // Create store object
                const store = new Store(storeData);
                
                // Save to MongoDB
                await store.save();
                importedCount++;
                
                if (importedCount % 10 === 0) {
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
        
        console.log('\n🎉 ACME Import completed!');
        console.log('===============================');
        console.log(`✅ Successfully imported: ${importedCount} stores`);
        console.log(`❌ Errors: ${errorCount} stores`);
        console.log(`📊 Success rate: ${((importedCount / storeData.validStores.length) * 100).toFixed(1)}%`);
        
        if (errors.length > 0 && errors.length <= 10) {
            console.log('\n⚠️ Sample errors:');
            errors.slice(0, 10).forEach(error => {
                console.log(`   ${error.storeId}: ${error.error}`);
            });
        }
        
        // Show some statistics
        console.log('\n📈 Database Statistics:');
        const totalShopRiteStores = await Store.countDocuments({ chainName: 'ShopRite' });
        const totalACMEStores = await Store.countDocuments({ chainName: 'ACME Markets' });
        const totalStores = await Store.countDocuments();
        
        console.log(`   ShopRite stores: ${totalShopRiteStores}`);
        console.log(`   ACME Markets stores: ${totalACMEStores}`);
        console.log(`   Total stores: ${totalStores}`);
        
        // Show ACME distribution by state
        console.log('\n🗺️ ACME Markets by state:');
        const acmeStateGroups = await Store.aggregate([
            { $match: { chainName: 'ACME Markets' } },
            { $group: { _id: '$state', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        acmeStateGroups.forEach(group => {
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

function cleanACMEStoreData(storeInfo) {
    try {
        // The extraction had parsing issues, let's clean what we can
        const cleaned = {
            city: storeInfo.city,
            state: storeInfo.state,
            phone: storeInfo.phone,
            latitude: parseFloat(storeInfo.latitude),
            longitude: parseFloat(storeInfo.longitude)
        };
        
        // Fix city name
        if (storeInfo.addressSlug) {
            // Extract city from URL pattern
            const urlParts = storeInfo.url.split('/');
            if (urlParts.length >= 5) {
                cleaned.city = urlParts[4].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }
        
        // Extract state from stateAbbr
        if (storeInfo.stateAbbr) {
            const stateMap = {
                'ct': 'CT',
                'de': 'DE', 
                'md': 'MD',
                'nj': 'NJ',
                'ny': 'NY',
                'pa': 'PA'
            };
            cleaned.state = stateMap[storeInfo.stateAbbr] || storeInfo.state;
        }
        
        // Try to extract address from addressSlug
        if (storeInfo.addressSlug) {
            cleaned.streetAddress = storeInfo.addressSlug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
        }
        
        // Generate a clean store name
        cleaned.name = `ACME Markets ${cleaned.city}`;
        
        // Validate coordinates
        if (isNaN(cleaned.latitude) || isNaN(cleaned.longitude)) {
            cleaned.latitude = null;
            cleaned.longitude = null;
        }
        
        return cleaned;
        
    } catch (error) {
        console.log(`   ⚠️ Error cleaning store data: ${error.message}`);
        return null;
    }
}

// Run the import
if (require.main === module) {
    importACMEStoresToMongoDB().then(result => {
        if (result.success) {
            console.log('\n🎯 ACME MongoDB import completed successfully!');
            console.log('Ready to use ACME stores in PricePal backend!');
        } else {
            console.log('\n❌ ACME MongoDB import failed!');
            console.log(`Error: ${result.error}`);
        }
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = importACMEStoresToMongoDB;