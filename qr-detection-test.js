// QR-Code Detection Test - führe dies aus während der QR-Scanner läuft

console.log('🔍 QR-Code Detection Test...');

function testQRDetection() {
  const video = document.querySelector('video');
  
  if (!video) {
    console.log('❌ No video element found');
    return;
  }
  
  if (!video.srcObject || video.videoWidth === 0) {
    console.log('❌ Video not ready for testing');
    console.log(`Video state: srcObject=${!!video.srcObject}, dimensions=${video.videoWidth}x${video.videoHeight}`);
    return;
  }
  
  console.log('✅ Video ready for QR detection test');
  console.log(`📹 Video: ${video.videoWidth}x${video.videoHeight}, readyState=${video.readyState}`);
  
  // Canvas erstellen und Video-Frame erfassen
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  console.log('🖼️ Capturing current video frame...');
  
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Canvas in DOM für visuelle Kontrolle
    canvas.style.position = 'fixed';
    canvas.style.top = '10px';
    canvas.style.left = '10px';
    canvas.style.width = '200px';
    canvas.style.height = '150px';
    canvas.style.border = '2px solid red';
    canvas.style.zIndex = '10000';
    canvas.style.backgroundColor = 'white';
    document.body.appendChild(canvas);
    
    console.log('✅ Frame captured and displayed (red border, top-left corner)');
    console.log('🖼️ Canvas size:', canvas.width, 'x', canvas.height);
    
    // Test Data-URL Generation
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    console.log('📄 Data URL length:', dataUrl.length);
    console.log('📄 Data URL preview:', dataUrl.substring(0, 100) + '...');
    
    // Versuche QR-Code-Dekodierung zu simulieren
    console.log('🔍 Testing QR detection manually...');
    console.log('💡 Hold a QR code in front of the camera now!');
    
    // ZXing Test (falls verfügbar)
    if (window.ZXing) {
      console.log('📚 ZXing library available for testing');
      
      try {
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        
        console.log('🔍 Attempting ZXing decode on current frame...');
        
        codeReader.decodeFromImage(dataUrl).then(result => {
          console.log('🎯 QR-Code DETECTED!', result.getText());
        }).catch(err => {
          console.log('ℹ️ No QR-Code detected in current frame (normal if no QR code visible)');
          console.log('Error:', err.name);
        });
      } catch (err) {
        console.log('⚠️ Could not use ZXing for testing:', err);
      }
    } else {
      console.log('⚠️ ZXing not available - check if library is loaded');
      console.log('💡 Available objects:', Object.keys(window).filter(k => k.toLowerCase().includes('zx')));
    }
    
    // Canvas nach 10 Sekunden entfernen
    setTimeout(() => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
        console.log('🗑️ Test canvas removed');
      }
    }, 10000);
    
  } catch (error) {
    console.error('❌ Frame capture failed:', error);
  }
}

// Automatischer Test
testQRDetection();

// Wiederholbarer Test
window.testQRDetection = testQRDetection;
console.log('💡 Use testQRDetection() to run this test again');

// Kontinuierlicher Test (alle 5 Sekunden)
let continuousTest = false;
function startContinuousQRTest() {
  if (continuousTest) {
    console.log('⚠️ Continuous test already running');
    return;
  }
  
  continuousTest = true;
  console.log('🔄 Starting continuous QR detection test (every 5 seconds)...');
  
  const interval = setInterval(() => {
    if (!continuousTest) {
      clearInterval(interval);
      return;
    }
    
    console.log('\n🔄 Continuous QR test...');
    testQRDetection();
  }, 5000);
}

function stopContinuousQRTest() {
  continuousTest = false;
  console.log('🛑 Stopped continuous QR test');
}

window.startContinuousQRTest = startContinuousQRTest;
window.stopContinuousQRTest = stopContinuousQRTest;

console.log('💡 Use startContinuousQRTest() for continuous testing');
console.log('💡 Use stopContinuousQRTest() to stop');
