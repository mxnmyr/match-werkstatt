const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = 3001;
const prisma = new PrismaClient();

// MongoDB client for direct operations (to avoid replica set issues with Prisma)
const mongoClient = new MongoClient(process.env.DATABASE_URL || 'mongodb://localhost:27017/matchdb');
let db;

// Initialize MongoDB connection
async function initMongoDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db('matchdb');
    console.log('✓ Direct MongoDB connection established');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error);
  }
}

initMongoDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadsDir = path.join(__dirname, 'storage', 'uploads');

// === NETZWERKORDNER-KONFIGURATION ===
// PLATZHALTER: Hier wird später der tatsächliche Netzwerkpfad eingetragen
// Beispiele für Windows-Netzwerkpfade:
// - '\\\\SERVER-NAME\\SharedFolder\\Auftraege'
// - '\\\\192.168.1.100\\auftraege$'
// - 'Z:\\Auftraege' (wenn Netzlaufwerk gemappt ist)
const NETWORK_BASE_PATH = process.env.NETWORK_BASE_PATH || 'PLATZHALTER_NETZWERKPFAD';

// Hilfsfunktion: Netzwerkordner für Auftrag erstellen
async function createNetworkOrderFolder(orderNumber, orderId) {
  try {
    // Hole den aktuellen Netzwerkpfad aus der Datenbank (direkt über MongoDB)
    let networkPathConfig = null;
    if (db) {
      try {
        networkPathConfig = await db.collection('SystemConfig').findOne({
          key: 'NETWORK_BASE_PATH'
        });
      } catch (dbError) {
        console.warn('[WARN] Could not fetch network path from database:', dbError.message);
      }
    }
    
    // Verwende den Wert aus der Datenbank oder den Standardwert
    const currentNetworkPath = networkPathConfig?.value || NETWORK_BASE_PATH;
    
    // Prüfe ob Netzwerkpfad konfiguriert ist
    if (currentNetworkPath === 'PLATZHALTER_NETZWERKPFAD') {
      console.log(`[INFO] Netzwerkpfad nicht konfiguriert. Ordner würde erstellt werden für: ${orderNumber}`);
      return { success: false, message: 'Netzwerkpfad nicht konfiguriert' };
    }

    // Erstelle sicheren Ordnernamen (entferne ungültige Zeichen)
    const safeFolderName = `${orderNumber || orderId}`.replace(/[<>:"|?*]/g, '_');
    const orderFolderPath = path.join(currentNetworkPath, safeFolderName);
    
    // Prüfe ob Hauptnetzwerkpfad existiert
    if (!fs.existsSync(currentNetworkPath)) {
      console.error(`[ERROR] Netzwerkpfad nicht erreichbar: ${currentNetworkPath}`);
      return { success: false, message: 'Netzwerkpfad nicht erreichbar' };
    }
    
    // Erstelle Auftragsordner wenn nicht vorhanden
    if (!fs.existsSync(orderFolderPath)) {
      fs.mkdirSync(orderFolderPath, { recursive: true });
      console.log(`[SUCCESS] Netzwerkordner erstellt: ${orderFolderPath}`);
      
      // Erstelle Unterordner-Struktur
      const subFolders = [
        'CAD_CAM',                   // CAD/CAM-Dateien
        'Zeichnungen',               // Technische Zeichnungen
        'Dokumentation',             // Technische Dokumentation, Anleitungen, etc.
        'Bilder',                    // Fotos und Bilder
        'Bauteile',                  // Hauptordner für Bauteile
        'Dokumente',                 // Sonstige Dokumente
        'Archiv'                     // Archivierte Dateien
      ];
      
      subFolders.forEach(folder => {
        const subFolderPath = path.join(orderFolderPath, folder);
        fs.mkdirSync(subFolderPath, { recursive: true });
      });
      
      console.log(`[SUCCESS] Unterordner erstellt für Auftrag: ${safeFolderName}`);
      
      // Migration bestehender Dateien durchführen
      const migrationResult = await migrateExistingFilesToNetworkFolder(orderId, orderFolderPath);
      if (migrationResult.success) {
        console.log(`[SUCCESS] Dateimigration abgeschlossen: ${migrationResult.message}`);
      } else {
        console.warn(`[WARN] Probleme bei der Dateimigration: ${migrationResult.message}`);
      }
      
      // Aktualisiere die Datenbank mit dem Netzwerkpfad
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            networkPath: orderFolderPath,
            networkFolderCreated: true
          }
        });
        console.log(`[SUCCESS] Datenbank mit Netzwerkpfad aktualisiert für Auftrag: ${orderId}`);
      } catch (dbError) {
        console.error('[ERROR] Fehler beim Aktualisieren des Netzwerkpfads in der Datenbank:', dbError);
      }
      
      return { 
        success: true, 
        path: orderFolderPath, 
        message: 'Netzwerkordner erfolgreich erstellt',
        migrationResult: migrationResult
      };
    } else {
      console.log(`[INFO] Netzwerkordner existiert bereits: ${orderFolderPath}`);
      
      // Prüfen, ob Unterordner existieren, ggf. erstellen
      const subFolders = [
        'CAD_CAM',                   // CAD/CAM-Dateien
        'Zeichnungen',               // Technische Zeichnungen
        'Dokumentation',             // Technische Dokumentation, Anleitungen, etc.
        'Bilder',                    // Fotos und Bilder
        'Bauteile',                  // Hauptordner für Bauteile
        'Dokumente',                 // Sonstige Dokumente
        'Archiv'                     // Archivierte Dateien
      ];
      
      for (const folder of subFolders) {
        const subFolderPath = path.join(orderFolderPath, folder);
        if (!fs.existsSync(subFolderPath)) {
          fs.mkdirSync(subFolderPath, { recursive: true });
          console.log(`[INFO] Fehlender Unterordner erstellt: ${subFolderPath}`);
        }
      }
      
      // Migration bestehender Dateien auch für bereits existierende Ordner durchführen
      const migrationResult = await migrateExistingFilesToNetworkFolder(orderId, orderFolderPath);
      if (migrationResult.success) {
        console.log(`[SUCCESS] Dateimigration abgeschlossen: ${migrationResult.message}`);
      } else {
        console.warn(`[WARN] Probleme bei der Dateimigration: ${migrationResult.message}`);
      }
      
      // Aktualisiere die Datenbank mit dem Netzwerkpfad (falls noch nicht gesetzt)
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { networkFolderCreated: true }
        });
        
        if (!order?.networkFolderCreated) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              networkPath: orderFolderPath,
              networkFolderCreated: true
            }
          });
          console.log(`[SUCCESS] Datenbank mit Netzwerkpfad aktualisiert für Auftrag: ${orderId}`);
        }
      } catch (dbError) {
        console.error('[ERROR] Fehler beim Aktualisieren des Netzwerkpfads in der Datenbank:', dbError);
      }
      
      return { 
        success: true, 
        path: orderFolderPath, 
        message: 'Netzwerkordner bereits vorhanden', 
        migrationResult: migrationResult
      };
    }
    
  } catch (error) {
    console.error(`[ERROR] Fehler beim Erstellen des Netzwerkordners:`, error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// Ensure storage files exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(type, payload) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, payload }));
    }
  });
}

