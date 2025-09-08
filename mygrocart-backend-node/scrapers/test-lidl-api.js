const axios = require('axios');
const fs = require('fs');

async function exploreLIDLAPI() {
    console.log('🔍 Exploring LIDL Mobile API...');
    
    const baseAPI = 'https://mobileapi.lidl.com';
    
    // Common API endpoints to try
    const endpoints = [
        '/stores',
        '/store',
        '/locations',
        '/api/stores',
        '/api/store',
        '/api/locations',
        '/v1/stores',
        '/v2/stores',
        '/stores/search',
        '/stores/list',
        '/stores/all'
    ];
    
    const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.lidl.com/',
        'Origin': 'https://www.lidl.com'
    };
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n🔍 Testing: ${baseAPI}${endpoint}`);
            
            const response = await axios.get(`${baseAPI}${endpoint}`, {
                headers,
                timeout: 10000,
                validateStatus: (status) => status < 500 // Don't throw for 4xx errors
            });
            
            console.log(`✅ Status: ${response.status}`);
            console.log(`📄 Content-Type: ${response.headers['content-type']}`);
            console.log(`📏 Size: ${JSON.stringify(response.data).length} chars`);
            
            if (response.status === 200) {
                console.log(`🎯 SUCCESS! Found working endpoint!`);
                
                // Save the response
                const filename = `lidl-api-${endpoint.replace(/\//g, '-')}.json`;
                fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
                console.log(`💾 Saved response to ${filename}`);
                
                // Analyze the response structure
                if (Array.isArray(response.data)) {
                    console.log(`📊 Found array with ${response.data.length} items`);
                    if (response.data.length > 0) {
                        console.log(`🔍 Sample item keys:`, Object.keys(response.data[0]));
                    }
                } else if (typeof response.data === 'object') {
                    console.log(`🔍 Object keys:`, Object.keys(response.data));
                }
                
                // If this looks like store data, we're done!
                const dataStr = JSON.stringify(response.data).toLowerCase();
                if (dataStr.includes('store') || dataStr.includes('address') || dataStr.includes('location')) {
                    console.log(`🏪 This looks like store data!`);
                    return response.data;
                }
            }
            
        } catch (error) {
            if (error.response) {
                console.log(`❌ Status: ${error.response.status} - ${error.response.statusText}`);
            } else {
                console.log(`❌ Error: ${error.message}`);
            }
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🤔 No direct API endpoints found. Let me try different approaches...');
    
    // Try some common geographic endpoints
    const geoEndpoints = [
        '/stores?lat=40.7128&lng=-74.0060', // NYC coordinates
        '/stores/search?zip=10001',
        '/stores/nearby?lat=40.7128&lng=-74.0060',
        '/api/stores/search?location=New York',
        '/locations/search?q=New York'
    ];
    
    for (const endpoint of geoEndpoints) {
        try {
            console.log(`\n🗺️ Testing geographic search: ${baseAPI}${endpoint}`);
            
            const response = await axios.get(`${baseAPI}${endpoint}`, {
                headers,
                timeout: 10000,
                validateStatus: (status) => status < 500
            });
            
            if (response.status === 200) {
                console.log(`✅ Geographic search worked!`);
                const filename = `lidl-geo-${endpoint.split('?')[0].replace(/\//g, '-')}.json`;
                fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
                console.log(`💾 Saved to ${filename}`);
                return response.data;
            }
            
        } catch (error) {
            console.log(`❌ ${error.response?.status || error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Check browser network tab while loading lidl.com/stores');
    console.log('2. Look for GraphQL endpoints');  
    console.log('3. Try headless browser approach');
    
    return null;
}

// Run the API exploration
exploreLIDLAPI()
    .then(data => {
        if (data) {
            console.log('\n🎉 Successfully found LIDL store data!');
        } else {
            console.log('\n❌ No store data found through API exploration');
        }
    })
    .catch(error => {
        console.error('❌ Error in API exploration:', error.message);
    });