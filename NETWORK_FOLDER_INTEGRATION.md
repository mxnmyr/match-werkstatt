# 📁 Netzwerkordner-Integration - Automatische Auftragsordner

## 🎯 Übersicht

Das System erstellt automatisch für jeden neuen Auftrag einen strukturierten Ordner auf einem Netzwerkserver. Dies ermöglicht eine zentrale Dateiverwaltung und den Zugriff von verschiedenen Arbeitsplätzen.

## ⚙️ Konfiguration

### Netzwerkpfad einstellen

Der Netzwerkpfad wird über eine Umgebungsvariable konfiguriert:

```bash
# Windows Beispiele:
set NETWORK_BASE_PATH=\\\\SERVER-NAME\\SharedFolder\\Auftraege
set NETWORK_BASE_PATH=\\\\192.168.1.100\\auftraege$
set NETWORK_BASE_PATH=Z:\\Auftraege

# Oder in .env Datei:
NETWORK_BASE_PATH=\\\\your-server\\shared\\orders
```

### Standardkonfiguration
- **Aktuell**: `PLATZHALTER_NETZWERKPFAD` (nicht konfiguriert)
- **Status**: System läuft, protokolliert aber nur die Aktionen
- **Ordner werden erstellt sobald**: Echter Netzwerkpfad konfiguriert ist

## 📂 Ordnerstruktur

Für jeden Auftrag wird folgende Struktur erstellt:

```
\\SERVER\Auftraege\
├── F-2507-1\                    # Auftragsnummer als Ordnername
│   ├── CAM-Dateien\            # CAM-Programme und CNC-Dateien
│   ├── Zeichnungen\            # Technische Zeichnungen
│   ├── Dokumentation\          # Anleitungen, Spezifikationen
│   ├── Fotos\                  # Bilder vom Projekt
│   └── Archiv\                 # Alte Versionen und Backups
├── S-2507-2\                   # Service-Auftrag
│   ├── CAM-Dateien\
│   ├── Zeichnungen\
│   ├── Dokumentation\
│   ├── Fotos\
│   └── Archiv\
└── ...
```

### Ordnernamen-Konvention
- **Format**: `{AuftragsNummer}` (z.B. `F-2507-15`)
- **Bereinigung**: Ungültige Zeichen (`<>:"|?*`) werden durch `_` ersetzt
- **Einzigartig**: Jede Auftragsnummer ist eindeutig

## 🚀 Funktionalität

### Automatische Erstellung
- **Bei neuen Aufträgen**: Ordner wird automatisch beim Anlegen erstellt
- **Unterordner**: Alle 5 Standardordner werden miterstellt
- **Logging**: Alle Aktionen werden in der Konsole protokolliert

### Manuelles Management
- **Nachträgliche Erstellung**: Für bestehende Aufträge möglich
- **Status-Prüfung**: Überprüfung ob Ordner existiert
- **Bulk-Erstellung**: Alle fehlenden Ordner auf einmal erstellen

## 📡 API-Endpoints

### 1. Netzwerkordner für einzelnen Auftrag erstellen
```http
POST /api/orders/{orderId}/create-network-folder
```

**Response:**
```json
{
  "success": true,
  "message": "Netzwerkordner erfolgreich erstellt",
  "path": "\\\\server\\auftraege\\F-2507-1",
  "orderNumber": "F-2507-1"
}
```

### 2. Netzwerkordner-Status prüfen
```http
GET /api/orders/{orderId}/network-folder-status
```

**Response:**
```json
{
  "configured": true,
  "exists": true,
  "path": "\\\\server\\auftraege\\F-2507-1",
  "basePath": "\\\\server\\auftraege",
  "orderNumber": "F-2507-1",
  "message": "Netzwerkordner existiert"
}
```

### 3. Alle Netzwerkordner erstellen (Admin)
```http
POST /api/admin/create-all-network-folders
```

**Response:**
```json
{
  "success": true,
  "message": "Netzwerkordner-Erstellung abgeschlossen",
  "statistics": {
    "total": 25,
    "created": 23,
    "errors": 2
  },
  "results": [...]
}
```

### 4. Netzwerkpfad-Konfiguration anzeigen
```http
GET /api/admin/network-config
```

**Response:**
```json
{
  "configured": false,
  "basePath": "PLATZHALTER_NETZWERKPFAD",
  "accessible": false,
  "message": "Netzwerkpfad nicht konfiguriert..."
}
```

## 🔧 Setup-Anleitung

### Schritt 1: Netzwerkfreigabe einrichten
1. **Server-Freigabe erstellen** (z.B. `\\\\fileserver\\auftraege`)
2. **Berechtigungen setzen**: Lese-/Schreibzugriff für Werkstatt-PCs
3. **Netzwerkverbindung testen** von allen Arbeitsplätzen

### Schritt 2: Server konfigurieren
1. **Umgebungsvariable setzen**:
   ```cmd
   set NETWORK_BASE_PATH=\\\\your-server\\auftraege
   ```
2. **Server neu starten**
3. **Konfiguration prüfen**: `GET /api/admin/network-config`

### Schritt 3: Bestehende Aufträge migrieren
1. **Bulk-Erstellung ausführen**: `POST /api/admin/create-all-network-folders`
2. **Ergebnisse prüfen** in der Antwort
3. **Manuelle Nachbearbeitung** bei Fehlern

## 📊 Logging und Monitoring

### Konsolen-Ausgaben
```
[INFO] Netzwerkpfad nicht konfiguriert. Ordner würde erstellt werden für: F-2507-1
[SUCCESS] Netzwerkordner erstellt: \\server\auftraege\F-2507-1
[SUCCESS] Unterordner erstellt für Auftrag: F-2507-1
[ERROR] Netzwerkpfad nicht erreichbar: \\server\auftraege
```

### Status-Kategorien
- **INFO**: Normale Operationen und Konfigurationsstatus
- **SUCCESS**: Erfolgreich erstellte Ordner
- **ERROR**: Fehlgeschlagene Operationen
- **NETWORK**: Spezifische Netzwerkordner-Aktionen

## ⚠️ Fehlerbehandlung

### Häufige Probleme
1. **Netzwerkpfad nicht erreichbar**
   - Server-Verbindung prüfen
   - Berechtigungen kontrollieren
   - Firewall/VPN-Einstellungen

2. **Ungültige Zeichen in Auftragsnummern**
   - Automatische Bereinigung durch `_`
   - Manuelle Anpassung bei Problemen

3. **Zugriffsberechtigung fehlt**
   - Service-Account mit entsprechenden Rechten
   - Windows-Authentifizierung konfigurieren

### Fallback-Verhalten
- **Konfiguration fehlt**: System läuft normal, protokolliert nur
- **Netzwerk nicht erreichbar**: Auftrag wird trotzdem erstellt
- **Ordner existiert bereits**: Keine Fehler, normale Fortsetzung

## 🔮 Zukünftige Erweiterungen

### Mögliche Features
- **Automatische Synchronisation** zwischen Web-App und Netzwerkordner
- **Datei-Upload direkt** in Netzwerkordner
- **Versionshistorie** für Netzwerkdateien
- **Integration mit CAM-Software** für direkten Zugriff

### Integration mit anderen Systemen
- **ERP-Systeme**: Automatische Ordnerstruktur basierend auf ERP-Daten
- **Backup-Systeme**: Automatische Sicherung der Auftragsordner
- **Archivierung**: Automatisches Archivieren abgeschlossener Aufträge

---

**Das Netzwerkordner-System ist bereit für die Konfiguration und kann sofort nach Eingabe des echten Netzwerkpfads produktiv genutzt werden! 📁✨**
