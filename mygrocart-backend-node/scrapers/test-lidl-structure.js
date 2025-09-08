const axios = require('axios');
const fs = require('fs');

async function exploreLIDLStructure() {
    console.log('🔍 Exploring LIDL Store Structure...');
    
    try {
        // Test the main stores page
        console.log('📍 Fetching main LIDL stores page...');
        const response = await axios.get('https://www.lidl.com/stores', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        console.log(`✅ Response status: ${response.status}`);
        console.log(`📄 Content length: ${response.data.length} characters`);
        
        // Save the HTML for analysis
        fs.writeFileSync('lidl-stores-main.html', response.data);
        console.log('💾 Saved main page HTML to lidl-stores-main.html');
        
        // Look for store links patterns
        const storeLinks = [];
        const linkRegex = /href="([^"]*store[^"]*)"/gi;
        let match;
        
        while ((match = linkRegex.exec(response.data)) !== null) {
            const link = match[1];
            if (!storeLinks.includes(link)) {
                storeLinks.push(link);
            }
        }
        
        console.log(`🔗 Found ${storeLinks.length} potential store links:`);
        storeLinks.slice(0, 10).forEach((link, i) => {
            console.log(`   ${i + 1}. ${link}`);
        });
        
        if (storeLinks.length > 10) {
            console.log(`   ... and ${storeLinks.length - 10} more`);
        }
        
        // Test one individual store page if we found any
        if (storeLinks.length > 0) {
            const testStoreUrl = storeLinks[0].startsWith('http') 
                ? storeLinks[0] 
                : `https://www.lidl.com${storeLinks[0]}`;
                
            console.log(`\n🏪 Testing individual store page: ${testStoreUrl}`);
            
            try {
                const storeResponse = await axios.get(testStoreUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    }
                });
                
                console.log(`✅ Store page status: ${storeResponse.status}`);
                console.log(`📄 Store page length: ${storeResponse.data.length} characters`);
                
                // Save sample store page
                fs.writeFileSync('lidl-sample-store.html', storeResponse.data);
                console.log('💾 Saved sample store page to lidl-sample-store.html');
                
                // Look for common store data patterns
                console.log('\n📋 Looking for store data patterns...');
                
                // Look for address patterns
                const addressPatterns = [
                    /address[^>]*>([^<]+)</gi,
                    /"address"[^}]*"([^"]+)"/gi,
                    /street[^>]*>([^<]+)</gi
                ];
                
                // Look for phone patterns
                const phonePatterns = [
                    /phone[^>]*>([^<]+)</gi,
                    /"phone"[^}]*"([^"]+)"/gi,
                    /tel:[^"]*"([^"]+)"/gi
                ];
                
                // Look for hours patterns
                const hoursPatterns = [
                    /hours[^>]*>([^<]+)</gi,
                    /"hours"[^}]*"([^"]+)"/gi,
                    /open[^>]*>([^<]+)</gi
                ];
                
                console.log('🔍 Checking for structured data...');
                if (storeResponse.data.includes('application/ld+json')) {
                    console.log('✅ Found JSON-LD structured data!');
                }
                if (storeResponse.data.includes('"LocalBusiness"')) {
                    console.log('✅ Found LocalBusiness schema!');
                }
                if (storeResponse.data.includes('"address"')) {
                    console.log('✅ Found address data!');
                }
                
            } catch (error) {
                console.log(`❌ Error fetching store page: ${error.message}`);
            }
        }
        
        console.log('\n🎯 Next steps:');
        console.log('1. Analyze lidl-stores-main.html for store listing structure');
        console.log('2. Analyze lidl-sample-store.html for data extraction patterns');
        console.log('3. Build scraper based on discovered patterns');
        
    } catch (error) {
        console.log(`❌ Error exploring LIDL structure: ${error.message}`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Headers:`, error.response.headers);
        }
    }
}

// Run the exploration
exploreLIDLStructure();