// Test für Kamera-Funktionalität in der React-Anwendung
// Führen Sie dieses Skript in der Browser-Konsole aus (F12)

(async function testCameraInReactApp() {
  console.log('🧪 Testing camera functionality in React app...');
  console.log('📍 Current URL:', window.location.href);
  console.log('🔒 Protocol:', window.location.protocol);
  console.log('🏠 Hostname:', window.location.hostname);
  
  // 1. Prüfe Sicherheitskontext
  const isSecure = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
  
  console.log(`🔐 Secure context: ${isSecure ? '✅ Yes' : '❌ No'}`);
  
  if (!isSecure) {
    console.warn('⚠️ Camera access requires HTTPS or localhost!');
    console.log('💡 Expected URL format: http://localhost:5173');
    return;
  }
  
  // 2. Prüfe MediaDevices API
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('❌ MediaDevices API not supported');
    return;
  }
  console.log('✅ MediaDevices API supported');
  
  // 3. Liste verfügbare Kameras
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    console.log(`📷 Found ${cameras.length} cameras:`, cameras);
  } catch (error) {
    console.error('❌ Failed to list devices:', error);
  }
  
  // 4. Teste Kamera-Zugriff
  try {
    console.log('🎥 Requesting camera access...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    });
    
    console.log('✅ Camera access granted!');
    console.log('📊 Stream details:', {
      id: stream.id,
      active: stream.active,
      tracks: stream.getTracks().length
    });
    
    // Stoppe Stream nach 3 Sekunden
    setTimeout(() => {
      stream.getTracks().forEach(track => track.stop());
      console.log('⏹️ Camera stopped');
    }, 3000);
    
    // Zeige Erfolg in der UI
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #10B981; color: white; padding: 15px;
      border-radius: 8px; font-family: system-ui;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    successMsg.innerHTML = '✅ Kamera funktioniert!<br/>Jetzt QR-Scanner testen.';
    document.body.appendChild(successMsg);
    
    setTimeout(() => successMsg.remove(), 5000);
    
  } catch (error) {
    console.error('❌ Camera access failed:', error);
    
    let errorType = 'Unknown';
    let solution = 'Unbekannter Fehler';
    
    if (error.name === 'NotAllowedError') {
      errorType = 'Permission Denied';
      solution = 'Klicken Sie auf das Kamera-Symbol in der Adressleiste und erlauben Sie den Zugriff';
    } else if (error.name === 'NotFoundError') {
      errorType = 'No Camera Found';
      solution = 'Überprüfen Sie ob eine Kamera angeschlossen ist';
    } else if (error.name === 'NotReadableError') {
      errorType = 'Camera In Use';
      solution = 'Schließen Sie andere Anwendungen die die Kamera verwenden';
    }
    
    console.log(`🔧 Error type: ${errorType}`);
    console.log(`💡 Solution: ${solution}`);
    
    // Zeige Fehler in der UI
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #EF4444; color: white; padding: 15px;
      border-radius: 8px; font-family: system-ui;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 300px;
    `;
    errorMsg.innerHTML = `❌ Kamera-Problem<br/><small>${errorType}: ${solution}</small>`;
    document.body.appendChild(errorMsg);
    
    setTimeout(() => errorMsg.remove(), 8000);
  }
})();

// Anweisung für den Benutzer
console.log(`
🎯 ANWEISUNGEN:
1. Öffnen Sie http://localhost:5173 in Chrome/Firefox/Edge
2. Gehen Sie zur Werkstatt-Ansicht
3. Führen Sie dieses Skript in der Konsole aus (F12)
4. Falls erfolgreich: Testen Sie den QR-Scanner
5. Bei Problemen: Folgen Sie den Lösungshinweisen
`);

export {};
