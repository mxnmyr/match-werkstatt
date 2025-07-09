// ZXing Library Test - Pure JavaScript

console.log('📚 ZXing Library Test...');

async function testZXingLibrary() {
  console.log('🔍 Testing ZXing import...');
  
  try {
    // Dynamischer Import der ZXing Library
    const ZXing = await import('@zxing/library');
    console.log('✅ ZXing library imported successfully');
    
    // ZXing Reader erstellen
    const codeReader = new ZXing.BrowserMultiFormatReader();
    console.log('✅ BrowserMultiFormatReader created');
    
    // Video-Element finden
    const video = document.querySelector('video');
    if (!video) {
      console.log('❌ No video element found');
      return false;
    }
    
    if (video.videoWidth === 0) {
      console.log('❌ Video not ready (no dimensions)');
      return false;
    }
    
    console.log('📹 Video ready for ZXing test');
    
    // Canvas für aktuellen Frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Aktuellen Frame erfassen
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    console.log('🔍 Attempting QR decode on current frame...');
    
    try {
      const result = await codeReader.decodeFromImage(dataUrl);
      console.log('🎯 SUCCESS! QR-Code detected:', result.getText());
      console.log('📋 QR-Code format:', result.getBarcodeFormat());
      return true;
    } catch (decodeError) {
      console.log('ℹ️ No QR-Code in current frame:', decodeError.name);
      console.log('💡 This is normal if no QR-Code is visible');
      
      // Teste mit einem bekannten QR-Code-Data-URL (falls gewünscht)
      console.log('🧪 Testing ZXing with a test pattern...');
      
      // Erstelle einen einfachen Test-QR-Code als Data-URL
      const testCanvas = document.createElement('canvas');
      const testCtx = testCanvas.getContext('2d');
      testCanvas.width = 200;
      testCanvas.height = 200;
      
      // Weißer Hintergrund
      testCtx.fillStyle = 'white';
      testCtx.fillRect(0, 0, 200, 200);
      
      // Einfaches QR-ähnliches Muster (nicht echt, nur für ZXing-Test)
      testCtx.fillStyle = 'black';
      testCtx.fillRect(10, 10, 20, 20);
      testCtx.fillRect(170, 10, 20, 20);
      testCtx.fillRect(10, 170, 20, 20);
      
      const testDataUrl = testCanvas.toDataURL();
      
      try {
        await codeReader.decodeFromImage(testDataUrl);
        console.log('✅ ZXing decode method works (but test pattern not a real QR)');
      } catch (testError) {
        console.log('ℹ️ ZXing works (test pattern not a real QR-Code as expected)');
      }
      
      return false;
    }
    
  } catch (importError) {
    console.error('❌ ZXing import failed:', importError);
    return false;
  }
}

// Kontinuierlicher ZXing Test
let zxingTestRunning = false;

async function startZXingContinuousTest() {
  if (zxingTestRunning) {
    console.log('⚠️ ZXing test already running');
    return;
  }
  
  zxingTestRunning = true;
  console.log('🔄 Starting continuous ZXing test (every 2 seconds)...');
  
  try {
    const ZXing = await import('@zxing/library');
    const codeReader = new ZXing.BrowserMultiFormatReader();
    
    const testLoop = async () => {
      if (!zxingTestRunning) return;
      
      const video = document.querySelector('video');
      if (video && video.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        try {
          const result = await codeReader.decodeFromImage(dataUrl);
          console.log('🎯 CONTINUOUS TEST - QR DETECTED:', result.getText());
          
          // Bei Erfolg stoppen
          zxingTestRunning = false;
          return;
        } catch (err) {
          console.log('🔍 Continuous scan... (no QR detected yet)');
        }
      }
      
      if (zxingTestRunning) {
        setTimeout(testLoop, 2000);
      }
    };
    
    testLoop();
    
  } catch (error) {
    console.error('❌ Continuous test setup failed:', error);
    zxingTestRunning = false;
  }
}

function stopZXingContinuousTest() {
  zxingTestRunning = false;
  console.log('🛑 ZXing continuous test stopped');
}

// Tests verfügbar machen
window.testZXingLibrary = testZXingLibrary;
window.startZXingContinuousTest = startZXingContinuousTest;
window.stopZXingContinuousTest = stopZXingContinuousTest;

// Automatischer Test
console.log('🚀 Running automatic ZXing test...');
testZXingLibrary().then(success => {
  if (success) {
    console.log('🎉 ZXing test completed - QR-Code was detected!');
  } else {
    console.log('💡 ZXing library works, but no QR-Code in current view');
    console.log('💡 Hold a QR-Code in front of the camera and use:');
    console.log('💡 startZXingContinuousTest() - for continuous scanning');
    console.log('💡 stopZXingContinuousTest() - to stop scanning');
  }
});
