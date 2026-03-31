const http = require('http');

const PORT = process.env.PORT || 5003;
const HOST = 'localhost';

console.log(`🔍 Checking if server is running on http://${HOST}:${PORT}...\n`);

const options = {
  hostname: HOST,
  port: PORT,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Server is running!');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Response: ${data}\n`);
      
      // Test Sentence-BERT endpoint
      console.log('🧪 Testing Sentence-BERT endpoint...\n');
      
      const testData = JSON.stringify({
        scenarioId: 'test-123',
        generatedText: 'Given a user logs in',
        referenceText: 'Given a user is logged in'
      });
      
      const testOptions = {
        hostname: HOST,
        port: PORT,
        path: '/api/testing/sentence-bert',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': testData.length
        },
        timeout: 30000
      };
      
      const testReq = http.request(testOptions, (testRes) => {
        let testData = '';
        
        testRes.on('data', (chunk) => {
          testData += chunk;
        });
        
        testRes.on('end', () => {
          if (testRes.statusCode === 200 || testRes.statusCode === 401) {
            console.log('✅ Sentence-BERT endpoint is accessible!');
            console.log(`   Status: ${testRes.statusCode}`);
            if (testRes.statusCode === 401) {
              console.log('   Note: 401 is expected without authentication\n');
            } else {
              console.log(`   Response: ${testData}\n`);
            }
          } else {
            console.log(`⚠️  Endpoint returned status: ${testRes.statusCode}`);
            console.log(`   Response: ${testData}\n`);
          }
        });
      });
      
      testReq.on('error', (err) => {
        console.error('❌ Error testing endpoint:', err.message);
        console.log('\nPossible issues:');
        console.log('  - Python dependencies not installed');
        console.log('  - Run: node install-sentence-bert.js\n');
      });
      
      testReq.on('timeout', () => {
        console.error('❌ Request timeout (30s)');
        console.log('\nPossible issues:');
        console.log('  - Python script is taking too long');
        console.log('  - First-time model download in progress');
        console.log('  - Check server logs for details\n');
        testReq.destroy();
      });
      
      testReq.write(testData);
      testReq.end();
      
    } else {
      console.log(`⚠️  Server responded with status: ${res.statusCode}`);
      console.log(`   Response: ${data}\n`);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Server is not running or not accessible!');
  console.error(`   Error: ${err.message}\n`);
  console.log('To start the server:');
  console.log('  1. cd aplikasi-server');
  console.log('  2. npm run dev\n');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Connection timeout!');
  console.error('   Server might be starting up or not responding\n');
  req.destroy();
  process.exit(1);
});

req.end();
