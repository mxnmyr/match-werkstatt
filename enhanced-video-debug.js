// Enhanced Video Debug Script für QR-Scanner
// Führe dies in der Browser-Konsole aus, nachdem du den QR-Scanner geöffnet hast

console.log('🔍 Enhanced QR-Scanner Video Debug...');

function fullVideoDebug() {
  const video = document.querySelector('video');
  
  if (!video) {
    console.log('❌ No video element found');
    return false;
  }
  
  console.log('✅ Video element found');
  console.log('📹 Video element details:');
  console.log('  DOM:', video);
  console.log('  Parent:', video.parentElement);
  console.log('  Computed style:', window.getComputedStyle(video));
  
  // Basis-Eigenschaften
  console.log('📊 Video properties:');
  console.log(`  - videoWidth: ${video.videoWidth}`);
  console.log(`  - videoHeight: ${video.videoHeight}`);
  console.log(`  - currentTime: ${video.currentTime}`);
  console.log(`  - duration: ${video.duration}`);
  console.log(`  - readyState: ${video.readyState} (${getReadyStateText(video.readyState)})`);
  console.log(`  - networkState: ${video.networkState}`);
  console.log(`  - paused: ${video.paused}`);
  console.log(`  - ended: ${video.ended}`);
  console.log(`  - muted: ${video.muted}`);
  console.log(`  - autoplay: ${video.autoplay}`);
  console.log(`  - playsInline: ${video.playsInline}`);
  
  // Stream-Informationen
  if (video.srcObject) {
    console.log('✅ Video has srcObject (MediaStream)');
    const stream = video.srcObject;
    console.log('📹 Stream details:');
    console.log('  Stream ID:', stream.id);
    console.log('  Active:', stream.active);
    
    const tracks = stream.getTracks();
    console.log(`📹 Stream tracks (${tracks.length}):`);
    tracks.forEach((track, i) => {
      console.log(`  Track ${i}:`);
      console.log(`    - kind: ${track.kind}`);
      console.log(`    - label: ${track.label}`);
      console.log(`    - readyState: ${track.readyState}`);
      console.log(`    - enabled: ${track.enabled}`);
      console.log(`    - muted: ${track.muted}`);
      
      if (track.kind === 'video') {
        const settings = track.getSettings();
        console.log(`    - settings:`, settings);
      }
    });
  } else {
    console.log('❌ Video has no srcObject');
  }
  
  // CSS-Eigenschaften
  const style = window.getComputedStyle(video);
  console.log('🎨 CSS properties:');
  console.log(`  - display: ${style.display}`);
  console.log(`  - visibility: ${style.visibility}`);
  console.log(`  - opacity: ${style.opacity}`);
  console.log(`  - width: ${style.width}`);
  console.log(`  - height: ${style.height}`);
  console.log(`  - transform: ${style.transform}`);
  console.log(`  - z-index: ${style.zIndex}`);
  console.log(`  - position: ${style.position}`);
  
  // Versuche Video zu spielen
  if (video.paused && video.readyState >= 2) {
    console.log('🎬 Attempting to play video...');
    video.play().then(() => {
      console.log('✅ Video play successful');
    }).catch(err => {
      console.error('❌ Video play failed:', err);
    });
  }
  
  return true;
}

function getReadyStateText(state) {
  switch(state) {
    case 0: return 'HAVE_NOTHING';
    case 1: return 'HAVE_METADATA';
    case 2: return 'HAVE_CURRENT_DATA';
    case 3: return 'HAVE_FUTURE_DATA';
    case 4: return 'HAVE_ENOUGH_DATA';
    default: return 'UNKNOWN';
  }
}

function monitorVideoChanges() {
  console.log('🔄 Starting video change monitoring (15 seconds)...');
  let count = 0;
  
  const interval = setInterval(() => {
    count++;
    console.log(`\n📊 Monitor Check #${count}:`);
    
    const video = document.querySelector('video');
    if (video) {
      console.log(`  readyState: ${video.readyState}, paused: ${video.paused}, srcObject: ${!!video.srcObject}`);
      console.log(`  dimensions: ${video.videoWidth}x${video.videoHeight}, currentTime: ${video.currentTime.toFixed(2)}`);
    } else {
      console.log('  No video element found');
    }
    
    if (count >= 15) {
      clearInterval(interval);
      console.log('\n✅ Video monitoring completed');
    }
  }, 1000);
}

// Event-Listener für Video-Events
function attachVideoEventListeners() {
  const video = document.querySelector('video');
  if (!video) {
    console.log('❌ No video element for event listeners');
    return;
  }
  
  console.log('📡 Attaching video event listeners...');
  
  const events = [
    'loadstart', 'durationchange', 'loadedmetadata', 'loadeddata',
    'progress', 'canplay', 'canplaythrough', 'play', 'pause',
    'seeking', 'seeked', 'ended', 'error', 'timeupdate', 'volumechange'
  ];
  
  events.forEach(eventName => {
    video.addEventListener(eventName, (e) => {
      console.log(`🎬 Video Event: ${eventName}`, e);
    });
  });
  
  console.log('✅ Event listeners attached');
}

// Hauptfunktion
function runEnhancedDebug() {
  console.log('🚀 Starting enhanced video debug...\n');
  
  // Sofortiger Check
  fullVideoDebug();
  
  // Event-Listener anhängen
  attachVideoEventListeners();
  
  // Kontinuierliches Monitoring starten
  setTimeout(() => {
    console.log('\n🔄 Starting continuous monitoring...');
    monitorVideoChanges();
  }, 2000);
  
  // Canvas-Test nach 5 Sekunden
  setTimeout(() => {
    console.log('\n🖼️ Testing canvas capture...');
    testCanvasCapture();
  }, 5000);
}

function testCanvasCapture() {
  const video = document.querySelector('video');
  if (!video || !video.srcObject) {
    console.log('❌ No video or stream for canvas test');
    return;
  }
  
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    console.log('❌ Video dimensions are 0, cannot capture');
    return;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  try {
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL();
    console.log('✅ Canvas capture successful');
    console.log('🖼️ Data URL length:', dataUrl.length);
    console.log('🖼️ Canvas dimensions:', canvas.width, 'x', canvas.height);
    
    // Kleine Preview im Log
    console.log('🖼️ Preview (first 100 chars):', dataUrl.substring(0, 100));
  } catch (error) {
    console.error('❌ Canvas capture failed:', error);
  }
}

// Auto-start
runEnhancedDebug();
