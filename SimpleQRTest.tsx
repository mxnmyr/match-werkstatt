// Simplified QR Scanner Test - füge diese Komponente temporär in die App ein

import React, { useRef, useEffect, useState } from 'react';

export function SimpleQRTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Initialisierung...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      setStatus('🎥 Kamera-Berechtigung anfordern...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStatus('📹 Video-Element konfigurieren...');
      
      const video = videoRef.current;
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      setStatus('⏳ Warten auf Video-Start...');

      video.onloadedmetadata = async () => {
        setStatus('▶️ Video starten...');
        try {
          await video.play();
          setStatus(`✅ Video läuft: ${video.videoWidth}x${video.videoHeight}`);
          setError(null);
        } catch (playErr) {
          setError('Video-Start fehlgeschlagen: ' + playErr.message);
          setStatus('❌ Video-Start fehlgeschlagen');
        }
      };

      video.onerror = (err) => {
        setError('Video-Fehler: ' + err);
        setStatus('❌ Video-Fehler');
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus('❌ Kamera-Zugriff fehlgeschlagen');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      height: '350px',
      backgroundColor: 'white',
      border: '2px solid #000',
      borderRadius: '8px',
      padding: '10px',
      zIndex: 9999
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>🧪 Simple QR Test</h3>
      
      <div style={{ marginBottom: '10px', fontSize: '14px' }}>
        <strong>Status:</strong> {status}
      </div>
      
      {error && (
        <div style={{ 
          marginBottom: '10px', 
          padding: '8px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#d32f2f'
        }}>
          <strong>Fehler:</strong> {error}
        </div>
      )}
      
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '250px',
          backgroundColor: '#000',
          border: '2px solid #4caf50',
          borderRadius: '4px',
          objectFit: 'cover'
        }}
        autoPlay
        playsInline
        muted
      />
      
      <button
        onClick={startCamera}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🔄 Neu starten
      </button>
    </div>
  );
}
