// Quick Video Element Check - führe dies in der Browser-Konsole aus

console.log('🔍 Quick Video Element Check...');

function quickVideoCheck() {
  const video = document.querySelector('video');
  
  if (!video) {
    console.log('❌ Still no video element found');
    console.log('🔍 Checking for any video elements in the page...');
    const allVideos = document.querySelectorAll('video');
    console.log(`Found ${allVideos.length} video elements total`);
    return false;
  }
  
  console.log('✅ Video element found!');
  console.log('Video element:', video);
  console.log('Video parent:', video.parentElement);
  
  const style = window.getComputedStyle(video);
  console.log('📊 Video state:');
  console.log(`  - display: ${style.display}`);
  console.log(`  - visibility: ${style.visibility}`);
  console.log(`  - position: ${style.position}`);
  console.log(`  - top: ${style.top}`);
  console.log(`  - srcObject: ${!!video.srcObject}`);
  console.log(`  - readyState: ${video.readyState}`);
  console.log(`  - paused: ${video.paused}`);
  
  // Versuche das Video sichtbar zu machen für Tests
  if (style.display === 'none' || style.position === 'absolute') {
    console.log('🔧 Making video visible for testing...');
    video.style.display = 'block';
    video.style.position = 'relative';
    video.style.top = 'auto';
    video.style.border = '3px solid red';
    video.style.backgroundColor = 'yellow';
    console.log('✅ Video should now be visible with red border and yellow background');
  }
  
  return true;
}

// Test ausführen
const found = quickVideoCheck();

if (found) {
  console.log('🎉 Video element exists! Now you can run the full video test.');
  console.log('💡 Try the enhanced-video-debug.js script now.');
} else {
  console.log('❌ Video element still not found. Check QR-Scanner component rendering.');
}

// Zusätzlicher Check für React-Komponenten
console.log('🔍 Checking React component state...');
const qrScanner = document.querySelector('[class*="fixed"][class*="inset-0"]');
if (qrScanner) {
  console.log('✅ QR-Scanner modal found');
} else {
  console.log('❌ QR-Scanner modal not found - is the scanner open?');
}
