// Test QR-Code Generation
const QRCode = require('qrcode');

const testOrderNumber = 'F-2507-6';

QRCode.toDataURL(testOrderNumber, {
  width: 200,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  errorCorrectionLevel: 'M'
}).then(url => {
  console.log('QR-Code erfolgreich generiert!');
  console.log('Data URL length:', url.length);
  console.log('Data URL prefix:', url.substring(0, 50) + '...');
}).catch(err => {
  console.error('QR-Code generation failed:', err);
});
