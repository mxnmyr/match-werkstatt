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
    const { documents, ...orderData } = req.body;
    // --- Auftragsnummer generieren ---
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const prefix = orderData.orderType === 'fertigung' ? 'F' : 'S';
    // Zähle bestehende Aufträge dieses Typs und Datums
    const count = await prisma.order.count({
      where: {
        orderType: orderData.orderType,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        }
      }
    });
    const laufendeNummer = count + 1;
    const auftragsnummer = `${prefix}-${dateStr}-${laufendeNummer}`;
    // ---
    const order = await prisma.order.create({
      data: {
        id: auftragsnummer,
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
        // titleImage has been removed, will be handled by separate upload
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: {
          create: (documents || []).map(doc => ({
            name: doc.name,
            url: doc.url,
            uploadDate: doc.uploadDate ? new Date(doc.uploadDate) : new Date()
          }))
        }
      },
      include: { documents: true }
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Anlegen des Auftrags', details: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
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
      userName
      // titleImage is no longer updated directly here
    } = req.body;

    console.log('=== EXTRACTED FIELDS ===');
    console.log('status:', status);
    console.log('revisionRequest:', revisionRequest);
    console.log('userId:', userId);
    console.log('userName:', userName);
    console.log('========================');

    // Hole bisherigen Verlauf
    const existingOrder = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existingOrder) {
      return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    }
    let revisionHistory = Array.isArray(existingOrder.revisionHistory) ? existingOrder.revisionHistory : [];
    let reworkComments = Array.isArray(existingOrder.reworkComments) ? existingOrder.reworkComments : [];

    // Wenn Notizen geändert wurden, alten Stand historisieren
    if (notes !== undefined && notes !== existingOrder.notes) {
      await prisma.noteHistory.create({
        data: {
          orderId: req.params.id,
          notes: existingOrder.notes || '',
          createdAt: new Date(),
        },
      });
    }

    // Fallback: userId/userName ggf. aus revisionRequest holen, falls auf Top-Level nicht vorhanden
    let effectiveUserId = userId;
    let effectiveUserName = userName;
    // Das revisionRequest-Objekt wird nicht mehr verwendet, der Fallback ist nicht mehr nötig.
    // if ((!effectiveUserId || !effectiveUserName) && revisionRequest) {
    //   if (revisionRequest.userId && revisionRequest.userName) {
    //     effectiveUserId = revisionRequest.userId;
    //     effectiveUserName = revisionRequest.userName;
    //     console.log('Fallback: userId/userName aus revisionRequest entnommen');
    //   }
    // }

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
    // Logik korrigiert: Prüft jetzt auf `revisionComment` statt `revisionRequest`
    if (status === 'rework' && revisionComment && effectiveUserId && effectiveUserName) {
      console.log('Fall 2: Kunden-Nacharbeit wird verarbeitet...');
      reworkComments.push({
        comment: revisionComment, // Korrigiert: `revisionComment` direkt verwenden
        userId: effectiveUserId,
        userName: effectiveUserName,
        documents: [], // Dokumente werden jetzt separat gehandhabt
        createdAt: new Date().toISOString() // Geändert von requestedAt
      });
    }

    const updateData = {
      title,
      description,
      clientId,
      clientName,
      deadline: deadline ? new Date(deadline) : undefined,
      costCenter,
      priority,
      status,
      estimatedHours,
      actualHours,
      assignedTo,
      notes,
      orderType,
      subTasks: subTasks || [],
      revisionHistory, // Verlauf Werkstatt -> Kunde
      reworkComments,  // Verlauf Kunde -> Werkstatt
      updatedAt: new Date()
    };

    // Sonderfall: Titelbild entfernen
    if (req.body.titleImage === null) {
      console.log('Fall 3: Titelbild wird entfernt...');
      const existingOrder = await prisma.order.findUnique({ 
        where: { id: req.params.id }, 
        select: { titleImageId: true } 
      });
      if (existingOrder && existingOrder.titleImageId) {
        // The onDelete: Cascade in the schema should handle the deletion,
        // but we explicitly set the link to null.
        updateData.titleImageId = null; 
        // The actual image deletion from the Image table is handled by the cascade.
      }
    }


    // Entferne undefined Werte
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    console.log('PUT /api/orders/:id updateData:', updateData);
    
    // Dokumente werden durch das include automatisch mitgeladen, 
    // sie müssen nicht explizit im updateData stehen da sie eine separate Tabelle sind
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        documents: true,
        noteHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        titleImage: true,
      },
    });
    // WebSocket-Broadcast für sofortiges Update
    const allOrders = await prisma.order.findMany({
      include: {
        documents: true,
        noteHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        titleImage: true,
      },
    });
    broadcast('ordersUpdated', allOrders);
    res.json(order);
  } catch (err) {
    console.error('PUT /api/orders/:id ERROR:', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Auftrags', details: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    // Erst Dokumente löschen (wegen Foreign Key)
    await prisma.document.deleteMany({ where: { orderId: req.params.id } });
    
    // Das verbundene Bild wird dank "onDelete: Cascade" im Schema automatisch mitgelöscht.
    
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
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
        noteHistory: true,
        titleImage: true
       },
    });

    // WebSocket-Broadcast für sofortiges Update
    const allOrders = await prisma.order.findMany({
      include: {
        documents: true,
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

app.use('/uploads', express.static(uploadsDir));

// --- TEST ENDPOINT ---
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

