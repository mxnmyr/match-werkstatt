const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testTitleImageUpload() {
  try {
    // Erstelle ein kleines Test-Bild (1x1 Pixel PNG in Base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');
    
    // Hole einen gültigen Auftrag
    const ordersResponse = await fetch('http://localhost:3001/api/orders');
    const orders = await ordersResponse.json();
    
    if (orders.length === 0) {
      throw new Error('Keine Aufträge gefunden');
    }
    
    const testOrder = orders[0];
    console.log(`Testing with order: ${testOrder.id} (${testOrder.orderNumber})`);
    
    // Bereite FormData vor
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    
    // Upload-Request
    const uploadResponse = await fetch(
      `http://localhost:3001/api/orders/${testOrder.id}/upload-title-image`,
      {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      }
    );
    
    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ Upload erfolgreich:', result);
    } else {
      const error = await uploadResponse.text();
      console.log('❌ Upload fehlgeschlagen:', uploadResponse.status, error);
    }
    
  } catch (error) {
    console.error('Fehler beim Test:', error);
  }
}

testTitleImageUpload();