// --- USERS (Prisma) ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Nutzer', details: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    console.log('POST /api/users', { username, password, name, role });
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    const newUser = await prisma.user.create({
      data: {
        username,
        password,
        name,
        role: role || 'client',
        isActive: true,
        isApproved: false,
        createdAt: new Date()
      }
    });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Anlegen des Nutzers', details: err.message });
  }
});

// Login-Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (user && user.password === password) {
      if (user.role === 'client' && user.isApproved === false) {
        return res.status(403).json({ success: false, message: 'Account noch nicht bestätigt' });
      }
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Ungültige Zugangsdaten' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Serverfehler beim Login', error: err.message });
  }
});

// Account approve (Admin)
app.patch('/api/users/:id/approve', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isApproved: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Bestätigen des Nutzers', details: err.message });
  }
});

// User löschen (Admin)
app.delete('/api/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen des Nutzers', details: err.message });
  }
});

// --- ORDERS (Prisma) ---
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        documents: true,
        components: {
          include: {
            documents: true
          }
        },
        noteHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Aufträge', details: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { MongoClient, ObjectId } = require('mongodb');
    const { documents, components, ...orderData } = req.body;
    
    // Verbesserte Auftragsnummer-Generierung: F-YYMM-X (Jahr-Monat-Laufende Nummer)
    const today = new Date();
    const yearMonth = today.toISOString().slice(2, 7).replace('-', ''); // YYMM
    const prefix = orderData.orderType === 'fertigung' ? 'F' : 'S';
    
    // Finde die höchste laufende Nummer für diesen Monat
    const yearMonthPattern = `${prefix}-${yearMonth}-`;
    const mongoClient = new MongoClient('mongodb://localhost:27017');
    await mongoClient.connect();
    const dbConnection = mongoClient.db('matchdb');
    const orderCollection = dbConnection.collection('Order');
    
    const existingOrders = await orderCollection.find({
      orderNumber: { $regex: `^${yearMonthPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
    }).toArray();
    
    let nextNumber = 1;
    if (existingOrders.length > 0) {
      const numbers = existingOrders.map(order => {
        const match = order.orderNumber.match(new RegExp(`^${yearMonthPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      }).filter(num => num > 0);
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }
    
    const auftragsnummer = `${prefix}-${yearMonth}-${nextNumber}`;
    
    // Schließe die erste Connection
    await mongoClient.close();
    
    // Verwende MongoDB direkt für die Erstellung (ohne Prisma-Transaktionen)
    const mongoClient2 = new MongoClient('mongodb://localhost:27017');
    
    await mongoClient2.connect();
    const db = mongoClient2.db('matchdb');
    const collection = db.collection('Order');
    
    const newOrder = {
      orderNumber: auftragsnummer,
      title: orderData.title,
      description: orderData.description,
      clientId: orderData.clientId,
      clientName: orderData.clientName,
      deadline: new Date(orderData.deadline),
      costCenter: orderData.costCenter,
      priority: orderData.priority || 'medium',
      status: orderData.status || 'pending',
      estimatedHours: orderData.estimatedHours || 0,
      actualHours: orderData.actualHours || 0,
      assignedTo: orderData.assignedTo || null,
      notes: orderData.notes || '',
      orderType: orderData.orderType,
      subTasks: orderData.subTasks || [],
      revisionHistory: orderData.revisionHistory || [],
      reworkComments: orderData.reworkComments || [],
      confirmationNote: null,
      confirmationDate: null,
      canEdit: false,
      materialOrderedByWorkshop: false,
      materialOrderedByClient: false,
      materialOrderedByClientConfirmed: false,
      materialAvailable: false,
      titleImageId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(newOrder);
    
    // Erstelle Dokumente separat
    if (documents && documents.length > 0) {
      const documentsCollection = db.collection('Document');
      const documentObjects = documents.map(doc => ({
        name: doc.name,
        url: doc.url,
        uploadDate: doc.uploadDate ? new Date(doc.uploadDate) : new Date(),
        orderId: new ObjectId(result.insertedId) // Ensure ObjectId format
      }));
      await documentsCollection.insertMany(documentObjects);
    }
    
    // Erstelle Komponenten separat
    if (components && components.length > 0) {
      const componentsCollection = db.collection('Component');
      for (const comp of components) {
        const componentObj = {
          title: comp.title,
          description: comp.description || '',
          orderId: new ObjectId(result.insertedId), // Ensure ObjectId format
          createdAt: new Date()
        };
        const compResult = await componentsCollection.insertOne(componentObj);
        
        // Erstelle Komponenten-Dokumente
        if (comp.documents && comp.documents.length > 0) {
          const compDocumentsCollection = db.collection('ComponentDocument');
          const compDocumentObjects = comp.documents.map(doc => ({
            name: doc.name,
            url: doc.url,
            uploadDate: doc.uploadDate ? new Date(doc.uploadDate) : new Date(),
            componentId: new ObjectId(compResult.insertedId) // Ensure ObjectId format
          }));
          await compDocumentsCollection.insertMany(compDocumentObjects);
        }
      }
    }
    
    await mongoClient2.close();
    
    // === NETZWERKORDNER FÜR AUFTRAG ERSTELLEN ===
    const networkResult = await createNetworkOrderFolder(auftragsnummer, result.insertedId.toString());
    console.log(`[NETWORK] Netzwerkordner-Erstellung für ${auftragsnummer}:`, networkResult);
    
    // Hole den erstellten Auftrag über Prisma zurück
    const order = await prisma.order.findUnique({
      where: { id: result.insertedId.toString() },
      include: { 
        documents: true,
        components: {
          include: {
            documents: true
          }
        }
      }
    });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Anlegen des Auftrags', details: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const { MongoClient, ObjectId } = require('mongodb');
    const mongoClient = new MongoClient('mongodb://localhost:27017');
    
    console.log('=== PUT /api/orders/:id RECEIVED ===');
    console.log('Order ID:', req.params.id);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    // Nur erlaubte Felder übernehmen
    const {
      title,
      description,
      clientId,
      clientName,
      deadline,
      costCenter,
      priority,
      status,
      estimatedHours,
      actualHours,
      assignedTo,
      notes,
      orderType,
      subTasks,
      documents,       // Dokumente explizit extrahieren
      revisionRequest, // Vom Kunden für Nacharbeit
      revisionComment, // Von Werkstatt für Überarbeitung
      userId,          
      userName,
      // Materialstatus-Felder
      materialOrderedByWorkshop,
      materialOrderedByClient,
      materialOrderedByClientConfirmed,
      materialAvailable,
      // Zusätzliche Felder
      confirmationNote,
      confirmationDate,
      canEdit
    } = req.body;

    await mongoClient.connect();
    const db = mongoClient.db('matchdb');
    const collection = db.collection('Order');
    
    try {
      // Hole bisherigen Auftrag
      const existingOrder = await collection.findOne({ _id: new ObjectId(req.params.id) });
      if (!existingOrder) {
        return res.status(404).json({ error: 'Auftrag nicht gefunden' });
      }

      let revisionHistory = Array.isArray(existingOrder.revisionHistory) ? existingOrder.revisionHistory : [];
      let reworkComments = Array.isArray(existingOrder.reworkComments) ? existingOrder.reworkComments : [];

      // Wenn Notizen geändert wurden, alten Stand historisieren
      if (notes !== undefined && notes !== existingOrder.notes) {
        const noteHistoryCollection = db.collection('NoteHistory');
        await noteHistoryCollection.insertOne({
          orderId: new ObjectId(req.params.id),
          notes: existingOrder.notes || '',
          createdAt: new Date()
        });
      }

      // Fallback: userId/userName ggf. aus revisionRequest holen
      let effectiveUserId = userId;
      let effectiveUserName = userName;

      // Fall 1: Werkstatt schickt Auftrag zur "Überarbeitung" an den Kunden
      if (status === 'revision' && revisionComment && effectiveUserId && effectiveUserName) {
        console.log('Fall 1: Werkstatt-Überarbeitung wird verarbeitet...');
        revisionHistory.push({
          comment: revisionComment,
          userId: effectiveUserId,
          userName: effectiveUserName,
          createdAt: new Date().toISOString()
        });
      }

      // Fall 2: Kunde schickt Auftrag zur "Nacharbeit" an die Werkstatt
      if (status === 'rework' && revisionComment && effectiveUserId && effectiveUserName) {
        console.log('Fall 2: Kunden-Nacharbeit wird verarbeitet...');
        reworkComments.push({
          comment: revisionComment,
          userId: effectiveUserId,
          userName: effectiveUserName,
          documents: [],
          createdAt: new Date().toISOString()
        });
      }

      const updateData = {
        updatedAt: new Date()
      };

      // Nur definierte Felder hinzufügen
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (clientId !== undefined) updateData.clientId = clientId;
      if (clientName !== undefined) updateData.clientName = clientName;
      if (deadline !== undefined) updateData.deadline = new Date(deadline);
      if (costCenter !== undefined) updateData.costCenter = costCenter;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;
      if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
      if (actualHours !== undefined) updateData.actualHours = actualHours;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      if (notes !== undefined) updateData.notes = notes;
      if (orderType !== undefined) updateData.orderType = orderType;
      if (subTasks !== undefined) updateData.subTasks = subTasks || [];
      if (materialOrderedByWorkshop !== undefined) updateData.materialOrderedByWorkshop = materialOrderedByWorkshop;
      if (materialOrderedByClient !== undefined) updateData.materialOrderedByClient = materialOrderedByClient;
      if (materialOrderedByClientConfirmed !== undefined) updateData.materialOrderedByClientConfirmed = materialOrderedByClientConfirmed;
      if (materialAvailable !== undefined) updateData.materialAvailable = materialAvailable;
      if (confirmationNote !== undefined) updateData.confirmationNote = confirmationNote;
      if (confirmationDate !== undefined) updateData.confirmationDate = new Date(confirmationDate);
      if (canEdit !== undefined) updateData.canEdit = canEdit;
      
      // Geschichte immer aktualisieren
      updateData.revisionHistory = revisionHistory;
      updateData.reworkComments = reworkComments;

      console.log('PUT /api/orders/:id updateData:', updateData);
      
      // Update in MongoDB
      await collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData }
      );

      // Hole den aktualisierten Auftrag mit Prisma zurück (für die Relations)
      const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
          documents: true,
          components: {
            include: {
              documents: true
            }
          },
          noteHistory: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      res.json(order);
    } finally {
      await mongoClient.close();
    }
  } catch (err) {
    console.error('PUT /api/orders/:id error:', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Auftrags', details: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Lösche alle verknüpften Daten mit MongoDB direkt
    const { MongoClient, ObjectId } = require('mongodb');
    const mongoClient = new MongoClient('mongodb://localhost:27017');
    await mongoClient.connect();
    const db = mongoClient.db('matchdb');
    
    try {
      // 1. Finde alle Komponenten für diesen Auftrag
      const components = await db.collection('Component').find({ orderId: new ObjectId(orderId) }).toArray();
      
      // 2. Lösche alle Komponenten-Dokumente
      for (const component of components) {
        await db.collection('ComponentDocument').deleteMany({ componentId: component._id });
      }
      
      // 3. Lösche alle Komponenten
      await db.collection('Component').deleteMany({ orderId: new ObjectId(orderId) });
      
      // 4. Lösche alle Auftragsdokumente
      await db.collection('Document').deleteMany({ orderId: new ObjectId(orderId) });
      
      // 5. Lösche den Auftrag selbst
      await db.collection('Order').deleteOne({ _id: new ObjectId(orderId) });
      
    } finally {
      await mongoClient.close();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Fehler beim Löschen des Auftrags', details: err.message });
  }
});

