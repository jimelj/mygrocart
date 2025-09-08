const axios = require('axios');
const fs = require('fs');

class LIDLStoreDiscovery {
    constructor() {
        this.apiBaseUrl = 'https://mobileapi.lidl.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.lidl.com/',
            'Origin': 'https://www.lidl.com'
        };
    }

    async discoverAllStores() {
        console.log('🏪 Starting LIDL Store Discovery...');
        console.log('📍 Target: All LIDL stores in the US');
        
        try {
            // Fetch all stores from the API
            console.log('📡 Fetching stores from LIDL API...');
            const response = await axios.get(`${this.apiBaseUrl}/v1/stores`, {
                headers: this.headers,
                timeout: 30000
            });

            if (response.status !== 200) {
                throw new Error(`API returned status ${response.status}`);
            }

            const storeData = response.data;
            console.log(`✅ API Response received successfully`);
            console.log(`📊 Found ${storeData.results.length} LIDL stores`);

            // Process each store
            const processedStores = [];
            let successCount = 0;
            let errorCount = 0;

            console.log('🔍 Processing store data...');
            
            for (let i = 0; i < storeData.results.length; i++) {
                const store = storeData.results[i];
                
                try {
                    const processedStore = this.processStoreData(store);
                    processedStores.push(processedStore);
                    successCount++;
                    
                    if (successCount % 25 === 0) {
                        console.log(`   📥 Processed ${successCount}/${storeData.results.length} stores...`);
                    }
                } catch (error) {
                    console.log(`❌ Error processing store ${store.id}: ${error.message}`);
                    errorCount++;
                }
            }

            // Create final database object
            const finalDatabase = {
                discoveryDate: new Date().toISOString(),
                source: 'LIDL Mobile API',
                apiEndpoint: `${this.apiBaseUrl}/v1/stores`,
                totalStoresFound: processedStores.length,
                successfullyProcessed: successCount,
                errors: errorCount,
                validStores: processedStores,
                summary: {
                    stateBreakdown: this.getStateBreakdown(processedStores),
                    totalStates: this.getUniqueStates(processedStores).length
                }
            };

            // Save to file
            const filename = '../databases/lidl-stores-final.json';
            fs.writeFileSync(filename, JSON.stringify(finalDatabase, null, 2));
            console.log(`💾 Results saved to ${filename}`);

            // Print summary
            this.printSummary(finalDatabase);

            return finalDatabase;

        } catch (error) {
            console.error('❌ Error in LIDL store discovery:', error.message);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Headers:`, error.response.headers);
            }
            throw error;
        }
    }

    processStoreData(store) {
        // Extract and clean store data
        const address = store.address || {};
        const hours = store.hours || {};
        const coordinates = store.coordinates || {};

        // Process hours
        let hoursString = 'Hours not available';
        if (hours.regularHours && hours.regularHours.length > 0) {
            const regularHour = hours.regularHours[0];
            hoursString = `${regularHour.days}: ${regularHour.hours}`;
        }

        // Create clean store object
        const cleanStore = {
            storeId: store.id,
            crmStoreId: store.crmStoreID,
            storeNumber: store.storeNumber,
            name: store.name,
            streetAddress: address.street,
            city: address.city,
            state: address.state,
            stateFullName: address.longState,
            zipCode: address.zip,
            country: address.country,
            fullAddress: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
            phone: store.phone,
            hours: hoursString,
            rawHours: hours,
            latitude: coordinates.lat,
            longitude: coordinates.lon,
            temporarilyClosed: store.temporarilyClosed,
            reopeningDate: store.reopeningDate,
            attributes: store.attributes || [],
            url: `https://www.lidl.com/stores/${store.id}`, // Constructed URL
            discoveredAt: new Date().toISOString()
        };

        // Validate required fields
        if (!cleanStore.storeId || !cleanStore.name || !cleanStore.city || !cleanStore.state) {
            throw new Error('Missing required store fields');
        }

        if (!cleanStore.latitude || !cleanStore.longitude) {
            throw new Error('Missing coordinates');
        }

        return cleanStore;
    }

    getStateBreakdown(stores) {
        const breakdown = {};
        stores.forEach(store => {
            const state = store.state;
            if (breakdown[state]) {
                breakdown[state]++;
            } else {
                breakdown[state] = 1;
            }
        });
        return breakdown;
    }

    getUniqueStates(stores) {
        return [...new Set(stores.map(store => store.state))];
    }

    printSummary(database) {
        console.log('\n🎉 LIDL Store Discovery Completed!');
        console.log('=====================================');
        console.log(`📊 Total stores found: ${database.totalStoresFound}`);
        console.log(`✅ Successfully processed: ${database.successfullyProcessed}`);
        console.log(`❌ Errors: ${database.errors}`);
        console.log(`📈 Success rate: ${((database.successfullyProcessed / database.totalStoresFound) * 100).toFixed(1)}%`);

        console.log('\n🗺️ LIDL stores by state:');
        const sortedStates = Object.entries(database.summary.stateBreakdown)
            .sort(([,a], [,b]) => b - a);
        
        sortedStates.forEach(([state, count]) => {
            console.log(`   ${state}: ${count} stores`);
        });

        console.log(`\n📍 Coverage: ${database.summary.totalStates} states`);
        console.log('🎯 All LIDL stores discovered and ready for import!');
    }
}

// Main execution
async function runLIDLDiscovery() {
    const discovery = new LIDLStoreDiscovery();
    
    try {
        const result = await discovery.discoverAllStores();
        console.log('\n✅ LIDL store discovery completed successfully!');
        return result;
    } catch (error) {
        console.error('\n❌ LIDL store discovery failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runLIDLDiscovery();
}

module.exports = { LIDLStoreDiscovery };