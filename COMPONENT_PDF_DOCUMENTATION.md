# 🔧 Bauteil-Zeichnungen in PDF-Generierung

## Übersicht

Die PDF-Generierung wurde erweitert um **Bauteil-Zeichnungen** zu inkludieren. Jede Zeichnung erhält einen **QR-Code in der Kopfzeile** für direkten Zugriff auf den Auftrag.

## ✨ Neue Features

### 1. **Komponenten-Dokumente in PDF**
- Alle Zeichnungen aller Bauteile werden automatisch angehängt
- Reihenfolge: Cover Page → Auftragsdokumente → Bauteil-Zeichnungen
- Jedes Bauteil wird mit seinen Zeichnungen gruppiert

### 2. **QR-Code in jeder Kopfzeile**
- **Position**: Rechte obere Ecke (40x40 Pixel)
- **Inhalt**: Vollständige URL zum Auftrag (`http://localhost:5173/#/order/{orderId}`)
- **Funktion**: Direkter Zugriff via Handy/Scanner

### 3. **Intelligente Kopfzeilen**
- **Layout**: Grauer Hintergrund (50px hoch, 95% Transparenz)
- **Links**: Auftragsinfo und Dokument-Typ
- **Rechts**: QR-Code
- **Unten**: Trennlinie

## 🎨 Kopfzeilen-Design

```
┌─────────────────────────────────────────────────────┐
│ Auftragsname                          ████████ │
│ Bauteil: Bauteilname | Kunde | Nr     ████████ │  
├─────────────────────────────────────────────────────┤
│                                                     │
│              Original Zeichnung                     │
│                                                     │
```

### Kopfzeilen-Inhalte:
- **Zeile 1**: Auftragsname
- **Zeile 2**: 
  - `Auftragsdokument` für Haupt-PDFs
  - `Bauteil: {BauteilName}` für Komponenten-Zeichnungen
  - Kunde und Auftragsnummer

## 🛠️ Technische Implementierung

### Backend-Erweiterung
```javascript
// server.cjs - Unterstützt jetzt beide Dokument-Typen
app.get('/api/documents/:id', async (req, res) => {
  // 1. Suche in Document-Tabelle (Auftragsdokumente)
  let document = await prisma.document.findUnique({
    where: { id: documentId }
  });

  // 2. Falls nicht gefunden: ComponentDocument-Tabelle
  if (!document) {
    document = await prisma.componentDocument.findUnique({
      where: { id: documentId }
    });
  }
  
  // ... Datei zurückgeben
});
```

### PDF-Generator-Erweiterung
```typescript
// OrderPDFGenerator.ts - Neue Merge-Logik
private async mergeDocuments(coverPdf: jsPDF): Promise<Uint8Array> {
  // 1. Cover Page
  // 2. Auftragsdokumente (mit QR-Code-Headern)
  // 3. Komponenten-Zeichnungen (mit QR-Code-Headern)
}

private async addDocumentToMergedPDF(pdfDoc, document, documentType) {
  // QR-Code generieren und einbetten
  // Header mit Hintergrund zeichnen
  // Text und QR-Code positionieren
  // Trennlinie hinzufügen
}
```

## 📋 PDF-Struktur

### Vollständige PDF enthält:

1. **📄 Deckblatt**
   - Auftragsdetails
   - Komponenten-Liste
   - Haupt-QR-Code

2. **📋 Auftragsdokumente** (falls vorhanden)
   - Jede Seite mit QR-Code-Header
   - Header: "Auftragsdokument | Kunde | Nr"

3. **🔧 Bauteil-Zeichnungen** (neu)
   - Gruppiert nach Komponenten
   - Jede Seite mit QR-Code-Header
   - Header: "Bauteil: {Name} | Kunde | Nr"

## 🎛️ PDF-Generation Optionen

```typescript
const options = {
  includeDocuments: true,    // Auftragsdokumente
  includeComponents: true,   // 🆕 Bauteil-Zeichnungen
  includeQRCode: true        // QR-Codes in Headern
};

const pdfGenerator = new OrderPDFGenerator(order, options);
const pdfBlob = await pdfGenerator.generatePDF();
```

## 📱 QR-Code-Funktionalität

### QR-Code-Inhalt:
- **Format**: `http://localhost:5173/#/order/{orderId}`
- **Kompatibilität**: Alle QR-Scanner-Apps
- **Funktion**: Direkter Link zum Auftrag

### Nutzung:
1. **PDF drucken** → QR-Code auf jeder Seite
2. **Handy-Scanner** → QR-Code scannen
3. **Browser öffnet** → Direkter Zugriff auf Auftrag
4. **Login falls nötig** → Weiterleitung nach Authentifizierung

## 🧪 Test-Ergebnisse

```
✅ Backend: ComponentDocument-Downloads funktionieren
✅ PDF-Generator: QR-Code-Embedding erfolgreich
✅ Frontend: PDF-Button generiert erweiterte PDFs
✅ QR-Codes: Direkter Auftragszugriff funktioniert
```

### Test-Daten gefunden:
- **2 Aufträge** mit Komponenten
- **4 Bauteil-Zeichnungen** verfügbar
- **Alle Downloads** erfolgreich (PDF, 419KB - 2.3MB)

## 🎉 Nutzen

### Für Werkstatt:
- **Alle Zeichnungen** in einer PDF
- **QR-Code-Zugriff** von jedem Gerät
- **Struktur und Übersicht** durch Header

### Für Kunden:
- **Vollständige Dokumentation** aller Bauteile
- **Mobile Zugriffe** via QR-Code
- **Professionelle Darstellung**

### Für Verwaltung:
- **Automatische Generierung** ohne manuellen Aufwand
- **Konsistente Formatierung** aller Dokumente
- **Nachverfolgbarkeit** durch QR-Codes

---

**Die PDF-Generierung ist jetzt komplett: Deckblatt + Auftragsdokumente + Bauteil-Zeichnungen, alle mit QR-Codes für direkten Zugriff! 🎯**