// --- FILE UPLOADS (Metadaten in DB) ---
// Standard-Upload (wie bisher für allgemeine Dateien)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('MULTER destination:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const finalName = base + '-' + unique + ext;
    console.log('MULTER filename:', {
      originalname: file.originalname,
      ext,
      base,
      unique,
      finalName
    });
    cb(null, finalName);
  }
});
const upload = multer({ storage });

// Erweiterte Upload-Konfiguration für Netzwerkordner
const createNetworkStorage = (subFolder = '') => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        let targetPath = uploadsDir; // Fallback zu lokalem Ordner
        
        // Versuche, den Netzwerkordner zu verwenden
        const { orderId, componentId } = req.params;
        if (orderId) {
          // Lade Auftrag
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { orderNumber: true, networkPath: true, networkFolderCreated: true }
          });
          
          if (order) {
            // Erstelle oder hole Netzwerkordner
            const networkResult = await createNetworkOrderFolder(order.orderNumber, orderId);
            
            if (networkResult.success && networkResult.path) {
              if (componentId) {
                // Speichere in Bauteil-Unterordner
                targetPath = path.join(networkResult.path, 'Bauteile', componentId);
              } else if (subFolder) {
                // Speichere in spezifischen Unterordner
                targetPath = path.join(networkResult.path, subFolder);
              } else {
                // Speichere in allgemeinen Dokumenten-Ordner
                targetPath = path.join(networkResult.path, 'Dokumentation');
              }
              
              // Erstelle den Zielordner falls er nicht existiert
              if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
                console.log(`[DEBUG] Created directory: ${targetPath}`);
              }
            }
          }
        }
        
        console.log(`[DEBUG] MULTER network destination: ${targetPath}`);
        cb(null, targetPath);
      } catch (error) {
        console.error('[ERROR] MULTER destination error:', error);
        cb(null, uploadsDir); // Fallback zu lokalem Ordner
      }
    },
    filename: (req, file, cb) => {
      // Bereinige Dateinamen für Netzwerkordner
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[<>:"|?*]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const finalName = `${base}_${timestamp}${ext}`;
      
      console.log('MULTER network filename:', {
        originalname: file.originalname,
        finalName
      });
      cb(null, finalName);
    }
  });
};

