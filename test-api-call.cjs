const fetch = require('node-fetch');

async function testApiCall() {
  try {
    console.log('Testing POST /api/system/config endpoint...');
    
    const response = await fetch('http://localhost:3001/api/system/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'NETWORK_BASE_PATH',
        value: 'C:\\Users\\maxim\\OneDrive\\Desktop\\Uni\\Match\\match-werkstatt\\Testordner',
        description: 'Test network path',
        userId: 'test'
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✓ API call successful:', result);
    } else {
      const error = await response.json();
      console.error('✗ API call failed:', response.status, error);
    }
    
  } catch (error) {
    console.error('✗ Error testing API:', error);
  }
}

testApiCall();
