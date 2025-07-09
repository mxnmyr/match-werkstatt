// Browser QR Code Detection Test
// Copy and paste this into the browser console when the QR scanner is active

console.log('🔍 Starting Browser QR Code Detection Test...');

function findQRScannerComponents() {
  console.log('\n=== QR Scanner Component Analysis ===');
  
  // Find video element
  const videos = document.querySelectorAll('video');
  console.log(`📹 Found ${videos.length} video element(s)`);
  
  videos.forEach((video, index) => {
    console.log(`Video ${index + 1}:`, {
      width: video.videoWidth,
      height: video.videoHeight,
      readyState: video.readyState,
      hasStream: !!video.srcObject,
      playing: !video.paused,
      muted: video.muted,
      autoplay: video.autoplay
    });
  });
  
  // Find canvas elements
  const canvases = document.querySelectorAll('canvas');
  console.log(`🖼️ Found ${canvases.length} canvas element(s)`);
  
  canvases.forEach((canvas, index) => {
    console.log(`Canvas ${index + 1}:`, {
      width: canvas.width,
      height: canvas.height,
      style: canvas.style.cssText
    });
  });
  
  return { videos: Array.from(videos), canvases: Array.from(canvases) };
}

function testVideoCapture(video) {
  if (!video || video.videoWidth === 0) {
    console.log('❌ Video not ready for capture');
    return null;
  }
  
  console.log('\n=== Video Capture Test ===');
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  try {
    ctx.drawImage(video, 0, 0);
    
    // Add visual indicator
    canvas.style.position = 'fixed';
    canvas.style.top = '10px';
    canvas.style.right = '10px';
    canvas.style.width = '200px';
    canvas.style.height = '150px';
    canvas.style.border = '3px solid lime';
    canvas.style.zIndex = '9999';
    canvas.style.background = 'white';
    document.body.appendChild(canvas);
    
    console.log('✅ Video frame captured and displayed (lime border, top-right)');
    
    // Remove after 10 seconds
    setTimeout(() => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }, 10000);
    
    return canvas;
    
  } catch (error) {
    console.error('❌ Video capture failed:', error);
    return null;
  }
}

function testQRDetectionMethods(canvas) {
  if (!canvas) return;
  
  console.log('\n=== QR Detection Methods Test ===');
  
  // Method 1: Data URL
  try {
    const dataUrl = canvas.toDataURL('image/png');
    console.log('✅ Data URL generated:', dataUrl.length, 'bytes');
    
    // Try to detect if there's ZXing available
    if (window.ZXing) {
      console.log('📚 ZXing found, testing detection...');
      try {
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        codeReader.decodeFromImage(dataUrl)
          .then(result => {
            console.log('🎯 QR CODE DETECTED WITH ZXING!');
            console.log('📄 Result:', result.getText());
            console.log('📍 Position:', result.getResultPoints());
          })
          .catch(err => {
            console.log('ℹ️ No QR code detected with ZXing (normal if no QR visible)');
          });
      } catch (error) {
        console.error('❌ ZXing error:', error);
      }
    } else {
      console.log('⚠️ ZXing not found in window object');
      console.log('Available global objects:', Object.keys(window).filter(k => k.toLowerCase().includes('qr') || k.toLowerCase().includes('zx') || k.toLowerCase().includes('code')));
    }
    
  } catch (error) {
    console.error('❌ Data URL generation failed:', error);
  }
  
  // Method 2: Image Data
  try {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log('✅ Image data extracted:', imageData.data.length, 'bytes');
    
    // Simple brightness test to see if image is valid
    let totalBrightness = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      totalBrightness += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (imageData.data.length / 4);
    console.log('💡 Average brightness:', avgBrightness.toFixed(2));
    
    if (avgBrightness < 10) {
      console.log('⚠️ Image seems very dark - check camera exposure');
    } else if (avgBrightness > 240) {
      console.log('⚠️ Image seems very bright - check camera exposure');
    } else {
      console.log('✅ Image brightness looks good');
    }
    
  } catch (error) {
    console.error('❌ Image data extraction failed:', error);
  }
}

function simulateQRScannerLogic() {
  console.log('\n=== Simulating QR Scanner Logic ===');
  
  const components = findQRScannerComponents();
  
  if (components.videos.length === 0) {
    console.log('❌ No video elements found - QR scanner not active?');
    return;
  }
  
  const mainVideo = components.videos[0];
  console.log('📹 Testing main video element...');
  
  if (mainVideo.readyState < 2) {
    console.log('⚠️ Video not ready yet, waiting...');
    setTimeout(simulateQRScannerLogic, 1000);
    return;
  }
  
  const capturedCanvas = testVideoCapture(mainVideo);
  if (capturedCanvas) {
    testQRDetectionMethods(capturedCanvas);
  }
}

function startRealtimeQRTest() {
  console.log('\n=== Starting Realtime QR Test ===');
  console.log('📱 Hold a QR code in front of the camera!');
  
  let testCount = 0;
  const maxTests = 20; // 20 seconds
  
  const interval = setInterval(() => {
    testCount++;
    console.log(`\n--- Test ${testCount}/${maxTests} ---`);
    
    simulateQRScannerLogic();
    
    if (testCount >= maxTests) {
      clearInterval(interval);
      console.log('\n🏁 Realtime test completed');
    }
  }, 1000);
  
  // Make interval accessible for manual stop
  window.qrTestInterval = interval;
  console.log('💡 Use clearInterval(window.qrTestInterval) to stop early');
}

// Export functions to window for manual use
window.findQRScannerComponents = findQRScannerComponents;
window.simulateQRScannerLogic = simulateQRScannerLogic;
window.startRealtimeQRTest = startRealtimeQRTest;

// Auto-run initial test
console.log('\n🚀 Running initial QR scanner test...');
setTimeout(simulateQRScannerLogic, 1000);

console.log('\n💡 Available commands:');
console.log('  - findQRScannerComponents()');
console.log('  - simulateQRScannerLogic()');
console.log('  - startRealtimeQRTest()');
