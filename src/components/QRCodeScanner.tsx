import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { X, Camera, Search } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!codeReader.current || !videoRef.current) return;
    
    try {
      setError(null);
      setIsScanning(true);
      
      const devices = await codeReader.current.listVideoInputDevices();
      if (devices.length === 0) {
        throw new Error('Keine Kamera gefunden');
      }

      // Bevorzuge die Rückkamera falls verfügbar
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      ) || devices[0];

      await codeReader.current.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const scannedText = result.getText();
            console.log('QR-Code gescannt:', scannedText);
            
            // Kamera sofort stoppen nach erfolgreichem Scan
            stopScanning();
            
            // Prüfen ob es eine URL ist (enthält #/order/)
            if (scannedText.includes('#/order/')) {
              // Extrahiere die Auftragsnummer aus der URL
              const orderMatch = scannedText.match(/#\/order\/([^\/?\s]+)/);
              if (orderMatch && orderMatch[1]) {
                onScan(orderMatch[1]);
              } else {
                onScan(scannedText);
              }
            } else {
              // Der QR-Code enthält direkt die Auftragsnummer
              onScan(scannedText);
            }
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('Scanner-Fehler:', error);
            setError('Fehler beim Scannen');
          }
        }
      );
    } catch (err) {
      console.error('Fehler beim Starten des Scanners:', err);
      let errorMessage = 'Fehler beim Zugriff auf die Kamera';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Kamera-Zugriff verweigert. Bitte erlauben Sie den Kamera-Zugriff in Ihren Browser-Einstellungen.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Keine Kamera gefunden. Stellen Sie sicher, dass eine Kamera angeschlossen ist.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Kamera wird bereits von einer anderen Anwendung verwendet.';
        }
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      stopScanning();
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">QR-Code Scanner</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <strong>📱 QR-Code scannen:</strong><br/>
            1. Klicken Sie auf "Kamera aktivieren" um die Berechtigung zu erteilen<br/>
            2. Halten Sie den QR-Code vor die Kamera<br/>
            3. Oder geben Sie die Auftragsnummer manuell ein
          </div>
          
          {/* Kamera-Scanner */}
          <div className="mb-6">
            
            {!isScanning ? (
              <div className="text-center space-y-4">
                <div className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-8 rounded-lg">
                  <Camera className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Kamera für QR-Code-Scan</h3>
                  <p className="text-blue-100 mb-4">
                    Klicken Sie auf den Button um die Kamera zu aktivieren und QR-Codes zu scannen.
                  </p>
                  <button
                    onClick={startScanning}
                    className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold flex items-center mx-auto"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    🎥 Kamera aktivieren
                  </button>
                </div>
                
                {error && (
                  <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
                    <strong>⚠️ Kamera-Problem:</strong><br/>
                    {error}
                    <button
                      onClick={startScanning}
                      className="block w-full mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                    >
                      🔄 Erneut versuchen
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-green-600 mb-2">
                    📷 Kamera aktiv - QR-Code scannen
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Halten Sie den QR-Code in den grünen Rahmen
                  </p>
                </div>
                
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    style={{ transform: 'scaleX(-1)' }} // Spiegeln für bessere UX
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-4 border-green-400 w-56 h-40 rounded-lg shadow-lg"></div>
                  </div>
                  <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                    📱 QR-Code hier positionieren
                  </div>
                  <div className="absolute bottom-3 right-3 bg-green-500 bg-opacity-90 text-white px-3 py-1 rounded-lg text-sm">
                    <div className="w-2 h-2 bg-white rounded-full inline-block mr-2 animate-pulse"></div>
                    Bereit zum Scannen
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={stopScanning}
                    className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    ⏹️ Stoppen
                  </button>
                  <button
                    onClick={() => {
                      stopScanning();
                      setTimeout(startScanning, 100);
                    }}
                    className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    🔄 Neu starten
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Manuelle Eingabe */}
          <div className="border-t pt-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center">
                <Search className="w-4 h-4 mr-2" />
                Alternative: Auftragsnummer manuell eingeben
              </h4>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="z.B. ORDER123 oder 675c8e7f1234567890abcdef"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center font-medium"
                >
                  <Search className="w-4 h-4 mr-2" />
                  🔍 Auftrag suchen
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
