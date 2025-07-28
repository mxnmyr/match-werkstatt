# Service Management Scripts

Diese Batch-Dateien helfen beim Starten und Stoppen aller benötigten Services für die Match Werkstatt Anwendung.

## 📁 Verfügbare Scripts

### `start-match-werkstatt.bat` (Empfohlen)
**Hauptscript zum Starten aller Services**
- Erkennt MongoDB-Installation automatisch
- Startet alle Services in separaten Terminal-Fenstern
- Zeigt detaillierte Statusinformationen
- Bietet automatisches Öffnen der Anwendung im Browser
- Bessere Fehlerbehandlung und Validierung

### `start-all-services.bat` 
**Einfache Version zum Starten aller Services**
- Schneller Start aller Services
- Automatische MongoDB-Pfad-Erkennung

### `start-without-mongodb.bat`
**Startet nur Backend und Frontend (ohne MongoDB)**
- Für Systeme ohne MongoDB-Installation
- Limitierte Funktionalität (nur JSON-Storage)

### `install-mongodb.bat`
**Interaktiver MongoDB-Installations-Guide**
- Schritt-für-Schritt Anleitung
- Automatische Installation-Überprüfung
- Service-Konfiguration

### `stop-all-services.bat`
**Stoppt alle laufenden Services**
- Beendet alle Node.js Prozesse
- Stoppt MongoDB
- Schließt Service-Terminals

## 🚀 Verwendung

### Services Starten
```bash
# MongoDB automatisch erkannt:
start-match-werkstatt.bat

# Ohne MongoDB (nur JSON-Storage):
start-without-mongodb.bat

# MongoDB installieren:
install-mongodb.bat
```

### Services Stoppen
```bash
# Doppelklick oder im Terminal:
stop-all-services.bat
```

## 📋 Gestartete Services

| Service | Port | URL | Beschreibung |
|---------|------|-----|-------------|
| **MongoDB** | 27017 | `mongodb://localhost:27017` | Datenbank Server |
| **Backend API** | 3001 | `http://localhost:3001` | REST API Server |
| **Frontend** | 5174 | `http://localhost:5174` | React Anwendung |
| **Prisma Studio** | 5555 | `http://localhost:5555` | Datenbank Admin |

## ⚙️ Konfiguration

### MongoDB Pfad anpassen
Falls MongoDB an einem anderen Ort installiert ist, bearbeiten Sie in `start-match-werkstatt.bat`:
```batch
set MONGODB_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
```

### MongoDB Daten-Pfad anpassen
```batch
set MONGODB_DATA_PATH=D:\mongodb\data
```

## 🔧 Voraussetzungen

Bevor Sie die Scripts verwenden, stellen Sie sicher, dass folgende Software installiert ist:

1. **Node.js** (v18 oder höher)
2. **MongoDB** (v5.0 oder höher)
3. **npm** (wird mit Node.js installiert)

### Installation prüfen
```bash
node --version
npm --version
mongod --version
```

## 📝 Logs anzeigen

Jeder Service läuft in einem eigenen Terminal-Fenster:
- **MongoDB Terminal**: Zeigt Datenbankverbindungen und Queries
- **Backend Terminal**: Zeigt API-Requests und Server-Logs  
- **Frontend Terminal**: Zeigt Build-Status und Hot-Reload-Infos
- **Prisma Studio Terminal**: Zeigt Prisma-Admin-Interface-Logs

## 🛠️ Troubleshooting

### Problem: "MongoDB kann nicht gestartet werden"
```bash
# Erstellen Sie den Datenordner falls er nicht existiert:
mkdir C:\data\db
```

### Problem: "Port bereits in Verwendung"
```bash
# Stoppen Sie alle Services:
stop-all-services.bat

# Oder manuell einzelne Ports freigeben:
netstat -ano | findstr :3001
taskkill /PID [PID] /F
```

### Problem: "npm/node nicht gefunden"
- Stellen Sie sicher, dass Node.js korrekt installiert ist
- Öffnen Sie eine neue Eingabeaufforderung nach der Installation

### Problem: "package.json nicht gefunden"
- Stellen Sie sicher, dass Sie die .bat Datei aus dem Projektverzeichnis ausführen
- Das Script sollte im gleichen Ordner wie `package.json` und `server.cjs` liegen

## 🔄 Development Workflow

1. **Projekt starten**: `start-match-werkstatt.bat`
2. **Entwickeln**: Code ändern, Hot-Reload übernimmt automatisch
3. **Logs prüfen**: Terminal-Fenster im Blick behalten
4. **Services stoppen**: `stop-all-services.bat` oder Ctrl+C in Terminals

## 📖 Weitere Informationen

- Die Frontend-Anwendung ist unter `http://localhost:5174` verfügbar
- Das Backend-API ist unter `http://localhost:3001` verfügbar  
- Die Prisma-Datenbank-Administration ist unter `http://localhost:5555` verfügbar
- MongoDB läuft standardmäßig auf Port `27017`
