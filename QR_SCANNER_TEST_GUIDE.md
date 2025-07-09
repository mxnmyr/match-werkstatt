# QR-Code-Scanner Test-Anleitung

## 🎯 Übersicht
Diese Anleitung beschreibt, wie die QR-Code-Scanner-Funktionalität der Match-Werkstatt-Anwendung getestet wird.

## 🚀 Setup für Tests

### 1. Server starten
```bash
npm start
```
- Öffnet die Anwendung auf `http://localhost:3000`
- Stellt sicher, dass HTTPS/localhost für Kamera-Zugriff verfügbar ist

### 2. QR-Test-Codes generieren
- Öffne `qr-test-generator.html` im Browser
- Nutze die vorgenerierten QR-Codes oder erstelle eigene
- QR-Codes enthalten URLs wie: `http://localhost:3000/order/12345`

### 3. Browser-Diagnose (optional)
- Öffne `camera-diagnosis.html` für detaillierte Kamera-Tests
- Führe `final-qr-scanner-test.js` in der Browser-Konsole aus

## 📱 Test-Szenarien

### Szenario 1: Basis-QR-Scan
1. **Setup**: Öffne die App auf `http://localhost:3000`
2. **Login**: Melde dich als Werkstatt oder Kunde an
3. **Scanner öffnen**: Klicke auf QR-Code-Scanner-Button
4. **Berechtigung**: Erlaube Kamera-Zugriff wenn gefragt
5. **Scan**: Halte QR-Code vor die Kamera
6. **Erwartung**: URL wird erkannt und App navigiert zur entsprechenden Seite

### Szenario 2: Manuelle Eingabe
1. **Scanner öffnen**: Wie in Szenario 1
2. **Manual Tab**: Wechsle zum "Manuell"-Tab
3. **Code eingeben**: Gib `12345` oder eine andere Auftragsnummer ein
4. **Erwartung**: Navigation zur Auftragsdetails-Seite

### Szenario 3: Fehlerbehandlung
1. **Kamera blockiert**: Verweigere Kamera-Berechtigung
2. **Erwartung**: Klare Fehlermeldung mit Lösungshinweisen
3. **Kein QR-Code**: Halte Text oder anderes Objekt vor Kamera
4. **Erwartung**: "Scanning..." Zustand bleibt aktiv

### Szenario 4: Mobile Browser
1. **Öffne App auf Smartphone** mit Chrome/Safari
2. **Teste alle obigen Szenarien**
3. **Besondere Aufmerksamkeit**: Touch-Bedienung, Kamera-Wechsel (Front/Rück)

## 🔧 Diagnose bei Problemen

### Kamera funktioniert nicht
1. **Prüfe URL**: Muss `https://` oder `localhost` sein
2. **Browser-Berechtigungen**: In Browser-Einstellungen Kamera für die Seite erlauben
3. **Diagnose-Tools**: Nutze `camera-diagnosis.html` für detaillierte Checks
4. **Konsolen-Logs**: Öffne F12 → Console für detaillierte Fehlermeldungen

### QR-Code wird nicht erkannt
1. **Beleuchtung**: Ausreichend Licht und guter Kontrast
2. **Abstand**: 10-30cm Abstand zur Kamera
3. **Stabilität**: Kamera und QR-Code ruhig halten
4. **QR-Code-Qualität**: Nutze hochauflösende QR-Codes

### Navigation funktioniert nicht
1. **URLs prüfen**: QR-Code muss gültige URL enthalten
2. **Routing**: Stelle sicher, dass Route in der App existiert
3. **Backend**: Server muss für entsprechende API-Endpunkte laufen

## 📊 Erfolgskriterien

### ✅ Basis-Funktionalität
- [ ] Kamera-Zugriff wird erfolgreich angefordert
- [ ] QR-Codes werden zuverlässig erkannt (< 3 Sekunden)
- [ ] Navigation zu korrekten URLs funktioniert
- [ ] Manuelle Eingabe funktioniert als Fallback

### ✅ Benutzerfreundlichkeit
- [ ] Klare UI-Hinweise bei Problemen
- [ ] Responsive Design auf Desktop und Mobile
- [ ] Intuitive Bedienung (Scanner öffnen/schließen)
- [ ] Gute Performance (< 2 Sekunden Startzeit)

### ✅ Fehlerbehandlung
- [ ] Fehlermeldungen sind verständlich
- [ ] Lösungsvorschläge werden angeboten
- [ ] App bleibt stabil bei Kamera-Problemen
- [ ] Graceful Fallback auf manuelle Eingabe

### ✅ Browser-Kompatibilität
- [ ] Chrome (Desktop & Mobile)
- [ ] Firefox (Desktop & Mobile)
- [ ] Edge (Desktop)
- [ ] Safari (Mobile)

## 🎉 Erwartete Ergebnisse

Nach erfolgreichem Test sollten folgende Features funktionieren:

1. **QR-Scanner in Dashboard**: Direkter Zugriff über Button
2. **Auftrag-QR-Codes**: Scannen führt zu Auftragsdetails
3. **PDF-QR-Codes**: QR-Codes in PDF-Köpfen sind scannbar
4. **Cross-Browser**: Funktioniert in allen modernen Browsern
5. **Mobile-UX**: Optimiert für Smartphone-Nutzung

## 📋 Test-Checkliste

- [ ] Server gestartet (`npm start`)
- [ ] QR-Test-Codes generiert
- [ ] Basis-Scan getestet
- [ ] Manuelle Eingabe getestet
- [ ] Fehlerbehandlung getestet
- [ ] Mobile Browser getestet
- [ ] PDF-QR-Codes getestet
- [ ] Performance gemessen
- [ ] Dokumentation aktualisiert

---

## 🛠️ Technische Details

### Komponenten
- **QRCodeScanner.tsx**: Haupt-Scanner-Komponente mit ZXing
- **@zxing/library**: QR-Code-Erkennungs-Library
- **getUserMedia API**: Kamera-Zugriff
- **React Router**: Navigation nach QR-Scan

### API-Endpunkte
- `GET /api/orders/:id`: Auftragsdetails
- `GET /api/documents/:id`: Dokument-Download
- `GET /api/lookup/:code`: QR-Code → Auftrag-Lookup

### Sicherheit
- HTTPS/localhost erforderlich für Kamera-Zugriff
- Explizite Berechtigungsanfrage
- Fehlerbehandlung für verweigerte Berechtigungen
