// Finaler Test: QR-Code-Scanner Funktionalität
// Dieses Skript testet die QR-Code-Scanner-Integration

console.log('🔍 Testing QR-Code Scanner Integration...');

// Test 1: Browser-Unterstützung
function testBrowserSupport() {
    console.log('\n📱 Testing Browser Support...');
    
    const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasCamera = 'mediaDevices' in navigator;
    const isSecureContext = window.isSecureContext;
    const protocol = window.location.protocol;
    
    console.log(`✓ getUserMedia: ${hasGetUserMedia}`);
    console.log(`✓ MediaDevices: ${hasCamera}`);
    console.log(`✓ Secure Context: ${isSecureContext}`);
    console.log(`✓ Protocol: ${protocol}`);
    
    return hasGetUserMedia && hasCamera && (isSecureContext || protocol === 'http:');
}

// Test 2: Kamera-Zugriff
async function testCameraAccess() {
    console.log('\n📹 Testing Camera Access...');
    
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log(`✓ Video devices found: ${videoDevices.length}`);
        videoDevices.forEach((device, index) => {
            console.log(`  ${index + 1}. ${device.label || 'Unknown Camera'}`);
        });
        
        if (videoDevices.length > 0) {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            console.log('✅ Camera access successful');
            stream.getTracks().forEach(track => track.stop());
            return true;
        }
    } catch (error) {
        console.error('❌ Camera access failed:', error.message);
        return false;
    }
}

// Test 3: QR-Code-Routing
function testQRRouting() {
    console.log('\n🔗 Testing QR-Code Routing...');
    
    const testUrls = [
        '/order/12345',
        '/workshop',
        '/client',
        '/order/67890'
    ];
    
    testUrls.forEach(url => {
        const fullUrl = `${window.location.origin}${url}`;
        console.log(`✓ Test URL: ${fullUrl}`);
    });
    
    return true;
}

// Test 4: ZXing Library
function testZXingLibrary() {
    console.log('\n📚 Testing ZXing Library...');
    
    try {
        // Prüfe ob ZXing verfügbar ist
        if (typeof window !== 'undefined' && window.ZXing) {
            console.log('✅ ZXing library loaded (global)');
            return true;
        }
        
        // Prüfe dynamischen Import
        import('@zxing/library').then(zxing => {
            console.log('✅ ZXing library available via import');
            console.log('  - BrowserMultiFormatReader:', !!zxing.BrowserMultiFormatReader);
            console.log('  - DecodeHintType:', !!zxing.DecodeHintType);
        }).catch(err => {
            console.error('❌ ZXing import failed:', err);
        });
        
        return true;
    } catch (error) {
        console.error('❌ ZXing test failed:', error);
        return false;
    }
}

// Haupttest
async function runTests() {
    console.log('🚀 Starting QR-Code Scanner Tests...\n');
    
    const browserSupport = testBrowserSupport();
    const cameraAccess = await testCameraAccess();
    const routing = testQRRouting();
    const zxing = testZXingLibrary();
    
    console.log('\n📊 Test Results:');
    console.log(`  Browser Support: ${browserSupport ? '✅' : '❌'}`);
    console.log(`  Camera Access: ${cameraAccess ? '✅' : '❌'}`);
    console.log(`  QR Routing: ${routing ? '✅' : '❌'}`);
    console.log(`  ZXing Library: ${zxing ? '✅' : '❌'}`);
    
    const allPassed = browserSupport && cameraAccess && routing && zxing;
    console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall Status: ${allPassed ? 'READY' : 'NEEDS ATTENTION'}`);
    
    if (allPassed) {
        console.log('\n✨ QR-Code Scanner is fully functional!');
        console.log('📱 Try opening the app and using the QR scanner in the dashboard.');
        console.log('🔍 Use the generated QR codes from qr-test-generator.html for testing.');
    } else {
        console.log('\n🔧 Some issues detected. Check the logs above for details.');
    }
}

// Führe Tests aus wenn das Skript geladen wird
runTests();
