const fs = require('fs');
const path = require('path');

// Test script for network files functionality
async function testNetworkFiles() {
  console.log('=== Test: Netzwerkdateien Funktionalität ===');
  
  // Check if server is running
  console.log('🔍 Prüfe Server-Verbindung...');
  
  try {
    const fetch = require('node-fetch');
    
    // Test with a specific order ID that should have files
    const testOrderId = '689c84461a875cb6a62695d5'; // S-2508-1 order ID
    
    // Test network files listing API
    console.log('📂 Teste Netzwerkdateien-API...');
    const response = await fetch(`http://localhost:3001/api/orders/${testOrderId}/network-files`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.files.length > 0) {
        console.log(`📄 ${data.files.length} Datei(en) gefunden:`);
        data.files.forEach(file => {
          console.log(`  - ${file.name} (${file.size} bytes)`);
        });
        
        // Test download of first file
        const firstFile = data.files[0];
        console.log(`📥 Teste Download von: ${firstFile.name}`);
        
        const downloadResponse = await fetch(`http://localhost:3001${firstFile.downloadUrl}`);
        
        if (downloadResponse.ok) {
          console.log('✅ Download-Test erfolgreich');
          console.log(`   Status: ${downloadResponse.status}`);
          console.log(`   Content-Type: ${downloadResponse.headers.get('content-type')}`);
          console.log(`   Content-Length: ${downloadResponse.headers.get('content-length')}`);
        } else {
          console.log('❌ Download-Test fehlgeschlagen:', downloadResponse.status);
        }
      } else {
        console.log('📂 Keine Dateien im Netzwerkordner gefunden');
      }
    } else {
      console.log('❌ API-Aufruf fehlgeschlagen:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test fehlgeschlagen:', error.message);
    console.log('\n💡 Stelle sicher, dass:');
    console.log('   1. Der Server läuft (node server.cjs)');
    console.log('   2. Die MongoDB-Verbindung funktioniert');
    console.log('   3. Netzwerkkonfiguration eingerichtet ist');
    console.log('   4. npm install node-fetch ausgeführt wurde');
  }
}

// Check dependencies
try {
  require('node-fetch');
  testNetworkFiles();
} catch (error) {
  console.log('❌ Fehlende Abhängigkeit: node-fetch');
  console.log('💡 Installiere mit: npm install node-fetch');
}
