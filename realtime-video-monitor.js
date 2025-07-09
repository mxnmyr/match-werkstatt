// Real-time Video Element Monitor - führe dies während des QR-Scanner-Starts aus

console.log('🔄 Real-time Video Element Monitor...');

let monitoring = false;
let monitorInterval;

function startVideoMonitoring() {
  if (monitoring) {
    console.log('⚠️ Monitoring already running');
    return;
  }
  
  monitoring = true;
  console.log('🚀 Starting real-time video monitoring...');
  
  monitorInterval = setInterval(() => {
    const video = document.querySelector('video');
    
    if (!video) {
      console.log('❌ No video element');
      return;
    }
    
    const timestamp = new Date().toLocaleTimeString();
    const state = {
      time: timestamp,
      readyState: video.readyState,
      paused: video.paused,
      currentTime: video.currentTime.toFixed(2),
      dimensions: `${video.videoWidth}x${video.videoHeight}`,
      srcObject: !!video.srcObject,
      display: getComputedStyle(video).display,
      autoplay: video.autoplay,
      muted: video.muted
    };
    
    // Nur loggen wenn sich etwas ändert
    if (!window.lastVideoState || JSON.stringify(state) !== JSON.stringify(window.lastVideoState)) {
      console.log('📹 Video State Change:', state);
      window.lastVideoState = state;
      
      // Spezielle Checks
      if (state.srcObject && state.readyState === 0) {
        console.log('⚠️ Stream connected but no data - possible browser issue');
      }
      
      if (state.readyState >= 2 && state.dimensions === '0x0') {
        console.log('⚠️ Video has data but no dimensions - checking stream...');
        if (video.srcObject) {
          const stream = video.srcObject;
          const tracks = stream.getTracks();
          console.log('📹 Stream details:', {
            active: stream.active,
            tracks: tracks.map(t => ({ kind: t.kind, readyState: t.readyState, enabled: t.enabled }))
          });
        }
      }
      
      if (state.readyState >= 2 && state.paused && state.autoplay) {
        console.log('🎬 Attempting to play video...');
        video.play().then(() => {
          console.log('✅ Video play successful');
        }).catch(err => {
          console.error('❌ Video play failed:', err);
        });
      }
    }
  }, 500);
  
  console.log('✅ Real-time monitoring started (every 500ms)');
  console.log('💡 Use stopVideoMonitoring() to stop');
}

function stopVideoMonitoring() {
  if (!monitoring) {
    console.log('⚠️ No monitoring running');
    return;
  }
  
  monitoring = false;
  clearInterval(monitorInterval);
  console.log('🛑 Video monitoring stopped');
}

// Global functions
window.startVideoMonitoring = startVideoMonitoring;
window.stopVideoMonitoring = stopVideoMonitoring;

// Auto-start
startVideoMonitoring();

// Auto-stop after 30 seconds
setTimeout(() => {
  if (monitoring) {
    console.log('⏰ Auto-stopping monitoring after 30 seconds');
    stopVideoMonitoring();
  }
}, 30000);
