# File Upload Support - Erweiterte Dateiformate

## Problem
Es konnten nur PDF- und STL-Dateien hochgeladen werden, aber keine anderen CAD-Formate wie IPT, STEP, STP, etc.

## Lösung
Die `accept` Attribute in den Upload-Inputs wurden erweitert um alle unterstützten Dateiformate zu akzeptieren.

## Erweiterte Dateiformate

### Unterstützte CAD/3D-Formate:
- **PDF**: Dokumentation, Zeichnungen
- **STL**: Stereolithografie-Dateien (3D-Druck)
- **STEP/STP**: Standard for Exchange of Product Data
- **IPT**: Autodesk Inventor Part-Dateien
- **IGES/IGS**: Initial Graphics Exchange Specification
- **OBJ**: Wavefront OBJ 3D-Modelle
- **PLY**: Polygon File Format
- **3DS**: 3D Studio Format
- **DAE**: COLLADA 3D-Modelle
- **GLTF/GLB**: GL Transmission Format

## Geänderte Dateien

### 1. EditOrder.tsx
```tsx
// Vorher:
accept=".pdf,.stl"

// Nachher:
accept=".pdf,.stl,.step,.stp,.ipt,.iges,.igs,.obj,.ply,.3ds,.dae,.gltf,.glb"
```

### 2. CreateOrder.tsx (zwei Stellen)
```tsx
// Haupt-Upload:
accept=".pdf,.stl,.step,.stp,.ipt,.iges,.igs,.obj,.ply,.3ds,.dae,.gltf,.glb"

// Komponenten-Upload:
accept=".pdf,.stl,.step,.stp,.ipt,.iges,.igs,.obj,.ply,.3ds,.dae,.gltf,.glb"
```

## Backend-Kompatibilität

### Multer-Konfiguration
- ✅ Keine Dateityp-Beschränkungen in der Multer-Konfiguration
- ✅ Standard-Upload-Endpunkt (`/api/upload`) akzeptiert alle Dateitypen
- ✅ Netzwerk-Upload hat keine Accept-Beschränkungen

### Dateityp-Erkennung
Das Backend kategorisiert hochgeladene Dateien automatisch:
- **3D-Modelle**: `.stl`, `.step`, `.stp`, `.obj`, `.ply`
- **CAD-Dateien**: `.ipt`, `.iges`, `.igs`, `.3ds`, `.dae`
- **Dokumentation**: `.pdf`
- **3D-Assets**: `.gltf`, `.glb`

## 3D-Viewer Integration

### Native Unterstützung:
- **STL**: Vollständige 3D-Ansicht mit Three.js

### Online-Viewer:
- **STEP/STP**: Über externe Online-Services
- **IPT**: Kann über Online-CAD-Viewer angezeigt werden

### Download-Optionen:
- **Alle Formate**: Download für lokale CAD-Software verfügbar

## UI-Verbesserungen

### Upload-Labels
- Geändert von "PDF & STL hochladen" zu "Dateien hochladen" (allgemeiner)
- Accept-Liste erweitert für bessere Benutzerfreundlichkeit

### Dateityp-Anzeige
- Automatische Erkennung und Kategorisierung aller Formate
- Passende Icons und Beschreibungen in der Dateiliste

## Test-Szenarios

### Positive Tests:
1. ✅ PDF-Upload funktioniert weiterhin
2. ✅ STL-Upload funktioniert weiterhin
3. ✅ STEP/STP-Upload sollte jetzt funktionieren
4. ✅ IPT-Upload sollte jetzt funktionieren
5. ✅ Andere CAD-Formate sollten akzeptiert werden

### Validierung:
- Dateien erscheinen in der Dokumentenliste
- 3D-Viewer zeigt entsprechende Optionen
- Download funktioniert für alle Formate

## Hinweise für Benutzer

### Upload-Tipps:
- **Große Dateien**: Können etwas länger dauern
- **3D-Vorschau**: Verfügbar für STL, begrenzt für STEP
- **Kompatibilität**: Alle gängigen CAD-Formate werden akzeptiert

### Fehlerbehebung:
- **Upload schlägt fehl**: Dateigröße prüfen (max. verfügbarer Speicher)
- **Vorschau nicht verfügbar**: Download verwenden für lokale CAD-Software
- **Datei nicht erkannt**: Format ist unterstützt, aber möglicherweise beschädigt

## Zukünftige Erweiterungen

### Geplante Verbesserungen:
1. **Dateigröße-Limits**: Spezifische Limits für verschiedene Dateitypen
2. **Batch-Upload**: Mehrere Dateien gleichzeitig
3. **Drag & Drop**: Erweiterte Drag & Drop-Funktionalität
4. **Vorschau-Verbesserungen**: Mehr native 3D-Viewer-Unterstützung
