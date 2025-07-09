// test-uploads.js
// Test script for network upload endpoints

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

// Test order document upload
async function testOrderDocumentUpload(orderId, filePath) {
  try {
    console.log(`Testing order document upload for order ${orderId}...`);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(
      `${API_BASE_URL}/api/orders/${orderId}/upload-document`, 
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        }
      }
    );
    
    console.log('✅ Order document upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Order document upload failed:', error.response?.data || error.message);
    return null;
  }
}

// Test CAM file upload
async function testCAMFileUpload(orderId, filePath) {
  try {
    console.log(`Testing CAM file upload for order ${orderId}...`);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(
      `${API_BASE_URL}/api/orders/${orderId}/upload-cam-file`, 
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        }
      }
    );
    
    console.log('✅ CAM file upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ CAM file upload failed:', error.response?.data || error.message);
    return null;
  }
}

// Test component document upload
async function testComponentDocumentUpload(componentId, filePath) {
  try {
    console.log(`Testing component document upload for component ${componentId}...`);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(
      `${API_BASE_URL}/api/components/${componentId}/upload-document`, 
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        }
      }
    );
    
    console.log('✅ Component document upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Component document upload failed:', error.response?.data || error.message);
    return null;
  }
}

// Get an order to test with
async function getTestOrder() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/orders?limit=1`);
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    throw new Error('No orders found');
  } catch (error) {
    console.error('Failed to get test order:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('Starting network upload endpoint tests...');
  
  // Get a test order
  const testOrder = await getTestOrder();
  if (!testOrder) {
    console.error('Cannot continue tests without a test order.');
    return;
  }
  
  console.log(`Using test order: ${testOrder.orderNumber || testOrder.id}`);
  
  // Path to test files
  const docFilePath = path.join(__dirname, 'test-document.pdf'); // Create this file or use an existing one
  const camFilePath = path.join(__dirname, 'test-cam-file.nc'); // Create this file or use an existing one
  
  // Test endpoints
  await testOrderDocumentUpload(testOrder.id, docFilePath);
  await testCAMFileUpload(testOrder.id, camFilePath);
  
  // If the order has components, test component upload too
  if (testOrder.components && testOrder.components.length > 0) {
    const testComponent = testOrder.components[0];
    console.log(`Using test component: ${testComponent.title}`);
    await testComponentDocumentUpload(testComponent.id, docFilePath);
  } else {
    console.log('No components found for component document upload test.');
  }
  
  console.log('All tests completed!');
}

runTests().catch(console.error);
