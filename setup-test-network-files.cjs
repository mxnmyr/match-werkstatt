const fs = require('fs');
const path = require('path');

// Setup test network files
const setupTestFiles = () => {
  console.log('=== Setup: Test-Netzwerkdateien ===');
  
  // Create test network path
  const networkPath = 'C:\\Users\\maxim\\OneDrive\\Desktop\\Aufträge';
  
  if (!fs.existsSync(networkPath)) {
    console.log('❌ Netzwerkpfad existiert nicht:', networkPath);
    console.log('💡 Erstelle den Pfad manuell oder ändere den Pfad in diesem Script');
    return;
  }
  
  console.log('✅ Netzwerkpfad gefunden:', networkPath);
  
  // Create test order folders with files
  const testOrders = [
    { orderNumber: 'F-2508-1', orderId: '6889d5cd930648e0f515e3b0' },
    { orderNumber: 'S-2508-1', orderId: '689c84461a875cb6a62695d5' }
  ];
  
  testOrders.forEach(order => {
    const orderFolderPath = path.join(networkPath, order.orderNumber);
    
    // Create order folder if it doesn't exist
    if (!fs.existsSync(orderFolderPath)) {
      fs.mkdirSync(orderFolderPath, { recursive: true });
      console.log(`📁 Erstellt: ${orderFolderPath}`);
    }
    
    // Create test files
    const testFiles = [
      { name: 'technische_zeichnung.pdf', content: 'PDF-Inhalt für technische Zeichnung' },
      { name: 'material_spezifikation.txt', content: 'Material: Aluminium 6061\nDicke: 3mm\nOberfläche: eloxiert' },
      { name: 'fertigungsanleitung.docx', content: 'Fertigungsanleitung für Auftrag ' + order.orderNumber },
      { name: 'foto_teil1.jpg', content: 'JPEG-Bilddaten würden hier stehen' },
      { name: 'cam_datei.nc', content: 'G-Code Inhalt für CNC-Bearbeitung' }
    ];
    
    testFiles.forEach(file => {
      const filePath = path.join(orderFolderPath, file.name);
      
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, file.content + '\\n\\nErstellt: ' + new Date().toISOString());
        console.log(`📄 Erstellt: ${file.name}`);
      } else {
        console.log(`📄 Existiert bereits: ${file.name}`);
      }
    });
    
    console.log(`✅ Setup für ${order.orderNumber} abgeschlossen`);
  });
  
  console.log('\\n🎯 Test-Setup abgeschlossen!');
  console.log('💡 Du kannst jetzt die Netzwerkdateien-Funktionalität testen:');
  console.log('   1. Starte den Server: node server.cjs');
  console.log('   2. Führe den Test aus: node test-network-files.cjs');
  console.log('   3. Öffne die Werkstatt-Ansicht im Browser');
};

setupTestFiles();
