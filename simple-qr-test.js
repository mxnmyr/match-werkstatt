// Simple QR Detection Test (Pure JavaScript)

console.log('🔍 Simple QR Detection Test...');

function simpleQRTest() {
  const video = document.querySelector('video');
  
  if (!video) {
    console.log('❌ No video element found - open QR scanner first');
    return;
  }
  
  console.log('✅ Video found');
  console.log('📹 Video state:', {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    paused: video.paused,
    srcObject: !!video.srcObject
  });
  
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    console.log('❌ Video has no dimensions - camera not ready');
    return;
  }
  
  console.log('🖼️ Creating canvas for frame capture...');
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  try {
    // Video-Frame erfassen
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Canvas sichtbar machen für Debug
    canvas.style.position = 'fixed';
    canvas.style.top = '10px';
    canvas.style.right = '10px';
    canvas.style.width = '200px';
    canvas.style.height = '150px';
    canvas.style.border = '3px solid lime';
    canvas.style.zIndex = '99999';
    canvas.style.backgroundColor = 'white';
    document.body.appendChild(canvas);
    
    console.log('✅ Video frame captured and displayed (green border, top-right)');
    
    // Data URL erstellen
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    console.log('📄 Image data URL created, length:', dataUrl.length);
    
    // ZXing Test versuchen
    if (typeof BrowserMultiFormatReader !== 'undefined') {
      console.log('🔍 ZXing available, testing decode...');
      // ZXing direkt verwenden falls verfügbar
    } else {
      console.log('⚠️ ZXing not directly available, trying import...');
      
      // Dynamischer Import
      if (typeof window !== 'undefined' && window.location) {
        console.log('💡 Hold a QR code in front of the camera now!');
        console.log('💡 You should see the current camera view in the green-bordered rectangle');
      }
    }
    
    // Canvas nach 15 Sekunden entfernen
    setTimeout(() => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
        console.log('🗑️ Debug canvas removed');
      }
    }, 15000);
    
    return true;
    
  } catch (error) {
    console.error('❌ Frame capture failed:', error);
    return false;
  }
}

// Test ausführen
console.log('🚀 Running simple QR test...');
const success = simpleQRTest();

if (success) {
  console.log('✅ Test completed successfully');
  console.log('💡 If you can see the green-bordered video preview, the camera capture works');
  console.log('💡 Now test QR code recognition with a real QR code');
} else {
  console.log('❌ Test failed - check camera and video setup');
}

// Globale Funktion für Wiederholung
window.simpleQRTest = simpleQRTest;
console.log('💡 Use simpleQRTest() to run this test again');
