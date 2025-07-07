# QR-Code URL-Routing Enhancement

## Übersicht

Die QR-Code-Funktionalität wurde erweitert, um direkte URL-Links zu unterstützen, die es Nutzern ermöglichen, über Handy oder Scanner direkt zu spezifischen Aufträgen zu navigieren.

## Neue Features

### 1. URL-basierte QR-Codes
- QR-Codes enthalten jetzt vollständige URLs im Format: `http://localhost:5173/#/order/{orderId}`
- Unterstützt sowohl Auftragsnummern als auch MongoDB ObjectIDs
- Funktioniert mit verschiedenen Domains (localhost, produktive URLs)

### 2. Frontend-Routing
- Neue Route: `/order/:orderId` für direkte Auftragsaufrufe
- Automatische Weiterleitung nach Login, falls Nutzer nicht authentifiziert ist
- Support für sowohl Kunden- als auch Werkstatt-Ansicht

### 3. Verbesserte Scanner-Funktionalität
- QRCodeScanner kann sowohl URLs als auch direkte Auftragsnummern verarbeiten
- Automatische URL-Parsing und Order-ID-Extraktion
- Bessere Benutzerführung mit Hinweisen

### 4. UI-Verbesserungen
- PDF-Button zeigt "PDF + QR-Code" mit Tooltip
- Scanner-Dialog zeigt Anweisungen für URL-basierte QR-Codes
- Erfolgreiche Scans zeigen Benachrichtigungen

## Technische Implementierung

### Frontend (React Router)

```typescript
// App.tsx - Neue Routing-Struktur
<Router>
  <Routes>
    <Route path="/order/:orderId" element={<OrderDirectAccess />} />
    <Route path="/" element={<MainApp />} />
  </Routes>
</Router>

// OrderDirectAccess - Komponente für direkte QR-Code-Links
function OrderDirectAccess() {
  const { orderId } = useParams();
  const { state } = useApp();
  
  // Handling für nicht-authentifizierte Nutzer
  if (!state.isAuthenticated) {
    sessionStorage.setItem('qr_redirect_order', orderId);
    return <Login />;
  }
  
  // Nach Login automatische Weiterleitung
  navigate('/', { state: { openOrderId: orderId } });
}
```

### QR-Code-Generierung

```typescript
// OrderPDFGenerator.ts - URL-basierte QR-Codes
private async generateQRCode(text: string): Promise<string> {
  const baseUrl = window.location.origin;
  const orderUrl = `${baseUrl}/#/order/${text}`;
  
  return await QRCode.toDataURL(orderUrl, {
    width: 200,
    margin: 2,
    errorCorrectionLevel: 'M'
  });
}
```

### Scanner-Logik

```typescript
// QRCodeScanner.tsx - URL-Parsing
if (scannedText.includes('#/order/')) {
  const orderMatch = scannedText.match(/#\/order\/([^\/?\s]+)/);
  if (orderMatch && orderMatch[1]) {
    onScan(orderMatch[1]);  // Extrahierte Order-ID
  }
} else {
  onScan(scannedText);  // Direkte Order-ID
}
```

## Backend-Anpassungen

Der bestehende `/api/orders/barcode/:code` Endpunkt unterstützt bereits:
- Auftragsnummern (orderNumber)
- MongoDB ObjectIDs
- Keine Änderungen erforderlich

## Verwendung

### 1. PDF-Generierung
1. Auftrag öffnen (Werkstatt-Ansicht)
2. "PDF + QR-Code" Button klicken
3. PDF wird mit QR-Code-URL generiert

### 2. QR-Code-Scan
1. "QR-Code scannen" Button im Dashboard
2. QR-Code mit Kamera scannen oder manuell eingeben
3. Automatische Navigation zum Auftrag

### 3. Handy-Nutzung
1. QR-Code mit Handy-Kamera oder QR-Scanner-App scannen
2. Link öffnet die Web-App direkt zum Auftrag
3. Login-Weiterleitung falls erforderlich

## Vorteile

- **Mobile UX**: Direkte Navigation vom Handy zur Web-App
- **Benutzerfreundlichkeit**: Ein Scan öffnet direkt den gewünschten Auftrag
- **Flexibilität**: Funktioniert mit verschiedenen QR-Scanner-Apps
- **Sicherheit**: Login-Pflicht bleibt bestehen
- **Rückwärtskompatibilität**: Alte QR-Codes (nur Order-ID) funktionieren weiterhin

## Testing

```bash
# QR-Code-URL-Tests ausführen
node test-qr-urls.js

# Frontend-Tests
npm run dev
# -> Navigiere zu http://localhost:5173/#/order/TEST123
```

## Zukünftige Erweiterungen

- **Deep-Links**: Native App-Integration
- **Offline-Support**: Service Worker für Offline-Navigation
- **Analytics**: Tracking von QR-Code-Scans
- **Batch-QR-Codes**: Mehrere QR-Codes gleichzeitig generieren
