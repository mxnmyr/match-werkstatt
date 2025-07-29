# STL-Upload und Datenbankpersistierung - Fix

## Probleme identifiziert und behoben:

### 1. ❌ STL-Dateien wurden nicht akzeptiert
**Problem**: EditOrder.tsx hatte eine harte Prüfung auf `file.type === 'application/pdf'`

**Lösung**: 
```tsx
// Vorher:
if (file.type === 'application/pdf') {
  // Nur PDF akzeptiert
}

// Nachher:
// Alle Dateitypen akzeptieren (nicht nur PDF)
const document: PDFDocument = {
  id: `doc_${Date.now()}_${Math.random()}`,
  name: file.name,
  url: URL.createObjectURL(file),
  uploadDate: new Date(),
  file: file
};
```

### 2. ❌ Hochgeladene Dokumente wurden nicht in der Datenbank gespeichert
**Problem**: EditOrder.tsx aktualisierte nur den lokalen State, machte aber keinen API-Call zum Backend.

**Lösung**: Vollständige Überarbeitung der `handleSubmit` Funktion:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // 1. Erst neue Dateien hochladen
    const processedDocuments = await Promise.all(
      documents.map(async (doc) => {
        if (doc.file) {
          // Neue Datei - erst hochladen
          const formData = new FormData();
          formData.append('file', doc.file);
          
          const uploadResponse = await fetch('http://localhost:3001/api/upload', {
            method: 'POST',
            body: formData
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`Upload fehlgeschlagen für ${doc.name}`);
          }
          
          const uploadData = await uploadResponse.json();
          
          return {
            id: doc.id,
            name: uploadData.originalname,
            url: `/uploads/${uploadData.filename}`,
            uploadDate: doc.uploadDate
          };
        } else {
          // Bestehende Datei - keine Änderung
          return {
            id: doc.id,
            name: doc.name,
            url: doc.url,
            uploadDate: doc.uploadDate
          };
        }
      })
    );
    
    const updatedOrder: Order = {
      ...order,
      title,
      description,
      deadline: new Date(deadline),
      costCenter,
      priority,
      documents: processedDocuments,
      status: 'pending',
      canEdit: false,
      updatedAt: new Date()
    };

    // 2. Auftrag in der Datenbank aktualisieren
    const response = await fetch(`http://localhost:3001/api/orders/${order.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedOrder)
    });

    if (!response.ok) {
      throw new Error('Fehler beim Speichern des Auftrags');
    }

    // 3. Lokalen State aktualisieren
    dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
    dispatch({ 
      type: 'SHOW_NOTIFICATION', 
      payload: { message: 'Auftrag wurde erfolgreich überarbeitet und erneut eingereicht', type: 'success' }
    });
    onClose();
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Auftrags:', error);
    dispatch({ 
      type: 'SHOW_NOTIFICATION', 
      payload: { message: 'Fehler beim Speichern des Auftrags', type: 'error' }
    });
  }
};
```

### 3. ❌ Backend ignorierte `documents` bei PUT-Requests
**Problem**: In server.cjs wurde das `documents` Feld nicht in die `updateData` übernommen.

**Lösung**:
```javascript
// Hinzugefügt in server.cjs:
if (documents !== undefined) updateData.documents = documents || [];
```

## Workflow der Datenpersistierung:

### 1. **File Upload Process**:
```
Benutzer wählt Datei → handleFileUpload() → 
Datei wird als Objekt mit file: File hinzugefügt → 
URL.createObjectURL() für Preview
```

### 2. **Submit Process**:
```
handleSubmit() → 
Für jede Datei mit file: File → 
FormData Upload zu /api/upload → 
Server speichert in uploads/ → 
Rückgabe: filename, originalname → 
Erstellung finales document Objekt → 
PUT zu /api/orders/:id mit allen documents → 
MongoDB Update
```

### 3. **Backend Processing**:
```
PUT /api/orders/:id → 
Extraktion von documents aus req.body → 
Hinzufügung zu updateData → 
MongoDB updateOne() → 
Rückgabe aktualisierter Order
```

## Geänderte Dateien:

### src/components/EditOrder.tsx:
- ✅ Entfernung der PDF-only Beschränkung in `handleFileUpload`
- ✅ Vollständige Überarbeitung von `handleSubmit` mit API-Calls
- ✅ Proper Error Handling und User Feedback

### server.cjs:
- ✅ Hinzufügung von `documents` Update in PUT /api/orders/:id Endpunkt

## Test-Szenarios:

### ✅ STL-Upload Test:
1. Auftrag mit Status 'revision' oder 'rework' öffnen
2. "Bearbeiten" Button klicken
3. STL-Datei per Drag&Drop oder File-Dialog hinzufügen
4. Datei sollte in der Liste erscheinen
5. "Speichern" klicken
6. Datei sollte hochgeladen und in DB gespeichert werden

### ✅ Multi-Format Test:
1. Verschiedene Dateiformate hochladen (.stl, .step, .ipt, .pdf)
2. Alle sollten akzeptiert werden
3. Nach Submit sollten alle in der Datenbank verfügbar sein

### ✅ Error Handling Test:
1. Netzwerkfehler simulieren
2. User sollte Fehlermeldung sehen
3. Daten sollten nicht verloren gehen

## Server-Status:
- ✅ Frontend Server: http://localhost:5175 (läuft)
- ✅ Backend Server: http://localhost:3001 (läuft)
- ✅ MongoDB Verbindung: Etabliert
- ✅ HMR Updates: Erfolgreich geladen

## Nächste Schritte für Benutzer:
1. Anwendung öffnen: http://localhost:5175
2. Einloggen als Client
3. Auftrag mit Status 'revision' oder 'rework' finden
4. "Bearbeiten" klicken
5. STL-Datei hochladen testen
6. Verifizieren, dass Datei nach Speichern in der Auftragsliste erscheint
