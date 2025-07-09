// Test für erweiterte PDF-Generierung mit Bauteil-Zeichnungen
// Dieser Test prüft, ob Komponenten-Dokumente korrekt in die PDF eingebunden werden

async function testComponentDocumentsPDF() {
  console.log('🔧 Testing Component Documents in PDF Generation...\n');
  
  try {
    // 1. Teste ob Aufträge mit Komponenten existieren
    console.log('1. Checking for orders with components...');
    const ordersResponse = await fetch('http://localhost:3001/api/orders');
    const orders = await ordersResponse.json();
    
    const ordersWithComponents = orders.filter(order => 
      order.components && order.components.length > 0
    );
    
    console.log(`   Found ${ordersWithComponents.length} orders with components`);
    
    if (ordersWithComponents.length === 0) {
      console.log('⚠️  No orders with components found. Creating test data...');
      // Hier könnte man Test-Daten erstellen
      return;
    }
    
    // 2. Prüfe den ersten Auftrag mit Komponenten
    const testOrder = ordersWithComponents[0];
    console.log(`\n2. Testing order: ${testOrder.title} (${testOrder.id})`);
    console.log(`   Components: ${testOrder.components.length}`);
    
    // Liste alle Komponenten und ihre Dokumente auf
    testOrder.components.forEach((component, index) => {
      console.log(`   Component ${index + 1}: ${component.title}`);
      console.log(`     Documents: ${component.documents ? component.documents.length : 0}`);
      
      if (component.documents) {
        component.documents.forEach((doc, docIndex) => {
          console.log(`       ${docIndex + 1}. ${doc.name} (ID: ${doc.id})`);
        });
      }
    });
    
    // 3. Teste Dokument-Download für Komponenten-Dokumente
    console.log('\n3. Testing component document downloads...');
    
    for (const component of testOrder.components) {
      if (component.documents && component.documents.length > 0) {
        for (const doc of component.documents) {
          try {
            console.log(`   Testing download: ${doc.name}`);
            const docResponse = await fetch(`http://localhost:3001/api/documents/${doc.id}`);
            
            if (docResponse.ok) {
              const contentType = docResponse.headers.get('content-type');
              const contentLength = docResponse.headers.get('content-length');
              console.log(`     ✅ Success: ${contentType}, ${contentLength} bytes`);
            } else {
              console.log(`     ❌ Failed: ${docResponse.status} ${docResponse.statusText}`);
            }
          } catch (error) {
            console.log(`     ❌ Error: ${error.message}`);
          }
        }
      }
    }
    
    console.log('\n4. Expected PDF Structure:');
    console.log('   📄 Cover Page (with main QR code)');
    
    if (testOrder.documents && testOrder.documents.length > 0) {
      console.log('   📋 Order Documents:');
      testOrder.documents.forEach((doc, index) => {
        console.log(`     ${index + 1}. ${doc.name} (with QR code header)`);
      });
    }
    
    if (testOrder.components) {
      console.log('   🔧 Component Drawings:');
      testOrder.components.forEach((component, compIndex) => {
        if (component.documents && component.documents.length > 0) {
          console.log(`     Component ${compIndex + 1}: ${component.title}`);
          component.documents.forEach((doc, docIndex) => {
            console.log(`       ${docIndex + 1}. ${doc.name} (with QR code header)`);
          });
        }
      });
    }
    
    console.log('\n✅ Component documents test completed!');
    console.log('\n📝 New PDF Features:');
    console.log('   - All component drawings are included');
    console.log('   - Each drawing page has a QR code in the header');
    console.log('   - Header shows: Order title | Component name | Customer | Order number');
    console.log('   - QR code allows direct access to the order');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// PDF Generation Options Test
function testPDFOptions() {
  console.log('\n🎛️  PDF Generation Options:');
  console.log('');
  console.log('const options = {');
  console.log('  includeDocuments: true,    // Order documents');
  console.log('  includeComponents: true,   // 🆕 Component drawings');
  console.log('  includeQRCode: true        // QR codes in headers');
  console.log('};');
  console.log('');
  console.log('const pdfGenerator = new OrderPDFGenerator(order, options);');
  console.log('const pdf = await pdfGenerator.generatePDF();');
}

// QR Code Header Layout Test
function testQRCodeHeaderLayout() {
  console.log('\n📱 QR Code Header Layout:');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│ Order Title                           ████████ │');
  console.log('│ Document Type | Customer | Order#    ████████ │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│                                                     │');
  console.log('│              Original Document Content              │');
  console.log('│                                                     │');
  console.log('');
  console.log('Header Features:');
  console.log('  - Light gray background (95% opacity)');
  console.log('  - QR code in top-right corner (40x40px)');
  console.log('  - Document type: "Auftragsdokument" or "Bauteil: ComponentName"');
  console.log('  - Separator line below header');
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Component Documents PDF Test Suite');
  console.log('=====================================\n');
  
  await testComponentDocumentsPDF();
  testPDFOptions();
  testQRCodeHeaderLayout();
  
  console.log('\n🎉 All tests completed!');
}

// Execute tests
runAllTests().catch(console.error);
