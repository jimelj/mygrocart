const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

class ACMECompleteStoreDiscovery {
    constructor() {
        this.validStores = [];
        this.invalidStores = [];
        this.cityPages = [];
        this.states = ['Connecticut', 'Delaware', 'Maryland', 'New Jersey', 'New York', 'Pennsylvania'];
        this.stateAbbr = {
            'Connecticut': 'ct',
            'Delaware': 'de', 
            'Maryland': 'md',
            'New Jersey': 'nj',
            'New York': 'ny',
            'Pennsylvania': 'pa'
        };
    }

    async discoverAllACMEStores() {
        console.log('🏪 Starting COMPLETE ACME Markets Store Discovery...');
        console.log('📍 Target: All 159 stores including multi-store cities\n');

        // Step 1: Discover city pages from state pages
        console.log('🔍 Step 1: Discovering city pages from state pages...');
        await this.discoverCityPages();

        // Step 2: Discover individual stores from city pages
        console.log('\n🔍 Step 2: Discovering individual stores from city pages...');
        await this.discoverStoresFromCities();

        // Step 3: Extract detailed store information
        console.log('\n🔍 Step 3: Extracting detailed store information...');
        await this.extractDetailedStoreInfo();

        // Step 4: Save results
        await this.saveResults();
        
        return this.getResults();
    }