// Verschiedene Upload-Konfigurationen
const networkUpload = multer({ storage: createNetworkStorage() });
const camFilesUpload = multer({ storage: createNetworkStorage('CAM-Dateien') });
const drawingsUpload = multer({ storage: createNetworkStorage('Zeichnungen') });
const photosUpload = multer({ storage: createNetworkStorage('Fotos') });

// Multer-Konfiguration für In-Memory-Speicherung (für DB-Upload)
const memoryUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei empfangen!' });
  }
  // Metadaten werden erst beim Auftrag angelegt, daher hier nur Dateiname zurückgeben
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// Endpunkt für Titelbild-Upload - Native MongoDB um Transaktions-Problem zu umgehen
app.post('/api/orders/:id/upload-title-image', memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    }

    const orderId = req.params.id;
    const imageBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // Konvertiere Bild zu Base64 für direkte Speicherung im Order
    const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    console.log(`Uploading title image for order ${orderId}, size: ${imageBuffer.length} bytes, type: ${mimeType}`);

    // Verwende native MongoDB-Update anstatt Prisma um Transaktions-Problem zu umgehen
    const { MongoClient, ObjectId } = require('mongodb');
    const mongoClient = new MongoClient(process.env.DATABASE_URL || 'mongodb://localhost:27017/matchdb');
    
    try {
      await mongoClient.connect();
      const db = mongoClient.db('matchdb');
      const ordersCollection = db.collection('Order');
      
      // Einfaches MongoDB Update ohne Transaktionen
      const updateResult = await ordersCollection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { titleImage: base64Image, updatedAt: new Date() } }
      );
      
      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ error: 'Auftrag nicht gefunden.' });
      }
      
      console.log(`Title image uploaded successfully for order ${orderId}`);
      
      // Hole aktualisierte Orders für Broadcast
      const allOrders = await prisma.order.findMany();
      broadcast('ordersUpdated', allOrders);
      
      // Erfolgsantwort
      res.json({ 
        success: true,
        orderId: orderId,
        titleImageUploaded: true
      });
      
    } finally {
      await mongoClient.close();
    }

  } catch (err) {
    console.error('Error uploading title image:', err);
    res.status(500).json({ error: 'Fehler beim Hochladen des Titelbildes.', details: err.message });
  }
});

// Endpunkt zum Abrufen des Titelbildes (neue Logik mit Image-Tabelle)
// Endpunkt zum Abrufen des Titelbildes - Vereinfachte Version mit Base64
app.get('/api/orders/:id/title-image', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { titleImage: true }
    });

    if (!order || !order.titleImage) {
      return res.status(404).send('Bild nicht gefunden');
    }

    // Base64-Bild direkt zurückgeben
    if (order.titleImage.startsWith('data:')) {
      // Extrahiere MIME-Type und Base64-Daten
      const [mimeInfo, base64Data] = order.titleImage.split(',');
      const mimeType = mimeInfo.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
      
      // Konvertiere Base64 zu Buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', mimeType);
      res.send(imageBuffer);
    } else {
      res.status(400).send('Ungültiges Bildformat');
    }
  } catch (err) {
    console.error('Error fetching title image:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen des Bildes.' });
  }
});

// Dokument herunterladen für PDF-Generierung
app.get('/api/documents/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    console.log('Document download request for:', documentId);
    
    // Zuerst in der normalen Document-Tabelle suchen
    let document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    // Falls nicht gefunden, in der ComponentDocument-Tabelle suchen
    if (!document) {
      document = await prisma.componentDocument.findUnique({
        where: { id: documentId }
      });
      
      if (document) {
        console.log('Found component document:', document.name);
      }
    } else {
      console.log('Found order document:', document.name);
    }

    if (!document) {
      console.log('Document not found in both tables for ID:', documentId);
      return res.status(404).json({ error: 'Dokument nicht gefunden' });
    }

    // Extrahiere Dateiname aus der URL
    const fs = require('fs');
    const path = require('path');
    
    // Die URL ist normalerweise: http://localhost:3001/uploads/filename
    const filename = document.url.split('/').pop();
    const filePath = path.join(__dirname, 'storage/uploads', filename);
    
    console.log('Trying to serve file:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).json({ error: 'Datei nicht gefunden', path: filePath });
    }

    // Content-Type für PDF setzen
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);
    
    // Datei zurückgeben
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('Document download error:', err);
    res.status(500).json({ error: 'Fehler beim Herunterladen des Dokuments', details: err.message });
  }
});

app.use('/uploads', express.static(uploadsDir));

