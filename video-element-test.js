// Test-Script für QR-Scanner Video-Element-Integration
// Führe dieses Script in der Browser-Konsole aus, nachdem du den QR-Scanner geöffnet hast

console.log('🔍 Testing QR-Scanner Video Element Integration...');

function checkVideoElement() {
  const video = document.querySelector('video');
  
  if (!video) {
    console.log('❌ No video element found');
    return false;
  }
  
  console.log('✅ Video element found');
  console.log('📹 Video properties:');
  console.log(`  - Width: ${video.videoWidth}x${video.videoHeight}`);
  console.log(`  - CurrentTime: ${video.currentTime}`);
  console.log(`  - ReadyState: ${video.readyState}`);
  console.log(`  - Paused: ${video.paused}`);
  console.log(`  - Muted: ${video.muted}`);
  console.log(`  - AutoPlay: ${video.autoplay}`);
  console.log(`  - PlaysInline: ${video.playsInline}`);
  
  if (video.srcObject) {
    console.log('✅ Video has srcObject (MediaStream)');
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    console.log(`📹 Stream tracks: ${tracks.length}`);
    tracks.forEach((track, i) => {
      console.log(`  Track ${i}: ${track.kind} - ${track.label} (${track.readyState})`);
    });
  } else {
    console.log('❌ Video has no srcObject');
  }
  
  return true;
}

function monitorVideo() {
  console.log('\n🔄 Starting video monitoring (10 seconds)...');
  let count = 0;
  
  const interval = setInterval(() => {
    count++;
    console.log(`\n📊 Check #${count}:`);
    checkVideoElement();
    
    if (count >= 10) {
      clearInterval(interval);
      console.log('\n✅ Video monitoring completed');
    }
  }, 1000);
}

// Sofortiger Check
checkVideoElement();

// Starte kontinuierliches Monitoring
setTimeout(() => {
  console.log('\n🎬 Starting continuous monitoring...');
  monitorVideo();
}, 2000);