    async discoverCityPages() {
        for (const state of this.states) {
            const stateAbbr = this.stateAbbr[state];
            const stateUrl = `https://local.acmemarkets.com/${stateAbbr}.html`;
            
            try {
                console.log(`📍 Discovering cities in ${state}...`);
                
                const response = await axios.get(stateUrl, {
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                const html = response.data;
                const cityData = this.extractCityLinksFromState(html, state, stateAbbr);
                
                console.log(`   ✅ Found ${cityData.length} city entries in ${state}`);
                this.cityPages.push(...cityData);
                
            } catch (error) {
                console.log(`   ❌ Error discovering cities in ${state}: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        }
        
        console.log(`\n📊 Total city pages to process: ${this.cityPages.length}`);
    }

    extractCityLinksFromState(html, state, stateAbbr) {
        const cities = [];
        
        try {
            // Look for Directory-listItem entries with city links and store counts
            const listItemRegex = /<li class="Directory-listItem">.*?<\/li>/gs;
            const listItems = html.match(listItemRegex) || [];
            
            listItems.forEach(item => {
                // Look for links in each list item
                const linkMatch = item.match(/href="([^"]+)"/);
                const textMatch = item.match(/<span[^>]*Directory-listLinkText[^>]*>([^<]+)<\/span>/);
                const countMatch = item.match(/data-count="\((\d+)\)"/);
                
                if (linkMatch && textMatch) {
                    const href = linkMatch[1];
                    const cityName = textMatch[1];
                    const storeCount = countMatch ? parseInt(countMatch[1]) : 1;
                    
                    // Determine if this is a city page or direct store link
                    const parts = href.split('/');
                    
                    if (parts.length === 2 && parts[1].endsWith('.html')) {
                        // This is a city page (e.g., "pa/philadelphia.html")
                        cities.push({
                            type: 'city_page',
                            cityName: cityName,
                            url: `https://local.acmemarkets.com/${href}`,
                            expectedStores: storeCount,
                            state: state,
                            stateAbbr: stateAbbr
                        });
                    } else if (parts.length === 3 && parts[2].endsWith('.html')) {
                        // This is a direct store link (e.g., "pa/bensalem/bristol-rd.html")
                        cities.push({
                            type: 'direct_store',
                            cityName: cityName,
                            url: `https://local.acmemarkets.com/${href}`,
                            expectedStores: 1,
                            state: state,
                            stateAbbr: stateAbbr,
                            storeId: `${parts[0]}-${parts[1]}-${parts[2].replace('.html', '')}`
                        });
                    }
                }
            });
            
        } catch (error) {
            console.log(`   ⚠️ Error extracting city links from ${state}: ${error.message}`);
        }
        
        return cities;
    }

    async discoverStoresFromCities() {
        let processedCities = 0;
        
        for (const cityData of this.cityPages) {
            try {
                if (cityData.type === 'direct_store') {
                    // This is already a direct store link
                    this.validStores.push({
                        storeId: cityData.storeId,
                        city: cityData.cityName,
                        url: cityData.url,
                        state: cityData.state,
                        stateAbbr: cityData.stateAbbr,
                        discovered: true,
                        detailsExtracted: false
                    });
                } else if (cityData.type === 'city_page') {
                    // This is a city page that contains multiple stores
                    console.log(`   🏙️ Processing ${cityData.cityName} (expecting ${cityData.expectedStores} stores)...`);
                    
                    const response = await axios.get(cityData.url, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    });

                    const html = response.data;
                    const stores = this.extractStoreLinksFromCityPage(html, cityData);
                    
                    console.log(`      ✅ Found ${stores.length}/${cityData.expectedStores} stores in ${cityData.cityName}`);
                    this.validStores.push(...stores);
                }
                
                processedCities++;
                if (processedCities % 10 === 0) {
                    console.log(`   📥 Processed ${processedCities}/${this.cityPages.length} city pages...`);
                }
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`   ❌ Error processing ${cityData.cityName}: ${error.message}`);
                this.invalidStores.push({
                    cityName: cityData.cityName,
                    url: cityData.url,
                    reason: error.message
                });
            }
        }
        
        console.log(`\n📊 Total stores discovered: ${this.validStores.length}`);
    }

    extractStoreLinksFromCityPage(html, cityData) {
        const stores = [];
        
        try {
            // Look for store cards/blocks on the city page
            // Based on the screenshots, stores appear as clickable elements with store names as links
            
            // Pattern 1: Look for ACME Markets store name links
            const storeNameRegex = /<a[^>]+href="([^"]*\/[^"]*\/[^"]*\.html)"[^>]*>[\s\S]*?ACME Markets ([^<]+)<\/a>/gi;
            let match;
            
            while ((match = storeNameRegex.exec(html)) !== null) {
                const [fullMatch, storeUrl, storeName] = match;
                const urlParts = storeUrl.split('/');
                
                if (urlParts.length >= 3) {
                    const stateCode = urlParts[urlParts.length - 3];
                    const city = urlParts[urlParts.length - 2];
                    const addressSlug = urlParts[urlParts.length - 1].replace('.html', '');
                    
                    stores.push({
                        storeId: `${stateCode}-${city}-${addressSlug}`,
                        city: city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        addressSlug: addressSlug,
                        url: storeUrl.startsWith('http') ? storeUrl : `https://local.acmemarkets.com${storeUrl}`,
                        storeName: `ACME Markets ${storeName.trim()}`,
                        state: cityData.state,
                        stateAbbr: cityData.stateAbbr,
                        discovered: true,
                        detailsExtracted: false
                    });
                }
            }
            
            // Pattern 2: Look for any links that match the store URL pattern within the city
            if (stores.length === 0) {
                const urlPattern = new RegExp(`href="([^"]*/${cityData.stateAbbr}/${cityData.cityName.toLowerCase().replace(/\s+/g, '-')}/[^"]*\\.html)"`, 'gi');
                
                while ((match = urlPattern.exec(html)) !== null) {
                    const storeUrl = match[1];
                    const urlParts = storeUrl.split('/');
                    
                    if (urlParts.length >= 3) {
                        const stateCode = urlParts[urlParts.length - 3];
                        const city = urlParts[urlParts.length - 2];
                        const addressSlug = urlParts[urlParts.length - 1].replace('.html', '');
                        
                        stores.push({
                            storeId: `${stateCode}-${city}-${addressSlug}`,
                            city: city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            addressSlug: addressSlug,
                            url: storeUrl.startsWith('http') ? storeUrl : `https://local.acmemarkets.com${storeUrl}`,
                            state: cityData.state,
                            stateAbbr: cityData.stateAbbr,
                            discovered: true,
                            detailsExtracted: false
                        });
                    }
                }
            }
            
            // Pattern 3: Generic store URL pattern for this state/city
            if (stores.length === 0) {
                const genericPattern = new RegExp(`href="([^"]*${cityData.stateAbbr}/[^"]*\\.html)"`, 'gi');
                
                while ((match = genericPattern.exec(html)) !== null) {
                    const storeUrl = match[1];
                    const urlParts = storeUrl.split('/');
                    
                    if (urlParts.length >= 3 && urlParts[urlParts.length - 1].endsWith('.html')) {
                        const stateCode = urlParts[urlParts.length - 3];
                        const city = urlParts[urlParts.length - 2];
                        const addressSlug = urlParts[urlParts.length - 1].replace('.html', '');
                        
                        // Make sure this matches our expected city
                        if (city.toLowerCase().replace(/-/g, ' ') === cityData.cityName.toLowerCase()) {
                            stores.push({
                                storeId: `${stateCode}-${city}-${addressSlug}`,
                                city: city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                addressSlug: addressSlug,
                                url: storeUrl.startsWith('http') ? storeUrl : `https://local.acmemarkets.com${storeUrl}`,
                                state: cityData.state,
                                stateAbbr: cityData.stateAbbr,
                                discovered: true,
                                detailsExtracted: false
                            });
                        }
                    }
                }
            }
            
            // Remove duplicates based on storeId
            const uniqueStores = stores.filter((store, index, self) => 
                index === self.findIndex(s => s.storeId === store.storeId)
            );
            
            return uniqueStores;
            
        } catch (error) {
            console.log(`   ⚠️ Error extracting stores from ${cityData.cityName}: ${error.message}`);
            return [];
        }
    }

    async extractDetailedStoreInfo() {
        console.log(`🔍 Extracting details for ${this.validStores.length} stores...`);
        
        let processed = 0;
        for (const store of this.validStores) {
            try {
                await this.extractStoreDetails(store);
                processed++;
                
                if (processed % 25 === 0) {
                    console.log(`   📥 Processed ${processed}/${this.validStores.length} stores...`);
                }
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.log(`   ❌ Error extracting details for ${store.storeId}: ${error.message}`);
            }
        }
        
        console.log(`✅ Completed detail extraction for ${processed} stores`);
    }

    async extractStoreDetails(store) {
        try {
            const response = await axios.get(store.url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const html = response.data;
            const storeInfo = this.parseStoreDetailsFromHTML(html);
            
            // Update store with extracted details
            Object.assign(store, storeInfo);
            store.detailsExtracted = true;
            
        } catch (error) {
            store.detailsExtracted = false;
            store.extractionError = error.message;
        }
    }

    parseStoreDetailsFromHTML(html) {
        const storeInfo = {};
        
        try {
            // Extract store name from title or h1
            const nameMatch = html.match(/<title>([^<]*)</i) || 
                             html.match(/<h1[^>]*>([^<]*)</i);
            if (nameMatch) {
                storeInfo.name = nameMatch[1].replace(/[\n\r\t]+/g, ' ').trim();
            }
            
            // Extract full address - look for street, city, state zip pattern
            const addressMatch = html.match(/(\d+[^<\n,]+),?\s*([^<\n,]+),?\s*([A-Z]{2})\s*(\d{5})/);
            if (addressMatch) {
                storeInfo.streetAddress = addressMatch[1].trim();
                storeInfo.city = addressMatch[2].trim();
                storeInfo.state = addressMatch[3].trim();
                storeInfo.zipCode = addressMatch[4].trim();
                storeInfo.fullAddress = `${storeInfo.streetAddress}, ${storeInfo.city}, ${storeInfo.state} ${storeInfo.zipCode}`;
            }
            
            // Extract phone number
            const phoneMatch = html.match(/\((\d{3})\)\s*(\d{3})-(\d{4})/);
            if (phoneMatch) {
                storeInfo.phone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
            }
            
            // Extract hours
            const hoursMatch = html.match(/(\d{1,2}:\d{2}\s*[AP]M[\s\-\u2013]+\d{1,2}:\d{2}\s*[AP]M)/);
            if (hoursMatch) {
                storeInfo.hours = hoursMatch[1];
            }
            
            // Extract coordinates
            const coordsMatch = html.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
                               html.match(/"lat":\s*(-?\d+\.\d+)[^}]*"lng":\s*(-?\d+\.\d+)/) ||
                               html.match(/"latitude":\s*(-?\d+\.\d+)[^}]*"longitude":\s*(-?\d+\.\d+)/);
            if (coordsMatch) {
                storeInfo.latitude = coordsMatch[1];
                storeInfo.longitude = coordsMatch[2];
            }
            
        } catch (error) {
            console.log(`   ⚠️ Error parsing store details: ${error.message}`);
        }
        
        return storeInfo;
    }

    async saveResults() {
        const results = {
            discoveryDate: new Date().toISOString(),
            totalStoresFound: this.validStores.length,
            storesWithDetails: this.validStores.filter(s => s.detailsExtracted).length,
            cityPagesProcessed: this.cityPages.length,
            validStores: this.validStores,
            invalidStores: this.invalidStores,
            summary: {
                byState: {}
            }
        };
        
        // Calculate summary by state
        this.states.forEach(state => {
            const stateStores = this.validStores.filter(s => s.state === state);
            results.summary.byState[state] = stateStores.length;
        });
        
        const filename = 'acme-complete-store-database-final.json';
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\n💾 Results saved to ${filename}`);
        
        return results;
    }

    getResults() {
        return {
            totalFound: this.validStores.length,
            withDetails: this.validStores.filter(s => s.detailsExtracted).length,
            errors: this.invalidStores.length,
            stores: this.validStores
        };
    }
}

// Run the complete discovery
if (require.main === module) {
    const discovery = new ACMECompleteStoreDiscovery();
    
    discovery.discoverAllACMEStores().then(results => {
        console.log('\n🎉 COMPLETE ACME Markets Store Discovery Finished!');
        console.log('=====================================================');
        console.log(`📊 Total stores found: ${results.totalFound}`);
        console.log(`📋 Stores with details: ${results.withDetails}`);
        console.log(`❌ Errors: ${results.errors}`);
        console.log(`📈 Success rate: ${((results.withDetails / results.totalFound) * 100).toFixed(1)}%`);
        
        // Show the expected vs found comparison
        console.log('\n🎯 Expected vs Found:');
        console.log('   Expected: 159 stores (from main page)');
        console.log(`   Found: ${results.totalFound} stores`);
        console.log(`   Coverage: ${results.totalFound >= 150 ? '✅' : '❌'} ${((results.totalFound / 159) * 100).toFixed(1)}%`);
        
        if (results.totalFound >= 150) {
            console.log('\n🎊 SUCCESS! Found most/all ACME stores!');
        } else {
            console.log(`\n⚠️  Still missing ${159 - results.totalFound} stores`);
        }
    }).catch(error => {
        console.error('❌ Discovery failed:', error);
    });
}

module.exports = ACMECompleteStoreDiscovery;