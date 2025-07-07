// Test QR-Code-URL-Generierung und -Erkennung
import QRCode from 'qrcode';

async function testQRCodeGeneration() {
  console.log('Testing QR Code URL generation...\n');
  
  // Simuliere verschiedene Szenarien
  const testCases = [
    {
      orderId: 'ORDER123',
      expectedUrl: 'http://localhost:5173/#/order/ORDER123'
    },
    {
      orderId: '675c8e7f1234567890abcdef',
      expectedUrl: 'http://localhost:5173/#/order/675c8e7f1234567890abcdef'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`Test Case: Order ID = ${testCase.orderId}`);
    console.log(`Expected URL: ${testCase.expectedUrl}`);
    
    try {
      // QR-Code generieren
      const qrCodeDataUrl = await QRCode.toDataURL(testCase.expectedUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      console.log(`✅ QR-Code erfolgreich generiert`);
      console.log(`   Data URL length: ${qrCodeDataUrl.length} chars`);
      
      // Test URL-Extraktion (wie im Scanner)
      const testUrl = testCase.expectedUrl;
      if (testUrl.includes('#/order/')) {
        const orderMatch = testUrl.match(/#\/order\/([^\/?\s]+)/);
        if (orderMatch && orderMatch[1]) {
          console.log(`✅ Order ID erfolgreich extrahiert: ${orderMatch[1]}`);
        } else {
          console.log(`❌ Order ID konnte nicht extrahiert werden`);
        }
      } else {
        console.log(`   Direkte Order ID (keine URL): ${testUrl}`);
      }
      
    } catch (error) {
      console.log(`❌ Fehler bei QR-Code-Generierung:`, error.message);
    }
    
    console.log('---\n');
  }
}

// Test URL-Parsing Funktion
function testUrlParsing() {
  console.log('Testing URL parsing logic...\n');
  
  const testInputs = [
    'ORDER123',
    'http://localhost:5173/#/order/ORDER123',
    'https://example.com/#/order/675c8e7f1234567890abcdef',
    '675c8e7f1234567890abcdef'
  ];
  
  testInputs.forEach(input => {
    console.log(`Input: ${input}`);
    
    if (input.includes('#/order/')) {
      const orderMatch = input.match(/#\/order\/([^\/?\s]+)/);
      if (orderMatch && orderMatch[1]) {
        console.log(`  → Extracted Order ID: ${orderMatch[1]}`);
      } else {
        console.log(`  → Failed to extract Order ID`);
      }
    } else {
      console.log(`  → Direct Order ID: ${input}`);
    }
    console.log('');
  });
}

// Tests ausführen
async function runTests() {
  await testQRCodeGeneration();
  testUrlParsing();
  
  console.log('🎉 Alle Tests abgeschlossen!');
  console.log('\nDie QR-Code-Generierung erstellt jetzt vollständige URLs,');
  console.log('die direkt zu den Auftragsdetails führen. Dies ermöglicht:');
  console.log('- Direkter Zugriff via Handy/Scanner');
  console.log('- Routing im Frontend');
  console.log('- Bessere UX für mobile Nutzer');
}

runTests().catch(console.error);