// --- TEST ENDPOINT ---
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// QR-Code/Barcode-Lookup Endpunkt
app.get('/api/orders/barcode/:code', async (req, res) => {
  try {
    const code = req.params.code;
    console.log('QR-Code/Barcode lookup for:', code);
    
    // Helper function to check if string is a valid MongoDB ObjectID
    const isValidObjectId = (str) => {
      return /^[a-fA-F0-9]{24}$/.test(str);
    };

    // Build search conditions - only search by ID if it's a valid ObjectID
    const searchConditions = [
      { orderNumber: code }
    ];

    // Only add ID search if the code is a valid ObjectID format
    if (isValidObjectId(code)) {
      searchConditions.push({ id: code });
    }
    
    // Suche nach Auftragsnummer oder ID (falls gültige ObjectID)
    const order = await prisma.order.findFirst({
      where: {
        OR: searchConditions
      },
      include: {
        documents: true,
        components: {
          include: {
            documents: true
          }
        },
        noteHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      console.log(`No order found for code: ${code} (searched ${searchConditions.length} conditions)`);
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }

    console.log(`Found order: ${order.orderNumber || order.id} for code: ${code}`);
    res.json(order);
  } catch (err) {
    console.error('QR-Code/Barcode lookup error:', err);
    res.status(500).json({ error: 'Fehler beim QR-Code-Lookup', details: err.message });
  }
});

// API zum manuellen Migrieren von Dateien in den Netzwerkordner
app.post('/api/orders/:orderId/migrate-files', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Prüfe ob Auftrag existiert
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        orderNumber: true, 
        networkPath: true, 
        networkFolderCreated: true 
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }
    
    // Wenn kein Netzwerkordner existiert, erstelle ihn zuerst
    if (!order.networkFolderCreated) {
      const folderResult = await createNetworkOrderFolder(order.orderNumber, orderId);
      if (!folderResult.success) {
        return res.status(500).json({ 
          error: 'Netzwerkordner konnte nicht erstellt werden', 
          details: folderResult.message 
        });
      }
      
      res.json({
        success: true,
        message: 'Netzwerkordner erstellt und Dateien migriert',
        folderPath: folderResult.path,
        migrationResult: folderResult.migrationResult
      });
    } else {
      // Wenn der Ordner bereits existiert, führe nur die Migration durch
      const networkPath = order.networkPath;
      if (!networkPath) {
        return res.status(500).json({ error: 'Netzwerkpfad nicht gesetzt obwohl Ordner als erstellt markiert ist' });
      }
      
      const migrationResult = await migrateExistingFilesToNetworkFolder(orderId, networkPath);
      
      res.json({
        success: true,
        message: 'Dateien in existierenden Netzwerkordner migriert',
        folderPath: networkPath,
        migrationResult
      });
    }
  } catch (error) {
    console.error('[ERROR] Fehler bei manueller Dateimigration:', error);
    res.status(500).json({ 
      error: 'Interner Server-Fehler bei der Dateimigration', 
      details: error.message 
    });
  }
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

// === NETZWERKORDNER MANAGEMENT API ===

// Netzwerkordner für bestehenden Auftrag erstellen
app.post('/api/orders/:orderId/create-network-folder', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Hole Auftragsdaten
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, title: true }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }
    
    // Erstelle Netzwerkordner
    const result = await createNetworkOrderFolder(order.orderNumber, orderId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        path: result.path,
        orderNumber: order.orderNumber
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
        orderNumber: order.orderNumber
      });
    }
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Netzwerkordners:', error);
    res.status(500).json({ 
      error: 'Interner Server-Fehler beim Erstellen des Netzwerkordners',
      details: error.message 
    });
  }
});

// Netzwerkordner-Status prüfen
app.get('/api/orders/:orderId/network-folder-status', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Hole Auftragsdaten
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }
    
    // Prüfe Netzwerkordner-Status
    if (NETWORK_BASE_PATH === 'PLATZHALTER_NETZWERKPFAD') {
      return res.json({
        configured: false,
        exists: false,
        message: 'Netzwerkpfad nicht konfiguriert',
        basePath: 'Nicht konfiguriert'
      });
    }
    
    const safeFolderName = `${order.orderNumber}`.replace(/[<>:"|?*]/g, '_');
    const orderFolderPath = path.join(NETWORK_BASE_PATH, safeFolderName);
    const exists = fs.existsSync(orderFolderPath);
    
    res.json({
      configured: true,
      exists: exists,
      path: exists ? orderFolderPath : null,
      basePath: NETWORK_BASE_PATH,
      orderNumber: order.orderNumber,
      message: exists ? 'Netzwerkordner existiert' : 'Netzwerkordner nicht gefunden'
    });
    
  } catch (error) {
    console.error('Fehler beim Prüfen des Netzwerkordner-Status:', error);
    res.status(500).json({ 
      error: 'Fehler beim Prüfen des Netzwerkordner-Status',
      details: error.message 
    });
  }
});

// Alle Netzwerkordner für alle Aufträge erstellen (Admin-Funktion)
app.post('/api/admin/create-all-network-folders', async (req, res) => {
  try {
    if (NETWORK_BASE_PATH === 'PLATZHALTER_NETZWERKPFAD') {
      return res.status(400).json({ 
        error: 'Netzwerkpfad nicht konfiguriert. Bitte NETWORK_BASE_PATH setzen.' 
      });
    }
    
    // Hole alle Aufträge
    const orders = await prisma.order.findMany({
      select: { id: true, orderNumber: true, title: true }
    });
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const order of orders) {
      const result = await createNetworkOrderFolder(order.orderNumber, order.id);
      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        success: result.success,
        message: result.message
      });
      
      if (result.success) successCount++;
      else errorCount++;
    }
    
    res.json({
      success: true,
      message: `Netzwerkordner-Erstellung abgeschlossen`,
      statistics: {
        total: orders.length,
        created: successCount,
        errors: errorCount
      },
      results: results
    });
    
  } catch (error) {
    console.error('Fehler beim Erstellen aller Netzwerkordner:', error);
    res.status(500).json({ 
      error: 'Fehler beim Erstellen aller Netzwerkordner',
      details: error.message 
    });
  }
});

// Netzwerkpfad-Konfiguration anzeigen (für Admin)
app.get('/api/admin/network-config', (req, res) => {
  res.json({
    configured: NETWORK_BASE_PATH !== 'PLATZHALTER_NETZWERKPFAD',
    basePath: NETWORK_BASE_PATH,
    accessible: NETWORK_BASE_PATH !== 'PLATZHALTER_NETZWERKPFAD' ? fs.existsSync(NETWORK_BASE_PATH) : false,
    message: NETWORK_BASE_PATH === 'PLATZHALTER_NETZWERKPFAD' 
      ? 'Netzwerkpfad nicht konfiguriert. Setzen Sie die Umgebungsvariable NETWORK_BASE_PATH.' 
      : 'Netzwerkpfad konfiguriert'
  });
});

// === SYSTEMKONFIGURATION API ===
// Hilfsfunktion zum Laden der aktuellen Netzwerkordner-Konfiguration
async function getNetworkConfig() {
  try {
    // Verwende direkte MongoDB-Operationen statt Prisma
    let networkPathConfig = null;
    if (db) {
      networkPathConfig = await db.collection('SystemConfig').findOne({
        key: 'NETWORK_BASE_PATH'
      });
    }
    
    // Wenn die Konfiguration existiert, verwende sie, ansonsten den Platzhalter
    const configValue = networkPathConfig?.value || NETWORK_BASE_PATH;
    console.log(`[DEBUG] getNetworkConfig: Found config value: "${configValue}"`);
    return configValue;
  } catch (error) {
    console.error('[ERROR] Fehler beim Laden der Netzwerkpfad-Konfiguration:', error);
    return NETWORK_BASE_PATH;
  }
}

