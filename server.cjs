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
app.use(express.json());

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
      include: { documents: true },
      orderBy: { createdAt: 'desc' }
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
        ...orderData,
        id: auftragsnummer,
        deadline: new Date(orderData.deadline),
        createdAt: new Date(),
        updatedAt: new Date(),
        subTasks: orderData.subTasks || [],
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
      revisionComment, // NEU: Kommentar für Nacharbeit
      userId,          // NEU: User, der den Kommentar anlegt
      userName         // NEU: Name des Users
    } = req.body;

    // Hole bisherigen Verlauf
    const existingOrder = await prisma.order.findUnique({ where: { id: req.params.id } });
    let revisionHistory = Array.isArray(existingOrder.revisionHistory) ? existingOrder.revisionHistory : [];

    // Wenn Status auf revision gesetzt wird und ein Kommentar übergeben wurde, neuen Verlaufseintrag anhängen
    if (status === 'revision' && revisionComment && userId && userName) {
      revisionHistory = [
        ...revisionHistory,
        {
          comment: revisionComment,
          userId,
          userName,
          createdAt: new Date().toISOString()
        }
      ];
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
      revisionHistory, // Verlauf speichern
      updatedAt: new Date()
    };
    // Entferne undefined Werte
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    console.log('PUT /api/orders/:id updateData:', updateData);
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
      include: { documents: true }
    });
    // WebSocket-Broadcast für sofortiges Update
    const allOrders = await prisma.order.findMany({ include: { documents: true } });
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

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei empfangen!' });
  }
  // Metadaten werden erst beim Auftrag angelegt, daher hier nur Dateiname zurückgeben
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

app.use('/uploads', express.static(uploadsDir));

// --- TEST ENDPOINT ---
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

