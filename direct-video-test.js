// Direct Video Element Test - Führe dieses Script in der Browser-Konsole aus
// während der QR-Scanner geöffnet ist

console.log('🎥 Direct Video Element Test...');

async function testVideoElementDirectly() {
  console.log('1️⃣ Checking for video element...');
  
  const video = document.querySelector('video');
  if (!video) {
    console.log('❌ No video element found');
    return;
  }
  
  console.log('✅ Video element found:', video);
  console.log('2️⃣ Current video state:');
  console.log(`  - videoWidth: ${video.videoWidth}`);
  console.log(`  - videoHeight: ${video.videoHeight}`);
  console.log(`  - readyState: ${video.readyState}`);
  console.log(`  - paused: ${video.paused}`);
  console.log(`  - srcObject: ${!!video.srcObject}`);
  console.log(`  - currentTime: ${video.currentTime}`);
  
  const style = window.getComputedStyle(video);
  console.log('3️⃣ Video CSS:');
  console.log(`  - display: ${style.display}`);
  console.log(`  - visibility: ${style.visibility}`);
  console.log(`  - opacity: ${style.opacity}`);
  console.log(`  - width: ${style.width}`);
  console.log(`  - height: ${style.height}`);
  console.log(`  - position: ${style.position}`);
  console.log(`  - z-index: ${style.zIndex}`);
  
  if (!video.srcObject) {
    console.log('4️⃣ Creating new stream...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      console.log('✅ Stream created:', stream);
      
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      
      // Force visible
      video.style.display = 'block';
      video.style.width = '100%';
      video.style.height = '256px';
      video.style.backgroundColor = 'red'; // Debug background
      video.style.border = '3px solid lime'; // Debug border
      
      console.log('5️⃣ Waiting for video to load...');
      
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded');
          video.play().then(() => {
            console.log('✅ Video playing');
            console.log(`  - Final dimensions: ${video.videoWidth}x${video.videoHeight}`);
            resolve(true);
          }).catch(err => {
            console.error('❌ Video play failed:', err);
            resolve(false);
          });
        };
        
        // Fallback
        setTimeout(() => {
          console.log('⏰ Timeout - checking video state...');
          console.log(`  - readyState: ${video.readyState}`);
          console.log(`  - paused: ${video.paused}`);
          console.log(`  - currentTime: ${video.currentTime}`);
          resolve(video.currentTime > 0);
        }, 3000);
      });
      
    } catch (error) {
      console.error('❌ Stream creation failed:', error);
      return false;
    }
  } else {
    console.log('4️⃣ Stream already exists, testing play...');
    
    // Force visible
    video.style.display = 'block';
    video.style.width = '100%';
    video.style.height = '256px';
    video.style.backgroundColor = 'red';
    video.style.border = '3px solid lime';
    
    if (video.paused) {
      try {
        await video.play();
        console.log('✅ Video resumed');
      } catch (err) {
        console.error('❌ Video play failed:', err);
      }
    }
    
    return video.currentTime > 0 && !video.paused;
  }
}

// Führe Test aus
testVideoElementDirectly().then(success => {
  console.log(`\n🎯 Video Test Result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (success) {
    console.log('🎉 Video should now be visible with red background and green border!');
  } else {
    console.log('🔧 Video test failed. Check the logs above for details.');
  }
});

// Zusätzliche Debug-Funktion
window.debugVideo = function() {
  const video = document.querySelector('video');
  if (video) {
    console.log('📹 Current video state:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      currentTime: video.currentTime,
      srcObject: !!video.srcObject,
      style: {
        display: video.style.display,
        width: video.style.width,
        height: video.style.height
      }
    });
  } else {
    console.log('❌ No video element found');
  }
};

console.log('💡 Use debugVideo() function to check video state anytime');