// API-Endpunkt: Alle Systemkonfigurationen abrufen (nur für Admins)
app.get('/api/system/config', async (req, res) => {
  try {
    // TODO: Zugriffsrechte prüfen (nur Admin)
    let configs = [];
    if (db) {
      configs = await db.collection('SystemConfig').find({}).toArray();
    }
    res.json(configs);
  } catch (err) {
    console.error('[ERROR] GET /api/system/config:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Systemkonfigurationen', details: err.message });
  }
});

// API-Endpunkt: Bestimmte Systemkonfiguration abrufen
app.get('/api/system/config/:key', async (req, res) => {
  try {
    let config = null;
    if (db) {
      config = await db.collection('SystemConfig').findOne({ key: req.params.key });
    }
    
    if (!config) {
      return res.status(404).json({ error: `Konfiguration '${req.params.key}' nicht gefunden` });
    }
    
    res.json(config);
  } catch (err) {
    console.error('[ERROR] GET /api/system/config/:key:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Konfiguration', details: err.message });
  }
});

// API-Endpunkt: Systemkonfiguration aktualisieren oder erstellen
app.post('/api/system/config', async (req, res) => {
  try {
    // TODO: Zugriffsrechte prüfen (nur Admin)
    const { key, value, description, userId } = req.body;
    
    console.log('[DEBUG] POST /api/system/config - Request:', JSON.stringify({ key, value, description, userId }));
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Schlüssel und Wert sind erforderlich' });
    }
    
    // Stelle sicher, dass der Pfad korrekt formatiert ist
    let processedValue = value;
    
    // Für Pfadwerte: Normalisiere sie auf Forward Slashes
    if (key === 'NETWORK_BASE_PATH') {
      try {
        // Überprüfe, ob es sich um einen gültigen Pfad handelt
        if (processedValue !== 'PLATZHALTER_NETZWERKPFAD') {
          // Entferne Anführungszeichen falls vorhanden
          processedValue = processedValue.replace(/^["']|["']$/g, '');
          
          // Für Windows-Netzwerkpfade: Stelle sicher, dass UNC-Pfade korrekt formatiert sind
          if (processedValue.startsWith('\\\\')) {
            // Bereits ein UNC-Pfad, belassen wie er ist
            console.log(`[DEBUG] UNC network path detected: "${processedValue}"`);
          } else if (processedValue.match(/^[a-zA-Z]:\\/)) {
            // Lokaler Windows-Pfad (z.B. C:\Ordner)
            console.log(`[DEBUG] Local Windows path detected: "${processedValue}"`);
          } else {
            // Kein offensichtlicher Windows-Pfad, Normalisierung durchführen
            processedValue = processedValue.replace(/\\\\/g, '/').replace(/\\/g, '/');
            console.log(`[DEBUG] Normalized path: "${value}" -> "${processedValue}"`);
          }
        }
      } catch (pathError) {
        console.error('[ERROR] Path normalization error:', pathError);
      }
    }
    
    // Statt Prisma verwenden wir direkte MongoDB-Operationen um Transaktionsprobleme zu vermeiden
    try {
      console.log(`[DEBUG] Attempting to save config with key=${key}, value=${processedValue}`);
      
      if (!db) {
        throw new Error('Database connection not available');
      }
      
      // Prüfen, ob der Konfigurationseintrag bereits existiert
      const existingConfig = await db.collection('SystemConfig').findOne({ key });
      
      let config;
      const configData = {
        key,
        value: processedValue,
        description: description || '',
        updatedAt: new Date(),
        updatedBy: userId || 'system'
      };
      
      if (existingConfig) {
        // Wenn existiert, dann update
        const result = await db.collection('SystemConfig').updateOne(
          { key },
          { $set: configData }
        );
        
        if (result.modifiedCount > 0) {
          config = await db.collection('SystemConfig').findOne({ key });
        } else {
          throw new Error('Update operation failed');
        }
      } else {
        // Sonst neu erstellen
        const result = await db.collection('SystemConfig').insertOne(configData);
        if (result.insertedId) {
          config = await db.collection('SystemConfig').findOne({ _id: result.insertedId });
        } else {
          throw new Error('Insert operation failed');
        }
      }
      
      console.log(`[DEBUG] Config saved successfully:`, config);
      
      // Wenn der Netzwerkpfad aktualisiert wurde, auch die globale Variable aktualisieren
      if (key === 'NETWORK_BASE_PATH') {
        // Für das laufende System aktualisieren (wird bei Neustart überschrieben)
        process.env.NETWORK_BASE_PATH = processedValue;
        console.log(`[CONFIG] Netzwerkpfad aktualisiert: ${processedValue}`);
      }
      
      res.json(config);
    } catch (dbError) {
      console.error('[ERROR] Database operation failed:', dbError);
      res.status(500).json({ 
        error: 'Fehler beim Aktualisieren der Konfiguration', 
        details: dbError.message,
        code: dbError.code || 'UNKNOWN'
      });
    }
  } catch (err) {
    console.error('[ERROR] POST /api/system/config:', err);
    res.status(500).json({ 
      error: 'Fehler beim Aktualisieren der Konfiguration', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// API-Endpunkt: Netzwerkpfad testen
app.get('/api/system/network-test', async (req, res) => {
  try {
    // Lade aktuelle Konfiguration
    const networkPath = await getNetworkConfig();
    
    console.log(`[DEBUG] GET /api/system/network-test - Path to test: "${networkPath}"`);
    
    if (networkPath === 'PLATZHALTER_NETZWERKPFAD') {
      return res.json({ 
        success: false, 
        status: 'not_configured',
        message: 'Netzwerkpfad ist nicht konfiguriert'
      });
    }
    
    // Prüfe ob der Pfad existiert und zugänglich ist
    try {
      if (fs.existsSync(networkPath)) {
        // Versuche, einen Testordner zu erstellen und wieder zu löschen
        const testDir = path.join(networkPath, '_test_' + Date.now());
        console.log(`[DEBUG] Attempting to create test directory: "${testDir}"`);
        
        try {
          fs.mkdirSync(testDir);
          fs.rmdirSync(testDir);
          return res.json({ 
            success: true, 
            status: 'accessible',
            path: networkPath,
            message: 'Netzwerkpfad ist erreichbar und schreibbar'
          });
        } catch (writeError) {
          console.error(`[ERROR] Could not write to directory: ${writeError.message}`);
          return res.json({ 
            success: false, 
            status: 'not_writable',
            path: networkPath,
            message: 'Netzwerkpfad existiert, ist aber nicht schreibbar',
            error: writeError.message
          });
        }
      } else {
        console.log(`[DEBUG] Path does not exist: "${networkPath}"`);
        return res.json({ 
          success: false, 
          status: 'not_found',
          path: networkPath,
          message: 'Netzwerkpfad existiert nicht oder ist nicht erreichbar'
        });
      }
    } catch (fsError) {
      console.error(`[ERROR] Error checking path: ${fsError.message}`);
      return res.json({
        success: false,
        status: 'error',
        path: networkPath,
        message: `Fehler beim Zugriff auf den Pfad: ${fsError.message}`
      });
    }
  } catch (err) {
    console.error('[ERROR] GET /api/system/network-test:', err);
    res.status(500).json({ 
      error: 'Fehler beim Testen des Netzwerkpfads', 
      details: err.message 
    });
  }
});

// API-Endpunkt: Status des Netzwerkordners für einen Auftrag prüfen
app.get('/api/orders/:id/network-folder', async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log(`[DEBUG] GET /api/orders/${orderId}/network-folder - Start`);
    
    // Lade Auftrag mit Netzwerkpfad
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true,
        orderNumber: true,
        networkPath: true,
        networkFolderCreated: true
      }
    });
    
    if (!order) {
      console.log(`[ERROR] Order not found: ${orderId}`);
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }
    
    console.log(`[DEBUG] Order found: ${order.orderNumber}, networkPath: ${order.networkPath}`);
    
    // Wenn der Netzwerkpfad bereits gespeichert ist, prüfe ob er existiert
    if (order.networkPath) {
      const exists = fs.existsSync(order.networkPath);
      console.log(`[DEBUG] Checking existing path: ${order.networkPath}, exists: ${exists}`);
      return res.json({
        success: exists,
        orderNumber: order.orderNumber,
        networkPath: order.networkPath,
        exists: exists,
        message: exists ? 'Netzwerkordner existiert' : 'Netzwerkordner existiert nicht mehr'
      });
    }
    
    // Netzwerkpfad ist nicht gespeichert, aber wir können prüfen ob er existieren würde
    console.log(`[DEBUG] No network path saved, checking configuration...`);
    const networkPath = await getNetworkConfig();
    if (networkPath === 'PLATZHALTER_NETZWERKPFAD') {
      console.log(`[DEBUG] Network path not configured`);
      return res.json({
        success: false,
        orderNumber: order.orderNumber,
        exists: false,
        message: 'Netzwerkpfad ist nicht konfiguriert'
      });
    }
    
    // Prüfe ob der Ordner existieren würde
    const safeFolderName = `${order.orderNumber || order.id}`.replace(/[<>:"|?*]/g, '_');
    const potentialPath = path.join(networkPath, safeFolderName);
    const canCreate = fs.existsSync(networkPath);
    
    console.log(`[DEBUG] Potential path: ${potentialPath}, can create: ${canCreate}`);
    
    return res.json({
      success: false,
      orderNumber: order.orderNumber,
      potentialPath: potentialPath,
      exists: false,
      canCreate: canCreate,
      message: 'Netzwerkordner wurde noch nicht erstellt'
    });
  } catch (err) {
    console.error(`[ERROR] GET /api/orders/${req.params.id}/network-folder:`, err);
    res.status(500).json({ 
      error: 'Fehler beim Prüfen des Netzwerkordners', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// API-Endpunkt: Netzwerkordner für einen Auftrag erstellen oder aktualisieren
app.post('/api/orders/:id/network-folder', async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log(`[DEBUG] POST /api/orders/${orderId}/network-folder - Start`);
    
    // Lade Auftrag
    console.log(`[DEBUG] Loading order with ID: ${orderId}`);
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      console.log(`[ERROR] Order not found: ${orderId}`);
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }
    
    console.log(`[DEBUG] Order found: ${order.orderNumber}, creating network folder...`);
    
    // Erstelle oder aktualisiere den Netzwerkordner
    const result = await createNetworkOrderFolder(order.orderNumber, order.id);
    console.log(`[DEBUG] Network folder creation result:`, result);
    
    // Erfolg: Speichere den Pfad und Status in der Datenbank
    if (result.success) {
      console.log(`[DEBUG] Updating order with network path: ${result.path}`);
      try {
        // Versuche zuerst mit Prisma
        await prisma.order.update({
          where: { id: orderId },
          data: {
            networkPath: result.path,
            networkFolderCreated: true
          }
        });
        console.log(`[DEBUG] Order updated successfully with Prisma`);
      } catch (updateError) {
        console.error(`[ERROR] Prisma update failed, trying direct MongoDB:`, updateError);
        // Fallback: Verwende direkte MongoDB-Operationen
        try {
          if (db) {
            const { ObjectId } = require('mongodb');
            const updateResult = await db.collection('Order').updateOne(
              { _id: new ObjectId(orderId) },
              { 
                $set: {
                  networkPath: result.path,
                  networkFolderCreated: true,
                  updatedAt: new Date()
                }
              }
            );
            
            if (updateResult.modifiedCount > 0) {
              console.log(`[DEBUG] Order updated successfully with direct MongoDB`);
            } else {
              console.warn(`[WARN] No document was modified in MongoDB update`);
              result.warning = 'Ordner erstellt, aber Datenbankupdate fehlgeschlagen';
            }
          } else {
            result.warning = 'Ordner erstellt, aber Datenbankupdate fehlgeschlagen (keine DB-Verbindung)';
          }
        } catch (mongoError) {
          console.error(`[ERROR] MongoDB update also failed:`, mongoError);
          result.warning = 'Ordner erstellt, aber Datenbankupdate fehlgeschlagen';
        }
      }
    }
    
    res.json(result);
  } catch (err) {
    console.error(`[ERROR] POST /api/orders/${req.params.id}/network-folder:`, err);
    res.status(500).json({ 
      error: 'Fehler beim Erstellen des Netzwerkordners', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Hilfsfunktion: Kopiere bestehende Dateien in den Netzwerkordner
async function migrateExistingFilesToNetworkFolder(orderId, orderFolderPath) {
  try {
    console.log(`[INFO] Migrating existing files to network folder for order ${orderId}...`);
    
    // 1. Hole alle Dokumente des Auftrags
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        documents: true,
        components: {
          include: {
            documents: true
          }
        }
      }
    });
    
    if (!order) {
      console.error(`[ERROR] Order ${orderId} not found for file migration`);
      return { success: false, message: 'Auftrag nicht gefunden' };
    }
    
    let migratedFiles = 0;
    const errors = [];
    // Zähler für verschiedene Dateitypen (global für den gesamten Auftrag)
    const fileTypeCount = {};
    
    // 2. Kopiere Hauptauftragsdokumente in die passenden Unterordner
    if (order.documents && order.documents.length > 0) {
      for (const doc of order.documents) {
        try {
          if (doc.url && doc.url.startsWith('/uploads/')) {
            const filename = doc.url.split('/').pop();
            const sourcePath = path.join(__dirname, 'storage/uploads', filename);
            
            // Bestimme den passenden Unterordner für die Datei
            const subFolder = getDestinationSubfolderForFile(filename);
            
            // Zähle Dateitypen
            fileTypeCount[subFolder] = (fileTypeCount[subFolder] || 0) + 1;
            
            // Stelle sicher, dass der Unterordner existiert
            const destFolder = path.join(orderFolderPath, subFolder);
            if (!fs.existsSync(destFolder)) {
              fs.mkdirSync(destFolder, { recursive: true });
            }
            
            const destPath = path.join(destFolder, filename);
            
            if (fs.existsSync(sourcePath)) {
              // Kopiere die Datei in den Netzwerkordner
              fs.copyFileSync(sourcePath, destPath);
              console.log(`[SUCCESS] Migrated file: ${sourcePath} -> ${destPath}`);
              migratedFiles++;
            } else {
              console.warn(`[WARN] Source file not found: ${sourcePath}`);
              errors.push(`Quelldatei nicht gefunden: ${filename}`);
            }
          }
        } catch (fileError) {
          console.error(`[ERROR] Failed to migrate file ${doc.name}:`, fileError);
          errors.push(`Fehler beim Kopieren von ${doc.name}: ${fileError.message}`);
        }
      }
      
      // Log der Dateitypen
      console.log(`[INFO] File type distribution for order ${orderId}:`, fileTypeCount);
    }
    
    // 3. Kopiere Bauteil-Dokumente in die entsprechenden Bauteil-Ordner
    if (order.components && order.components.length > 0) {
      for (const component of order.components) {
        if (component.documents && component.documents.length > 0) {
          // Erstelle sicheren Bauteilordnernamen
          const safeComponentName = component.title.replace(/[<>:"|?*]/g, '_');
          const componentFolder = path.join(orderFolderPath, 'Bauteile', safeComponentName);
          
          // Stelle sicher, dass der Bauteil-Ordner existiert
          if (!fs.existsSync(componentFolder)) {
            fs.mkdirSync(componentFolder, { recursive: true });
            // Erstelle die Bauteil-Unterordnerstruktur
            createComponentSubfolders(componentFolder);
          }
          
          // Zähler für verschiedene Dateitypen für dieses Bauteil
          const componentFileTypeCount = {};
          
          for (const doc of component.documents) {
            try {
              if (doc.url && doc.url.startsWith('/uploads/')) {
                const filename = doc.url.split('/').pop();
                const sourcePath = path.join(__dirname, 'storage/uploads', filename);
                
                // Bestimme den passenden Unterordner für die Datei
                const subFolder = getDestinationSubfolderForFile(filename);
                
                // Zähle Dateitypen
                componentFileTypeCount[subFolder] = (componentFileTypeCount[subFolder] || 0) + 1;
                
                // Zähle auch im globalen Zähler
                fileTypeCount[subFolder] = (fileTypeCount[subFolder] || 0) + 1;
                
                // Stelle sicher, dass der Unterordner existiert
                const destSubFolder = path.join(componentFolder, subFolder);
                if (!fs.existsSync(destSubFolder)) {
                  fs.mkdirSync(destSubFolder, { recursive: true });
                }
                
                const destPath = path.join(destSubFolder, filename);
                
                if (fs.existsSync(sourcePath)) {
                  // Kopiere die Datei in den Netzwerkordner
                  fs.copyFileSync(sourcePath, destPath);
                  console.log(`[SUCCESS] Migrated component file: ${sourcePath} -> ${destPath}`);
                  migratedFiles++;
                } else {
                  console.warn(`[WARN] Source file not found: ${sourcePath}`);
                  errors.push(`Quelldatei nicht gefunden: ${filename}`);
                }
              }
            } catch (fileError) {
              console.error(`[ERROR] Failed to migrate component file ${doc.name}:`, fileError);
              errors.push(`Fehler beim Kopieren von Bauteil-Datei ${doc.name}: ${fileError.message}`);
            }
          }
          
          // Log der Dateitypen für das Bauteil
          console.log(`[INFO] File type distribution for component ${component.title}:`, componentFileTypeCount);
        }
      }
    }
    
    return {
      success: true,
      migratedFiles,
      errors: errors.length > 0 ? errors : null,
      message: `${migratedFiles} Datei(en) in den Netzwerkordner migriert`,
      fileTypes: fileTypeCount || {}
    };
  } catch (error) {
    console.error('[ERROR] File migration error:', error);
    return {
      success: false,
      message: `Fehler bei der Datei-Migration: ${error.message}`,
      error
    };
  }
}

// Hilfsfunktion: Bestimme den passenden Unterordner basierend auf Dateityp
function getDestinationSubfolderForFile(filename) {
  // Dateiendung extrahieren
  const extension = path.extname(filename).toLowerCase();
  
  // CAD/CAM-Dateien
  if (['.dxf', '.dwg', '.stl', '.step', '.stp', '.iges', '.igs', '.x_t', '.gcode'].includes(extension)) {
    return 'CAD_CAM';
  }
  
  // Bilder
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff'].includes(extension)) {
    return 'Bilder';
  }
  
  // PDF-Dokumente (Standardfall für Dokumentation)
  if (['.pdf'].includes(extension)) {
    return 'Dokumentation';
  }
  
  // Office-Dokumente
  if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'].includes(extension)) {
    return 'Dokumente';
  }
  
  // Standardfall: Dokumentation
  return 'Dokumentation';
}

// Hilfsfunktion: Erstelle Bauteil-Unterordnerstruktur
function createComponentSubfolders(componentFolder) {
  const componentSubFolders = [
    'CAD_CAM',           // CAD/CAM-Dateien des Bauteils
    'Zeichnungen',       // Technische Zeichnungen des Bauteils
    'Dokumentation',     // Bauteil-spezifische Dokumentation
    'Bilder',            // Fotos und Bilder des Bauteils
    'Dokumente'          // Sonstige Dokumente zum Bauteil
  ];
  
  for (const folder of componentSubFolders) {
    const subFolderPath = path.join(componentFolder, folder);
    if (!fs.existsSync(subFolderPath)) {
      fs.mkdirSync(subFolderPath, { recursive: true });
    }
  }
}

