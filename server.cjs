const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const usersPath = path.join(__dirname, 'storage', 'users', 'users.json');
const ordersPath = path.join(__dirname, 'storage', 'orders', 'orders.json');
const uploadsDir = path.join(__dirname, 'storage', 'uploads');

// Ensure storage files exist
if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '[]');
if (!fs.existsSync(ordersPath)) fs.writeFileSync(ordersPath, '[]');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(type, payload) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, payload }));
    }
  });
}

// --- USERS ---
app.get('/api/users', (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersPath));
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersPath));
  const usernameExists = users.some(u => u.username === req.body.username);
  if (usernameExists) {
    return res.status(409).json({ error: 'Benutzername bereits vergeben' });
  }
  const newUser = {
    ...req.body,
    role: 'client',
    isActive: true,
    createdAt: new Date().toISOString(),
    id: String(Date.now())
  };
  users.push(newUser);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  broadcast('usersUpdated', users);
  res.status(201).json(newUser);
});

// Login-Endpoint
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(usersPath));
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      if (user.role === 'client' && user.isApproved === false) {
        return res.status(403).json({ success: false, message: 'Account noch nicht bestätigt' });
      }
      res.json({ success: true, user });
    } else {
      console.log('Login fehlgeschlagen:', username, password);
      res.status(401).json({ success: false, message: 'Ungültige Zugangsdaten' });
    }
  } catch (err) {
    console.error('Login-Fehler:', err);
    res.status(500).json({ success: false, message: 'Serverfehler beim Login', error: err.message });
  }
});

// --- ORDERS ---
app.get('/api/orders', (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ordersPath));
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  console.log('POST /api/orders empfangen:', req.body);
  const orders = JSON.parse(fs.readFileSync(ordersPath));

  // Auftragstyp und Tagesdatum bestimmen
  let typePrefix = 'F';
  if (req.body.orderType) {
    const t = String(req.body.orderType).toLowerCase();
    if (t.startsWith('s')) typePrefix = 'S';
    if (t.startsWith('f')) typePrefix = 'F';
  }
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6); // JJMMTT

  // Laufende Nummer für diesen Tag und Typ bestimmen
  const todaysOrders = orders.filter(o => {
    if (!o.id) return false;
    const parts = o.id.split('-');
    return parts[0] === typePrefix && parts[1] === dateStr;
  });
  const laufendeNummer = todaysOrders.length + 1;
  const newOrderId = `${typePrefix}-${dateStr}-${laufendeNummer}`;

  // Pflichtfelder und Standardwerte setzen
  const newOrder = {
    ...req.body,
    id: newOrderId,
    status: req.body.status || 'pending',
    createdAt: req.body.createdAt ? new Date(req.body.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documents: req.body.documents || [],
    estimatedHours: req.body.estimatedHours || 0,
    actualHours: req.body.actualHours || 0,
    assignedTo: req.body.assignedTo || null,
    notes: req.body.notes || '',
    subTasks: req.body.subTasks || [],
    priority: req.body.priority || 'medium',
    deadline: req.body.deadline ? new Date(req.body.deadline).toISOString() : new Date().toISOString(),
    costCenter: req.body.costCenter || '',
    clientId: req.body.clientId || '',
    clientName: req.body.clientName || '',
    canEdit: req.body.canEdit || false
  };
  orders.push(newOrder);
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
  console.log('orders.json nach POST:', orders);
  broadcast('ordersUpdated', orders);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  let orders = JSON.parse(fs.readFileSync(ordersPath));
  const allowedStatus = ['pending', 'accepted', 'in_progress', 'revision', 'rework', 'completed', 'archived', 'waiting_confirmation'];
  console.log('PUT /api/orders/:id body:', req.body);
  orders = orders.map(o => {
    if (o.id === req.params.id) {
      const newOrder = { ...o, ...req.body };
      // Status validieren (Debug-Ausgabe)
      if (!allowedStatus.includes(newOrder.status)) {
        console.warn('Ungültiger Status für Auftrag:', newOrder.id, newOrder.status, '| Typ:', typeof newOrder.status, '| Erlaubt:', allowedStatus);
        newOrder.status = o.status;
      } else {
        console.log('Status-Update OK:', newOrder.id, newOrder.status);
      }
      // Datumsfelder als ISO-String speichern
      if (newOrder.deadline) newOrder.deadline = new Date(newOrder.deadline).toISOString();
      if (newOrder.createdAt) newOrder.createdAt = new Date(newOrder.createdAt).toISOString();
      if (newOrder.updatedAt) newOrder.updatedAt = new Date(newOrder.updatedAt).toISOString();
      return newOrder;
    }
    return o;
  });
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
  broadcast('ordersUpdated', orders);
  res.json(orders.find(o => o.id === req.params.id));
});

// Auftrag löschen (Admin)
app.delete('/api/orders/:id', (req, res) => {
  let orders = JSON.parse(fs.readFileSync(ordersPath));
  const orderId = req.params.id;
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Auftrag nicht gefunden' });
  orders = orders.filter(o => o.id !== orderId);
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
  broadcast('ordersUpdated', orders);
  res.json({ success: true });
});

// --- FILE UPLOADS ---
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

app.post('/api/upload', upload.single('file'), (req, res) => {
  console.log('Upload-Request:', req.file);
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei empfangen!' });
  }
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

app.use('/uploads', express.static(uploadsDir));

// --- TEST ENDPOINT ---
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- ACCOUNT APPROVE (Admin) ---
app.patch('/api/users/:id/approve', (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersPath));
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User nicht gefunden' });
  users[idx].isApproved = true;
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  broadcast('usersUpdated', users);
  res.json(users[idx]);
});

// --- USER DELETE (Admin) ---
app.delete('/api/users/:id', (req, res) => {
  let users = JSON.parse(fs.readFileSync(usersPath));
  const userId = req.params.id;
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });
  users = users.filter(u => u.id !== userId);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  broadcast('usersUpdated', users);
  res.json({ success: true });
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

