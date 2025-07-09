const fetch = require('node-fetch');

async function testNetworkFolderCreation() {
  const orderId = '686e6283e51b2fe8dcfcc1cd'; // Use the order ID from your error
  
  try {
    console.log(`Testing network folder creation for order: ${orderId}`);
    
    // First, test the GET endpoint to see the current status
    console.log('\n1. Testing GET endpoint...');
    const getResponse = await fetch(`http://localhost:3001/api/orders/${orderId}/network-folder`);
    
    if (getResponse.ok) {
      const getResult = await getResponse.json();
      console.log('✓ GET response:', JSON.stringify(getResult, null, 2));
    } else {
      const getError = await getResponse.json();
      console.error('✗ GET failed:', getResponse.status, getError);
      return;
    }
    
    // Then test the POST endpoint to create the folder
    console.log('\n2. Testing POST endpoint...');
    const postResponse = await fetch(`http://localhost:3001/api/orders/${orderId}/network-folder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (postResponse.ok) {
      const postResult = await postResponse.json();
      console.log('✓ POST response:', JSON.stringify(postResult, null, 2));
    } else {
      const postError = await postResponse.json();
      console.error('✗ POST failed:', postResponse.status, postError);
    }
    
  } catch (error) {
    console.error('✗ Error testing endpoints:', error);
  }
}

// Wait a moment for server to start, then test
setTimeout(testNetworkFolderCreation, 3000);
