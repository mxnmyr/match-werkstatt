const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadsDir = path.join(__dirname, 'storage', 'uploads');

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
        titleImage: true, // Include the related image model
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
          titleImage: true,
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

// Multer-Konfiguration für In-Memory-Speicherung (für DB-Upload)
const memoryUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei empfangen!' });
  }
  // Metadaten werden erst beim Auftrag angelegt, daher hier nur Dateiname zurückgeben
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// Endpunkt für Titelbild-Upload in die DB (neue Logik mit Image-Tabelle)
app.post('/api/orders/:id/upload-title-image', memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    }

    const orderId = req.params.id;
    const imageBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // 1. Finde den Auftrag und prüfe, ob bereits ein Bild existiert
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { titleImageId: true }
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Auftrag nicht gefunden.' });
    }

    // 2. Wenn ein altes Bild existiert, lösche es.
    // Die Kaskadierung sollte das beim Ersetzen des Links eigentlich tun, aber zur Sicherheit...
    if (existingOrder.titleImageId) {
      await prisma.image.delete({ where: { id: existingOrder.titleImageId }});
    }

    // 3. Erstelle den neuen Bildeintrag
    const newImage = await prisma.image.create({
      data: {
        mimeType: mimeType,
        data: imageBuffer,
      }
    });

    // 4. Verknüpfe das neue Bild mit dem Auftrag
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        titleImageId: newImage.id
      },
      include: { 
        documents: true,
        components: {
          include: {
            documents: true
          }
        },
        noteHistory: true,
        titleImage: true
       },
    });

    // WebSocket-Broadcast für sofortiges Update
    const allOrders = await prisma.order.findMany({
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
        titleImage: true,
      },
    });
    broadcast('ordersUpdated', allOrders);

    // Nur die notwendigen Daten zurücksenden, nicht das ganze Bild
    const { titleImage, ...orderWithoutImage } = updatedOrder;
    res.json({ ...orderWithoutImage, titleImage: { id: updatedOrder.titleImage.id } }); // Nur die ID zurückgeben

  } catch (err) {
    console.error('Error uploading title image:', err);
    res.status(500).json({ error: 'Fehler beim Hochladen des Titelbildes.', details: err.message });
  }
});

// Endpunkt zum Abrufen des Titelbildes (neue Logik mit Image-Tabelle)
app.get('/api/orders/:id/title-image', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { titleImage: true },
    });

    if (!order || !order.titleImage) {
      return res.status(404).send('Bild nicht gefunden');
    }

    res.setHeader('Content-Type', order.titleImage.mimeType || 'application/octet-stream');
    res.send(order.titleImage.data);
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
    
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
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
    
    // Suche nach Auftragsnummer oder ID
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: code },
          { id: code }
        ]
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
        titleImage: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }

    res.json(order);
  } catch (err) {
    console.error('QR-Code/Barcode lookup error:', err);
    res.status(500).json({ error: 'Fehler beim QR-Code-Lookup', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

